import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEDULE = path.join(HERE, "..", "skills/report/scripts/schedule.mjs");
const FAKE_CLAUDE = path.join(HERE, "fixtures", "fake-claude.mjs");
const WINDOWS = process.platform === "win32";
const SCHEDULER = WINDOWS || process.platform === "darwin";

function tempDir(t, prefix) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** A folder holding `claude`, as npm installs it: a .cmd shim on Windows, an executable elsewhere. */
function fakeClaudeBin(t) {
  const bin = tempDir(t, "schedule-bin-");
  if (WINDOWS) fs.writeFileSync(path.join(bin, "claude.cmd"), `@"${process.execPath}" "${FAKE_CLAUDE}" %*\r\n`);
  else fs.writeFileSync(path.join(bin, "claude"), `#!/bin/sh\nexec "${process.execPath}" "${FAKE_CLAUDE}" "$@"\n`, { mode: 0o755 });
  return { bin, claude: path.join(bin, WINDOWS ? "claude.cmd" : "claude") };
}

/** Writes a task file the way `add` would, then runs it. FAKE_CLAUDE_MODE and the user's own variables reach the runner as the OS would pass them. */
async function runTask(t, { mode = "report", runnerEnv = {}, ...overrides } = {}) {
  const home = tempDir(t, "schedule-home-");
  const cwd = tempDir(t, "schedule-cwd-");
  const task = {
    name: "nightly",
    at: "03:00",
    cwd,
    prompt: "Upgrade the dependencies.",
    args: ["--permission-mode", "acceptEdits"],
    timeoutMinutes: 1,
    claude: fakeClaudeBin(t).claude,
    node: process.execPath,
    home,
    path: process.env.PATH,
    env: { GSTACK_REPORT_ADAPTER: "stdout", TELEGRAM_BOT_TOKEN: "123:from-task" },
    ...overrides,
  };
  const file = path.join(home, "tasks", "nightly.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(task));
  const result = await schedule(["run", file], { FAKE_CLAUDE_MODE: mode, TELEGRAM_BOT_TOKEN: "123:from-user-env", GSTACK_SEND_RETRY_MS: "10", ...runnerEnv });
  const log = fs.readFileSync(path.join(home, "logs", "nightly.log"), "utf8");
  return { task, result, log };
}

function schedule(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCHEDULE, ...args], { env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function onlyRun(home) {
  const runs = fs.readdirSync(path.join(home, "runs"));
  assert.equal(runs.length, 1);
  return path.join(home, "runs", runs[0]);
}

async function closedPort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

test("run gives claude the prompt, args and folder, then sends the agent's report", async (t) => {
  const { task, result, log } = await runTask(t);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "✅ DONE · Nightly\n\nCompleted\n• did the thing\n");
  assert.match(log, /started .*-nightly\n.* sent .*-nightly: exit 0/);
  const dir = onlyRun(task.home);
  const seen = JSON.parse(fs.readFileSync(path.join(dir, "fake.json"), "utf8"));
  assert.deepEqual(seen.args, ["-p", "--output-format", "json", "--permission-mode", "acceptEdits"]);
  assert.equal(fs.realpathSync(seen.cwd), task.cwd);
  assert.equal(seen.home, task.home);
  assert.match(seen.prompt, /^Upgrade the dependencies\.\n\nThis run is unattended/);
  assert.deepEqual(seen.telegram, [], "the agent never sees the bot token");
  assert.ok(seen.prompt.includes(path.join(dir, "report.json")));
  assert.equal(fs.readFileSync(path.join(dir, "claude.json"), "utf8"), '{"result":"ok"}');
});

test("run sends a failed report with exit 1 when the agent writes none", async (t) => {
  const { task, result } = await runTask(t, { mode: "none" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^❌ FAILED · nightly: no usable report\n\nclaude exited with code 3 and wrote no report\./);
  assert.ok(result.stdout.includes(onlyRun(task.home)), "the message names the run folder");
});

test("run keeps an invalid report aside and sends a failed one that names the problem", async (t) => {
  const { task, result } = await runTask(t, { mode: "invalid" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^❌ FAILED · nightly: no usable report\n\nThe agent wrote a report the runner could not read\. +- "status" must be one of/);
  const invalid = JSON.parse(fs.readFileSync(path.join(onlyRun(task.home), "report.invalid.json"), "utf8"));
  assert.equal(invalid.status, "finished");
});

test("run names the JSON error when the agent's report is not JSON", async (t) => {
  const { result } = await runTask(t, { mode: "garbage" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /The agent wrote a report the runner could not read\. report: cannot read .*report\.json \(.*JSON.*\)\n/);
  assert.ok(!result.stdout.includes("usage:"));
});

test("run reports a working folder that no longer exists", async (t) => {
  const { result } = await runTask(t, { cwd: path.join(os.tmpdir(), "schedule-gone") });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /The folder .*schedule-gone no longer exists, so claude did not start\./);
});

test("run stops a run at its time limit, kills the whole process tree, and reports it", async (t) => {
  const { task, result } = await runTask(t, { mode: "hang", timeoutMinutes: 0.03 });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /The run hit its 0\.03-minute limit and was stopped\./);
  const grandchild = Number(fs.readFileSync(path.join(onlyRun(task.home), "grandchild.pid"), "utf8"));
  for (let i = 0; i < 20 && alive(grandchild); i++) await new Promise((r) => setTimeout(r, 100));
  assert.ok(!alive(grandchild), "the agent's child is gone, though it ran in a process group of its own");
});

test("run reports a claude that cannot start", async (t) => {
  const { result } = await runTask(t, { claude: path.join(os.tmpdir(), "no-such-claude") });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /claude could not start \(spawn .*ENOENT\)/);
});

test("run exits with the send's code when the report cannot be delivered, and logs why", async (t) => {
  const { result, log } = await runTask(t, { env: { GSTACK_REPORT_ADAPTER: "telegram", TELEGRAM_BOT_TOKEN: "123:from-task" } });
  assert.equal(result.status, 3);
  assert.match(log, /exit 3\n.*telegram: set TELEGRAM_CHAT_ID/);
});

test("run retries a send that never reached Telegram, then gives up with exit 4", async (t) => {
  const { result, log } = await runTask(t, {
    env: { GSTACK_REPORT_ADAPTER: "telegram", TELEGRAM_BOT_TOKEN: "123:secret-token", TELEGRAM_CHAT_ID: "42" },
    runnerEnv: { TELEGRAM_API_URL: `http://127.0.0.1:${await closedPort()}` },
  });
  assert.equal(result.status, 4);
  assert.equal(log.match(/exit 4\n.*telegram: request failed \(ECONNREFUSED\)/g).length, 5);
  assert.ok(!log.includes("secret-token"));
});

test("run keeps a good report when the adapter setting is wrong", async (t) => {
  const { task, result } = await runTask(t, { env: { GSTACK_REPORT_ADAPTER: "signal" } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /no adapter "signal"/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(onlyRun(task.home), "report.json"), "utf8")).title, "Nightly");
});

