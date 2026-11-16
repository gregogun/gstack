import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), "../skills/guard/scripts/guard.mjs");

function runHook(command, tool_name = "Bash") {
  const payload = {
    session_id: "abc123",
    transcript_path: "/tmp/transcript.jsonl",
    cwd: "/repo",
    permission_mode: "default",
    hook_event_name: "PreToolUse",
    tool_name,
    tool_input: { command, description: "test" },
    tool_use_id: "toolu_01",
  };
  const result = spawnSync(process.execPath, [GUARD, "claude-code"], { input: JSON.stringify(payload), encoding: "utf8", env: CLEAN_ENV });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout).hookSpecificOutput : null;
}

const CLEAN_ENV = { ...process.env, AGENT_GUARD_ALLOW: "", CLAUDE_PROJECT_DIR: "" };

const DENIED = [
  "git commit --no-verify -m x",
  "git commit -n -m x",
  "git commit -anm x",
  "git commit -a -n",
  "git commit --no-veri -m x",
  "git -C ../repo commit --no-verify -m x",
  "git -C ../repo commit -n -m x",
  "git -c user.name=me -C ../repo commit -n -m x",
  "cd repo && git add . && git commit -n -m x",
  "npm test || git commit -nm x",
  "git status\ngit commit -n -m x",
  'git commit -m "a; b" --no-verify',
  "/usr/bin/git commit -n -m x",
  "git.exe commit -n -m x",
  "HUSKY=0 git commit -m x",
  "LEFTHOOK=0 git commit -m x",
  "LEFTHOOK=false git commit -m x",
  "LEFTHOOK_EXCLUDE=lint git commit -m x",
  "HUSKY=0 npm run release",
  "env HUSKY=0 git commit -m x",
  "export LEFTHOOK=0; git commit -m x",
  "git -c core.hooksPath=/dev/null commit -m x",
  "git push --no-verify",
  "git merge --no-verify feature",
  "git pull --no-verify",
  'bash -c "git commit -n -m x"',
  'echo "$(git commit -n -m x)"',
  "(cd repo; git commit --no-verify -m x)",
];

const ALLOWED = [
  "git log -n 5",
  "git log -n5 --oneline",
  "grep -n foo file.txt",
  "grep -rn 'git commit -n' docs",
  "git commit -m x",
  "git commit -am x",
  "git commit -mn",
  "git commit -m -n",
  'git commit -m "never use --no-verify"',
  "git commit -m x -- -n",
  "git push -n origin main",
  "git merge -n feature",
  "git log --grep=no-verify",
  "HUSKY=1 git commit -m x",
  "LEFTHOOK=1 git commit -m x",
  "echo HUSKY=0",
  "sed -n 1,5p README.md",
];

test("every hook bypass is denied with a PreToolUse deny decision", () => {
  for (const command of DENIED) {
    const output = runHook(command);
    assert.equal(output?.permissionDecision, "deny", command);
    assert.equal(output.hookEventName, "PreToolUse", command);
    assert.match(output.permissionDecisionReason, /skip|turns off|another directory/, command);
  }
});

test("look-alike commands are allowed", () => {
  for (const command of ALLOWED) assert.equal(runHook(command), null, command);
});

test("PowerShell commands are checked with PowerShell quoting", () => {
  for (const command of ["$env:HUSKY=0; git commit -m x", "$env:LEFTHOOK = 'false'; git commit -m x", "git commit -n -m x", 'git commit -m "a`"b" --no-verify']) {
    assert.equal(runHook(command, "PowerShell")?.permissionDecision, "deny", command);
  }
  for (const command of ["git log -n 5", "Select-String -Pattern x -Path f", "$env:HUSKY = '1'; git commit -m x"]) {
    assert.equal(runHook(command, "PowerShell"), null, command);
  }
});

