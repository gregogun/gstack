import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { denial, isReadOnly, nextState } from "../skills/chat-mode/scripts/mode-guard.mjs";

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), "../skills/chat-mode/scripts/mode-guard.mjs");
const CHAT = { mode: "chat", paused: false };

test("a mode command sets the mode", () => {
  assert.deepEqual(nextState({ mode: null }, "/gstack:chat-mode hi"), CHAT);
  assert.deepEqual(nextState(CHAT, "/lite-mode fix it"), { mode: "lite", paused: false });
  assert.deepEqual(nextState(CHAT, "/gstack:go-mode"), { mode: "go", paused: false });
});

test("another slash command lifts chat-mode for one turn only", () => {
  const paused = nextState(CHAT, "/gstack:how does the build work");
  assert.deepEqual(paused, { mode: "chat", paused: true });
  assert.deepEqual(nextState(paused, "thanks, and the tests?"), CHAT);
});

test("a path at the start of a prompt is not a slash command", () => {
  assert.deepEqual(nextState(CHAT, "/src/app.ts is slow"), CHAT);
});

test("chat-mode denies edits and subagents and allows reads", () => {
  for (const tool of ["Edit", "Write", "NotebookEdit", "Agent", "Skill", "mcp__paper__write_html"]) {
    assert.ok(denial(CHAT, tool, {}), `${tool} should be denied`);
  }
  for (const tool of ["Read", "Grep", "Glob", "WebSearch"]) assert.equal(denial(CHAT, tool, {}), null, `${tool} should be allowed`);
});

test("other modes and a paused turn deny nothing", () => {
  assert.equal(denial({ mode: "lite", paused: false }, "Write", {}), null);
  assert.equal(denial({ mode: null, paused: false }, "Write", {}), null);
  assert.equal(denial({ mode: "chat", paused: true }, "Write", {}), null);
});

test("read-only shell commands pass", () => {
  for (const cmd of [
    "ls -la skills",
    "cd /repo && git log --oneline -5",
    "git -C ../other diff --stat",
    "grep -rn 'a|b' skills | head -20",
    "sed -n '1,40p' README.md",
    "find . -name '*.md' 2>/dev/null | wc -l",
    "cat a.txt 2>&1 | sort | uniq",
    "gh pr view 13",
    'echo "$HOME"',
  ]) {
    assert.ok(isReadOnly(cmd), cmd);
  }
});

test("shell commands that can write or run code are denied", () => {
  for (const cmd of [
    "echo hi > out.txt",
    "cat a >> b",
    "sed -i 's/a/b/' f",
    "sed -n 'w out' f",
    "find . -name x -delete",
    "find . -exec rm {} \\;",
    "git branch -D old",
    "git diff --output=patch",
    "git commit -m x",
    "ls $(rm -rf x)",
    "ls `whoami`",
    'echo "$(touch x)"',
    "diff <(ls) <(ls b)",
    "sort -o out in",
    "gh pr merge 13",
    "npm test",
    "FOO=1 ls",
    "ls; rm -rf /",
    "echo 'unterminated",
  ]) {
    assert.ok(!isReadOnly(cmd), cmd);
  }
});

test("the hook denies a write after /chat-mode and allows it after /lite-mode", () => {
  const session = `test-${randomUUID()}`;
  const run = (event) => spawnSync(process.execPath, [GUARD], { input: JSON.stringify({ session_id: session, ...event }), encoding: "utf8" });
  const write = { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: "x" } };

  run({ hook_event_name: "UserPromptSubmit", prompt: "/gstack:chat-mode let's talk" });
  const denied = run(write);
  assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, "deny");

  run({ hook_event_name: "UserPromptSubmit", prompt: "/gstack:lite-mode do it" });
  const allowed = run(write);
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stdout, "", "no decision means the normal permission flow runs");
});
