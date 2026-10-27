import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), "../skills/loop-audit/scripts/bypass-guard.mjs");

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
  const result = spawnSync(process.execPath, [GUARD], { input: JSON.stringify(payload), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout).hookSpecificOutput : null;
}

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
  const result = spawnSync(process.execPath, [GUARD], { input: "not json", encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});