test("other tools and unreadable input pass through", () => {
  assert.equal(runHook("git commit -n", "Read"), null);
  for (const input of ["not json", "null", "42"]) {
    const result = spawnSync(process.execPath, [GUARD, "claude-code"], { input, encoding: "utf8", env: CLEAN_ENV });
    assert.equal(result.status, 0, input);
    assert.equal(result.stdout, "", input);
  }
});

test("an unknown harness or rule name exits 1 with usage", () => {
  for (const argv of [["nope"], ["claude-code", "--rules", "hook-bypas"], ["claude-code", "--rules"]]) {
    const result = spawnSync(process.execPath, [GUARD, ...argv], { input: "{}", encoding: "utf8", env: CLEAN_ENV });
    assert.equal(result.status, 1, argv.join(" "));
    assert.match(result.stderr, /usage/, argv.join(" "));
  }
});

function sh(cwd, command) {
  const result = spawnSync("sh", ["-c", command], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
}

function repos() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "guard-")));
  sh(root, "git init -q --bare -b main remote.git && git clone -q -o upstream remote.git primary 2>/dev/null");
  const primary = path.join(root, "primary");
  sh(primary, "git config user.email t@t && git config user.name t && echo a > f && git add f && git commit -qm init && git push -q upstream main && git remote set-head upstream --auto >/dev/null");
  sh(primary, "git worktree add -q --no-track -b feat/x ../worktree upstream/main && git branch -q merged");
  sh(root, "git init -q -b main local && cd local && git config user.email t@t && git config user.name t && echo a > f && git add f && git commit -qm init");
  sh(root, "git clone -q remote.git feature 2>/dev/null && cd feature && git checkout -q -b feat/y");
  sh(primary, "git worktree add -q --no-track -b feat/n .claude/worktrees/n upstream/main");
  return { root, primary, worktree: path.join(root, "worktree"), nested: path.join(primary, ".claude/worktrees/n"), local: path.join(root, "local"), feature: path.join(root, "feature") };
}

function hook(event, env = {}, argv = []) {
  const result = spawnSync(process.execPath, [GUARD, "claude-code", ...argv], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", ...event }),
    encoding: "utf8",
    env: { ...CLEAN_ENV, ...env },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout).hookSpecificOutput.permissionDecisionReason : null;
}

const edit = (file, env) => hook({ tool_name: "Write", cwd: path.dirname(file), tool_input: { file_path: file, content: "x" } }, env);
const run = (cwd, command, env, argv) => hook({ tool_name: "Bash", cwd, tool_input: { command } }, env, argv);

test("edits in the primary checkout on the default branch are denied", () => {
  const r = repos();
  assert.match(edit(path.join(r.primary, "f")) ?? "", /^guard\(primary-checkout\): .*git worktree add --no-track -b <type>\/<slug> .*primary-<slug> upstream\/main/);
  assert.match(edit(path.join(r.primary, "new/dir/g")) ?? "", /^guard\(primary-checkout\)/, "a new file in a new folder");
  assert.match(edit(path.join(r.local, "f")) ?? "", /primary checkout on main.* main\b/, "a repo with no remote falls back to local main");
  assert.match(hook({ tool_name: "Edit", cwd: r.primary, tool_input: { file_path: "f" } }) ?? "", /^guard\(primary-checkout\)/, "a relative path resolves against cwd");
});

test("edits in a worktree, on another branch, outside git, or allowed by the user pass", () => {
  const r = repos();
  assert.equal(edit(path.join(r.worktree, "f")), null);
  assert.equal(edit(path.join(r.nested, "f")), null, "a worktree nested inside the primary");
  assert.equal(edit(path.join(r.nested, "new/dir/g")), null, "a new folder in a nested worktree");
  assert.equal(edit(path.join(r.feature, "f")), null);
  assert.equal(edit(path.join(r.root, "loose.txt")), null);
  assert.equal(edit(path.join(r.primary, "f"), { AGENT_GUARD_ALLOW: "primary-checkout" }), null);
  assert.equal(edit(path.join(r.local, "f"), { CLAUDE_PROJECT_DIR: r.primary }), null, "a repo outside the project");
  assert.match(edit(path.join(r.primary, "f"), { CLAUDE_PROJECT_DIR: r.worktree }) ?? "", /^guard\(primary-checkout\)/, "the project's primary, edited from its worktree");
});

