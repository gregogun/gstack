import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AUDIT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../skills/housekeeping/scripts/audit.sh");
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};

const git = (cwd, ...args) => execFileSync("git", args, { cwd, env: ENV, encoding: "utf8" }).trim();

function commit(cwd, file, text) {
  fs.writeFileSync(path.join(cwd, file), text);
  git(cwd, "add", file);
  git(cwd, "commit", "-q", "-m", file);
}

function tables(stdout) {
  const out = {};
  for (const block of stdout.trim().split("\n\n")) {
    const [title, header, ...rows] = block.split("\n").filter((l) => !l.startsWith("# base"));
    const cols = header.split("\t");
    out[title.slice(2)] = rows.map((r) => Object.fromEntries(r.split("\t").map((v, i) => [cols[i], v])));
  }
  return out;
}

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "housekeeping-test-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const origin = path.join(root, "origin.git");
  const repo = path.join(root, "repo");
  git(root, "init", "-q", "--bare", "-b", "main", origin);
  git(root, "clone", "-q", origin, repo);
  git(repo, "checkout", "-q", "-b", "main");
  fs.writeFileSync(path.join(repo, ".gitignore"), ".env.local\nnode_modules/\n");
  git(repo, "add", ".gitignore");
  commit(repo, "base.txt", "base");
  git(repo, "push", "-q", "-u", "origin", "main");

  git(repo, "checkout", "-q", "-b", "shipped");
  commit(repo, "shipped.txt", "shipped");
  const shippedTip = git(repo, "rev-parse", "HEAD");
  git(repo, "checkout", "-q", "main");
  commit(repo, "shipped-squashed.txt", "shipped");
  git(repo, "push", "-q", "origin", "main");

  git(repo, "branch", "empty", "main");
  git(repo, "branch", "reused", "main~1");
  git(repo, "checkout", "-q", "-b", "unmerged");
  commit(repo, "unmerged.txt", "unmerged");
  git(repo, "checkout", "-q", "main");

  const secrets = path.join(root, "wt-secrets");
  git(repo, "worktree", "add", "-q", "-b", "wt-secrets", secrets, "main");
  fs.writeFileSync(path.join(secrets, ".env.local"), "TOKEN=1\n");
  fs.mkdirSync(path.join(secrets, "node_modules"));
  fs.writeFileSync(path.join(secrets, "node_modules/x.js"), "x");

  const rebuildable = path.join(root, "wt-rebuildable");
  git(repo, "worktree", "add", "-q", "-b", "wt-rebuildable", rebuildable, "main");
  fs.mkdirSync(path.join(rebuildable, "node_modules"));
  fs.writeFileSync(path.join(rebuildable, "node_modules/x.js"), "x");

  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  const pr = (n, head) => [n, "merged", head, shippedTip, "false", "false", Math.floor(Date.now() / 1000), "ship it", "main"].join("\t");
  fs.writeFileSync(path.join(bin, "gh"), `#!/bin/sh\nprintf '%s\\n' '${pr(2, "reused")}' '${pr(1, "shipped")}'\n`, { mode: 0o755 });
  return { repo, secrets, rebuildable, bin };
}

function audit(t) {
  const fx = fixture(t);
  const run = spawnSync("bash", [AUDIT, "--branches", "--worktrees", "-b", "origin/main", fx.repo], {
    env: { ...ENV, PATH: `${fx.bin}:${process.env.PATH}` },
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  return { ...fx, ...tables(run.stdout) };
}

test("audit buckets only branches whose PR merged as safe", (t) => {
  const { branches } = audit(t);
  const bucket = (name) => branches.find((r) => r.BRANCH === name && r.WHERE === "local")?.BUCKET;
  assert.equal(bucket("shipped"), "safe", "branch merged via PR is deletable");
  assert.equal(bucket("empty"), "keep", "new branch at the base tip is kept");
  assert.equal(bucket("reused"), "keep", "name reused at a stale base tip is kept");
  assert.equal(bucket("unmerged"), "keep", "branch with its own commits is kept");
});

test("audit holds worktrees that contain ignored files", (t) => {
  const { worktrees, secrets, rebuildable } = audit(t);
  const row = (dir) => worktrees.find((r) => r.WORKTREE === dir);
  assert.equal(row(secrets).BUCKET, "hold-ignored", "ignored .env.local blocks removal");
  assert.match(row(secrets).IGNORED, /\.env\.local/);
  assert.doesNotMatch(row(secrets).IGNORED, /node_modules/);
  assert.equal(row(rebuildable).BUCKET, "safe", "ignored node_modules alone does not block removal");
});
