import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY = path.join(REPO, "skills/upstream-review/scripts/inventory.mjs");

function write(root, files) {
  for (const [file, text] of Object.entries(files)) {
    const full = path.join(root, file);
    if (text === null) {
      fs.rmSync(full, { recursive: true, force: true });
      continue;
    }
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
  }
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upstream-review-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const up = path.join(root, "plugins");
  const git = (...args) => execFileSync("git", ["-C", up, ...args], { encoding: "utf8" }).trim();
  fs.mkdirSync(up);
  git("init", "-q");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  const commit = (files, message) => {
    write(up, files);
    git("add", "-A");
    git("commit", "-q", "-m", message);
    return git("rev-parse", "HEAD");
  };
  const base = commit(
    {
      "pstack/README.md": "a\n",
      "pstack/skills/poteto-mode/SKILL.md": "a\n",
      "pstack/skills/why/SKILL.md": "a\n",
      "pstack/skills/why/references/x.md": "a\nb\n",
      "pstack/skills/tdd/SKILL.md": "a\n",
      "pstack/skills/gone/SKILL.md": "a\n",
      "cursor-team-kit/skills/deslop/SKILL.md": "a\n",
      "cursor-team-kit/skills/untracked/SKILL.md": "a\n",
    },
    "base",
  );
  commit(
    {
      "pstack/README.md": "b\n",
      "pstack/skills/poteto-mode/SKILL.md": "b\nc\n",
      "pstack/skills/why/references/x.md": null,
      "pstack/skills/gone": null,
      "pstack/skills/fresh/SKILL.md": "a\nb\nc\n",
      "cursor-team-kit/skills/deslop/SKILL.md": "b\n",
      "cursor-team-kit/skills/untracked/SKILL.md": "b\n",
      "unrelated/file.md": "x\n",
    },
    "change skills",
  );
  const gstack = path.join(root, "gstack-skills");
  for (const name of ["go-mode", "why", "tdd", "deslop", "gone", "chat-mode"]) write(gstack, { [`${name}/SKILL.md`]: "x\n" });
  write(gstack, { "notaskill/readme.md": "x\n" });
  return { up, gstack, base, commit };
}

const run = (args) => spawnSync(process.execPath, [INVENTORY, ...args], { encoding: "utf8" });

test("reports each changed, added and removed skill with its gstack counterpart", (t) => {
  const { up, gstack, base } = fixture(t);
  const r = run(["--upstream", up, "--gstack", gstack, "--since", base]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);

  assert.equal(out.upstream.since, base);
  assert.deepEqual(out.commits.map((c) => c.subject), ["change skills"]);
  assert.deepEqual(
    out.skills.map(({ upstream, gstack, status, files, insertions, deletions }) => [upstream, gstack, status, files, insertions, deletions]),
    [
      ["pstack/skills/fresh", null, "added", 1, 3, 0],
      ["pstack/skills/gone", "gone", "removed", 1, 0, 1],
      ["pstack/skills/poteto-mode", "go-mode", "changed", 1, 2, 1],
      ["pstack/skills/why", "why", "changed", 1, 0, 2],
      ["cursor-team-kit/skills/deslop", "deslop", "changed", 1, 1, 1],
    ],
  );
  assert.equal(out.unchanged, 1, "tdd is unchanged; untracked team-kit skills are ignored");
  assert.deepEqual(out.other, [{ group: "pstack/README.md", files: 1, insertions: 1, deletions: 1 }]);
  assert.deepEqual(out.gstackOnly, ["chat-mode"], "a skill removed upstream is reported under skills, not gstackOnly");
});

test("reports no commits when only a team-kit skill gstack never took changed", (t) => {
  const { up, gstack, commit } = fixture(t);
  const since = execFileSync("git", ["-C", up, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  commit({ "cursor-team-kit/skills/untracked/SKILL.md": "c\n" }, "untracked only");
  const r = run(["--upstream", up, "--gstack", gstack, "--since", since]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.commits, []);
  assert.deepEqual(out.skills, []);
});

test("exits 2 when the since commit is missing from the clone", (t) => {
  const { up, gstack } = fixture(t);
  const r = run(["--upstream", up, "--gstack", gstack, "--since", "0".repeat(40)]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /is not in/);
});

test("exits 2 without the required arguments", () => {
  const r = run(["--gstack", "x"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--upstream and --gstack are required/);
});
