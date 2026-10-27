import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = path.join(REPO, "skills/dossier/scripts/dossier.mjs");
const FIXTURE = path.join(REPO, "scripts/fixtures/dossier-report.json");
const HAS_SH = !spawnSync("sh", ["-c", "true"]).error;

function makeProject(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "dossier-test-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const report = fs.readFileSync(FIXTURE, "utf8").replaceAll("ROOT", root.split(path.sep).join("/"));
  fs.mkdirSync(path.join(root, "playwright-report"));
  fs.writeFileSync(path.join(root, "playwright-report/report.json"), report);
  return root;
}

function run(root, args = [], input) {
  return spawnSync(process.execPath, [DOSSIER, ...args], { cwd: root, encoding: "utf8", input });
}

function dossiers(root) {
  const dir = path.join(root, "playwright-report/dossier");
  return Object.fromEntries(fs.readdirSync(dir).map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]));
}

const find = (files, heading) => Object.values(files).find((text) => text.startsWith(`# ${heading}\n`));
const reproduceOf = (text) => text.match(/```sh\n(.*)\n```/)[1];

test("writes one dossier per unexpected failure plus one for the run error, and skips flaky tests", (t) => {
  const root = makeProject(t);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  const files = dossiers(root);
  assert.equal(Object.keys(files).length, 6);
  assert.equal(result.stdout.trim().split("\n").length, 6);
  assert.ok(!Object.values(files).some((text) => text.includes("settles on retry")));
  assert.match(find(files, "The run failed before or outside any test"), /Cannot find module/);
});

test("every failure carries its message, from errors[] or error, without ANSI codes", (t) => {
  const root = makeProject(t);
  run(root);
  const files = dossiers(root);
  assert.match(find(files, "runs `touch pwned2` in backticks"), /Error: boom/);
  assert.match(find(files, "a.b (twice)+?"), /Test timeout of 2000ms exceeded/);
  const soft = find(files, `it's "quoted"`);
  assert.match(soft, /first soft assertion/);
  assert.match(soft, /second soft assertion/);
  const ansi = find(files, "costs $HOME and $(touch pwned)");
  assert.match(ansi, /Expected: 2\nReceived: 1/);
  assert.ok(!Object.values(files).some((text) => text.includes("\x1b[")));
  assert.match(find(files, "outer $X › inner"), /The report holds no message for this failure/);
});

test("reproduce commands survive the shell and select only their test", { skip: !HAS_SH && "no sh on PATH" }, (t) => {
  const root = makeProject(t);
  run(root);
  const files = dossiers(root);
  const cases = [
    ["costs $HOME and $(touch pwned)", "hostile.spec.mjs:2:1", "it's mine", "costs $HOME and $(touch pwned)"],
    ["runs `touch pwned2` in backticks", "hostile.spec.mjs:6:1", "unit", "runs `touch pwned2` in backticks"],
    [`it's "quoted"`, "hostile.spec.mjs:7:1", "unit", `it's "quoted"`],
    ["a.b (twice)+?", "hostile.spec.mjs:10:1", "unit", "a.b (twice)+?"],
    ["outer $X › inner", "hostile.spec.mjs:12:35", "unit", "inner"],
  ];
  for (const [heading, location, project, title] of cases) {
    const command = reproduceOf(find(files, heading));
    const words = spawnSync("sh", ["-c", `set -- ${command}; printf '%s\\0' "$@"`], { cwd: root, encoding: "utf8" });
    assert.equal(words.status, 0, `${command}\n${words.stderr}`);
    const [npx, playwright, sub, file, projectArg, g, grep, ...rest] = words.stdout.split("\0").slice(0, -1);
    assert.deepEqual([npx, playwright, sub, rest], ["npx", "playwright", "test", []], command);
    assert.equal(file, `tests/${location}`, command);
    assert.equal(projectArg, `--project=${project}`, command);
    assert.equal(g, "-g", command);
    assert.ok(new RegExp(grep).test(`${heading} ${title}`), command);
    assert.ok(!new RegExp(grep).test(`${title.slice(0, -1)}X`), `${command} matches a different title`);
  }
  assert.ok(!fs.existsSync(path.join(root, "pwned")), "a title ran a command substitution");
  assert.ok(!fs.existsSync(path.join(root, "pwned2")), "a title ran a backtick command");
});

test("a rerun replaces old dossiers and leaves other files alone", (t) => {
  const root = makeProject(t);
  const dir = path.join(root, "playwright-report/dossier");
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, "99-stale-failure.md"), "old");
  fs.writeFileSync(path.join(dir, "notes.md"), "keep");
  run(root);
  const files = dossiers(root);
  assert.ok(!("99-stale-failure.md" in files));
  assert.equal(files["notes.md"], "keep");
});

test("hook mode adds the dossier list as context after a fresh failed run", (t) => {
  const root = makeProject(t);
  const payload = { hook_event_name: "PostToolUseFailure", tool_name: "Bash", cwd: root, duration_ms: 5000, tool_input: { command: "npx playwright test" }, error: "Exit code 1" };
  const result = run(path.dirname(root), ["--hook"], JSON.stringify(payload));
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(output.hookEventName, "PostToolUseFailure");
  assert.match(output.additionalContext, /6 failure dossiers/);
  assert.match(output.additionalContext, /playwright-report\/dossier\/\d\d-/);
  assert.equal(Object.keys(dossiers(root)).length, 6);
});

test("hook mode stays silent when the report predates the failed command", (t) => {
  const root = makeProject(t);
  const old = new Date(Date.now() - 3_600_000);
  fs.utimesSync(path.join(root, "playwright-report/report.json"), old, old);
  const payload = { hook_event_name: "PostToolUseFailure", tool_name: "Bash", cwd: root, duration_ms: 5000, tool_input: { command: "npm run lint" }, error: "Exit code 1" };
  const result = run(root, ["--hook"], JSON.stringify(payload));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.ok(!fs.existsSync(path.join(root, "playwright-report/dossier")));
});