test("commands that discard work are denied only in the primary checkout", () => {
  const r = repos();
  for (const command of ["git reset --hard", "git clean -fd", "git checkout -- f", "git checkout .", "git restore f", "git stash drop", "git switch -f feat/x", 'bash -c "git reset --hard"']) {
    assert.match(run(r.primary, command) ?? "", /^guard\(destructive-git\): .*primary checkout/, command);
    assert.equal(run(r.worktree, command), null, `${command} in a worktree`);
  }
  assert.match(run(r.primary, "git stash -q drop") ?? "", /primary checkout/, "stash drop after a flag");
  for (const command of ["git status", "git reset --soft HEAD", "git restore --staged f", "git restore -qS f", "git checkout -b feat/z", "git clean -n", "git clean -n -f", "git clean --dry-run -fd"]) {
    assert.equal(run(r.primary, command), null, command);
  }
  assert.match(run(r.worktree, `git -C ${r.primary} reset --hard`) ?? "", /primary checkout/, "git -C");
  assert.match(run(r.worktree, `git -C ${r.root} -C primary reset --hard`) ?? "", /primary checkout/, "chained -C");
  assert.match(run(r.worktree, `cd ${r.primary} && git reset --hard`) ?? "", /primary checkout/, "cd first");
});

test("force pushes, pushes to the default branch, and forced branch deletes are denied anywhere", () => {
  const r = repos();
  for (const command of [
    "git push -f",
    "git push -fu upstream feat/x",
    "git push --force upstream feat/x",
    "git push upstream +feat/x",
    "git push upstream HEAD:main",
    "git push upstream main",
    "git push upstream :main",
    "git push upstream refs/heads/main",
    "git push upstream 'refs/heads/*:refs/heads/*'",
    "git push --all upstream",
    "git push --branches upstream",
    "git push --mirror upstream",
    "git branch -D merged",
    "git branch --delete --force merged",
  ]) {
    assert.match(run(r.worktree, command) ?? "", /^guard\(destructive-git\)/, command);
  }
  for (const command of ["git push", "git push upstream HEAD", "git push upstream @", "git push -o ci.skip upstream"]) {
    assert.match(run(r.primary, command) ?? "", /pushes to main/, `${command} while on main`);
  }
  for (const command of ["git push --tags", "git push upstream --tags", "git push --dry-run upstream main"]) {
    assert.equal(run(r.primary, command), null, `${command} while on main`);
  }
  for (const command of ["git push -u upstream HEAD", "git push --force-with-lease upstream feat/x", "git push upstream feat/x", "git push upstream main:feat/x", "git push upstream feat/x -ofoo", "git branch -d merged"]) {
    assert.equal(run(r.worktree, command), null, command);
  }
});

test("--rules and AGENT_GUARD_ALLOW limit the rules that run", () => {
  const r = repos();
  const only = ["--rules", "hook-bypass"];
  assert.equal(run(r.primary, "git reset --hard", {}, only), null, "a rule left out of --rules");
  assert.match(run(r.primary, "git commit -n -m x", {}, only) ?? "", /^guard\(hook-bypass\)/, "a rule named in --rules");
  const lifted = { AGENT_GUARD_ALLOW: "destructive-git, hook-bypass" };
  assert.equal(run(r.primary, "git reset --hard", lifted), null);
  assert.equal(run(r.primary, "git commit -n -m x", lifted), null);
  assert.match(edit(path.join(r.primary, "f"), lifted) ?? "", /^guard\(primary-checkout\)/, "a rule left out of AGENT_GUARD_ALLOW");
});