test("add rejects a bad name, time, folder or prompt with exit 2", async (t) => {
  const cwd = tempDir(t, "schedule-cwd-");
  const env = { GSTACK_HOME: tempDir(t, "schedule-home-") };
  const cases = [
    [["add", "Bad Name", "--at", "03:00", "--cwd", cwd, "--prompt", "x"], /a task name is lowercase letters/],
    [["add", "nightly", "--at", "3am", "--cwd", cwd, "--prompt", "x"], /--at must be a 24-hour time/],
    [["add", "nightly", "--at", "03:00", "--cwd", path.join(cwd, "missing"), "--prompt", "x"], /--cwd must be an existing folder/],
    [["add", "nightly", "--at", "03:00", "--cwd", cwd], /--prompt is required/],
    [["add", "nightly", "--at", "03:00", "--cwd", cwd, "--prompt", "x", "--timeout", "0"], /--timeout must be a whole number/],
    [["add", "nightly", "--at", "03:00", "--cwd", cwd, "--prompt", "x", "--timeout", "40000"], /at most 10080/],
  ];
  for (const [args, message] of cases) {
    const result = await schedule(args, env);
    assert.equal(result.status, 2, `${args.join(" ")}: ${result.stderr}`);
    assert.match(result.stderr, message);
  }
  assert.ok(!fs.existsSync(path.join(env.GSTACK_HOME, "tasks")), "nothing was written");
});

test("add points at cron on a platform with no supported scheduler", { skip: SCHEDULER && "this platform has a scheduler" }, async (t) => {
  const { bin } = fakeClaudeBin(t);
  const env = { GSTACK_HOME: tempDir(t, "schedule-home-"), PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const result = await schedule(["add", "nightly", "--at", "03:00", "--cwd", tempDir(t, "schedule-cwd-"), "--prompt", "x"], env);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /no scheduler for linux\. The task is saved, so add this line with `crontab -e`:\n0 3 \* \* \* ".*" ".*schedule\.mjs" run nightly\n/);
  assert.ok(fs.existsSync(path.join(env.GSTACK_HOME, "bin", "schedule.mjs")));
  assert.ok(fs.existsSync(path.join(env.GSTACK_HOME, "tasks", "nightly.json")));
});

test("add registers a daily OS job, list shows it, and remove deletes it", { skip: !(SCHEDULER && process.env.GSTACK_TEST_SCHEDULER === "1") && "set GSTACK_TEST_SCHEDULER=1 on Windows or macOS" }, async (t) => {
  const { bin } = fakeClaudeBin(t);
  const home = tempDir(t, "schedule-home-");
  const userHome = tempDir(t, "schedule-user-");
  const name = `gstack-test-${process.pid}`;
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"));
  const env = {
    ...inherited,
    GSTACK_HOME: home,
    HOME: WINDOWS ? process.env.HOME : userHome,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    TELEGRAM_BOT_TOKEN: "123:secret-token",
    TELEGRAM_CHAT_ID: "42",
  };
  const query = () =>
    WINDOWS
      ? spawnSync("schtasks", ["/Query", "/TN", `gstack\\${name}`, "/XML"], { encoding: "utf8" })
      : spawnSync("launchctl", ["print", `gui/${process.getuid()}/com.gstack.${name}`], { encoding: "utf8" });
  t.after(() => schedule(["remove", name], env));

  const args = ["add", name, "--at", "04:30", "--cwd", tempDir(t, "schedule-cwd-"), "--prompt", "x", "--", "--permission-mode", "acceptEdits"];
  const added = await schedule(args, env);
  assert.equal(added.status, 0, added.stderr);
  assert.equal((await schedule(args, env)).status, 0, "adding again replaces the job");
  const registered = query();
  assert.equal(registered.status, 0, registered.stderr);
  assert.ok(registered.stdout.includes(path.join(home, "bin", "schedule.mjs")), "the job runs the copy in the state folder");
  for (const script of ["schedule.mjs", "report.mjs", "state.mjs"]) assert.ok(fs.existsSync(path.join(home, "bin", script)));

  const task = JSON.parse(fs.readFileSync(path.join(home, "tasks", `${name}.json`), "utf8"));
  assert.deepEqual(task.args, ["--permission-mode", "acceptEdits"]);
  assert.equal(path.dirname(task.claude), bin);
  assert.deepEqual(task.env, { TELEGRAM_BOT_TOKEN: "123:secret-token", TELEGRAM_CHAT_ID: "42" });
  if (!WINDOWS) assert.equal(fs.statSync(path.join(home, "tasks", `${name}.json`)).mode & 0o777, 0o600);
  assert.match((await schedule(["list"], env)).stdout, new RegExp(`^${name}\\t04:30\\t`));

  const removed = await schedule(["remove", name], env);
  assert.equal(removed.status, 0, removed.stderr);
  assert.notEqual(query().status, 0, "the job is gone");
  assert.ok(!fs.existsSync(path.join(home, "tasks", `${name}.json`)));
});
