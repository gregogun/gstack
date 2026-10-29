#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { newRunDir, stateDir } from "./state.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = ["schedule.mjs", "report.mjs", "state.mjs"];
const USAGE = [
  "usage: schedule.mjs add <name> --at <HH:MM> --cwd <dir> --prompt <text> [--timeout <minutes>] [-- <claude args>]",
  "       schedule.mjs remove <name>",
  "       schedule.mjs list",
  "       schedule.mjs run <name | task.json>",
].join("\n");
const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const REPORT_ENV = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "GSTACK_REPORT_ADAPTER"];
const DEFAULT_TIMEOUT_MINUTES = 120;
const MAX_TIMEOUT_MINUTES = 7 * 24 * 60;
const SEND_ATTEMPTS = 5;
const SEND_RETRY_MS = Number(process.env.GSTACK_SEND_RETRY_MS ?? 30_000);
// Each of these means no connection was made, so a retry cannot deliver the message twice. Common just after the machine wakes.
const NOT_CONNECTED = /request failed \((ENOTFOUND|EAI_AGAIN|ENETUNREACH|ENETDOWN|EHOSTUNREACH|ECONNREFUSED)\)/;
const SEND_ONLY_ENV = [...REPORT_ENV, "TELEGRAM_API_URL"];
const CMD_UNSAFE = /["%^&|<>!]/;
const LABEL = (name) => `com.gstack.${name}`;

/**
 * Everything a run needs, captured by `add`, because a scheduled job starts with a bare environment and an arbitrary working folder.
 *
 * @typedef {{
 *   name: string,
 *   at: string,
 *   cwd: string,
 *   prompt: string,
 *   args: string[],
 *   timeoutMinutes: number,
 *   claude: string,
 *   node: string,
 *   home: string,
 *   path: string,
 *   env: Record<string, string>,
 * }} Task
 * @typedef {{ code: number | null, timedOut: boolean, error?: string }} ClaudeExit
 */

class UsageError extends Error {}

const taskFile = (home, name) => path.join(home, "tasks", `${name}.json`);
const isCmdShim = (file) => /\.(cmd|bat)$/i.test(file);
const xml = (text) => String(text).replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

function exec(command, args, { allowFail = false } = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true });
  if (!allowFail && (result.error || result.status !== 0)) {
    throw new Error(`${command} ${args[0]} failed: ${(result.error?.message ?? result.stderr ?? result.stdout).trim()}`);
  }
  return result;
}

function onPath(command) {
  const exts = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const file = path.join(dir, command + ext);
      if (fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return file;
    }
  }
  return null;
}

/** Windows keys env vars case-insensitively, so a stale `Path` next to a new `PATH` gives the child either one. */
function baseEnv(task) {
  const env = { ...process.env };
  if (process.platform === "win32") for (const key of Object.keys(env)) if (key.toUpperCase() === "PATH") delete env[key];
  return { ...env, PATH: task.path, GSTACK_HOME: task.home };
}

/** The agent reads untrusted content, so it never sees the bot token. Only the send does. */
function agentEnv(task) {
  const env = baseEnv(task);
  for (const key of SEND_ONLY_ENV) delete env[key];
  return env;
}

const sendEnv = (task) => ({ ...baseEnv(task), ...task.env });

/** Task Scheduler keeps no output, so the runner writes its own log on every platform. */
function log(task, text) {
  const file = path.join(task.home, "logs", `${task.name}.log`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, text.trim().split("\n").map((line) => `${new Date().toISOString()} ${line}\n`).join(""));
}

/** The next time `at` comes round. A start boundary in the past makes Task Scheduler run the task as soon as it is registered. */
function nextStart(at, now = new Date()) {
  const [hour, minute] = at.split(":").map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  if (start <= now) start.setDate(start.getDate() + 1);
  return start;
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function windowsTaskXml(task, file) {
  const start = nextStart(task.at);
  const date = [start.getFullYear(), start.getMonth() + 1, start.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
  const user = process.env.USERDOMAIN && process.env.USERNAME ? `<UserId>${xml(`${process.env.USERDOMAIN}\\${process.env.USERNAME}`)}</UserId>` : "";
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>gstack unattended run: ${xml(task.name)}</Description></RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>${date}T${task.at}:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals><Principal id="Author">${user}<LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <WakeToRun>true</WakeToRun>
    <ExecutionTimeLimit>PT${Math.ceil(task.timeoutMinutes) + 15}M</ExecutionTimeLimit>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${xml(task.node)}</Command>
      <Arguments>${xml(`"${path.join(task.home, "bin", "schedule.mjs")}" run "${file}"`)}</Arguments>
      <WorkingDirectory>${xml(task.home)}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;
}

function launchdPlist(task, file) {
  const [hour, minute] = task.at.split(":").map(Number);
  const args = [task.node, path.join(task.home, "bin", "schedule.mjs"), "run", file];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL(task.name)}</string>
  <key>ProgramArguments</key>
  <array>${args.map((a) => `<string>${xml(a)}</string>`).join("")}</array>
  <key>WorkingDirectory</key><string>${xml(task.home)}</string>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>${minute}</integer></dict>
</dict>
</plist>
`;
}

const plistPath = (name) => path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL(name)}.plist`);
const launchdDomain = () => `gui/${process.getuid()}`;

const SCHEDULERS = {
  win32: {
    register(task, file) {
      const definition = path.join(task.home, "tasks", `${task.name}.xml`);
      fs.writeFileSync(definition, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(windowsTaskXml(task, file), "utf16le")]));
      exec("schtasks", ["/Create", "/TN", `gstack\\${task.name}`, "/XML", definition, "/F"]);
      return `Task Scheduler task gstack\\${task.name}`;
    },
    unregister(home, name) {
      exec("schtasks", ["/Delete", "/TN", `gstack\\${name}`, "/F"], { allowFail: true });
      fs.rmSync(path.join(home, "tasks", `${name}.xml`), { force: true });
    },
  },
  darwin: {
    register(task, file) {
      const plist = plistPath(task.name);
      fs.mkdirSync(path.dirname(plist), { recursive: true });
      fs.writeFileSync(plist, launchdPlist(task, file));
      exec("launchctl", ["bootout", `${launchdDomain()}/${LABEL(task.name)}`], { allowFail: true });
      // bootout returns before the old job is gone, and a bootstrap until then fails with an I/O error.
      for (let attempt = 1; ; attempt++) {
        const result = exec("launchctl", ["bootstrap", launchdDomain(), plist], { allowFail: attempt < 10 });
        if (result.status === 0) break;
        sleep(300);
      }
      return `launchd agent ${LABEL(task.name)}`;
    },
    unregister(home, name) {
      exec("launchctl", ["bootout", `${launchdDomain()}/${LABEL(name)}`], { allowFail: true });
      fs.rmSync(plistPath(name), { force: true });
    },
  },
};

function scheduler() {
  const found = SCHEDULERS[process.platform];
  if (!found) throw new UsageError(`schedule: no scheduler for ${process.platform}`);
  return found;
}

function add(name, values, args) {
  if (!TIME.test(values.at ?? "")) throw new UsageError("schedule: --at must be a 24-hour time such as 03:00");
  if (!values.cwd || !fs.statSync(values.cwd, { throwIfNoEntry: false })?.isDirectory()) throw new UsageError("schedule: --cwd must be an existing folder");
  if (!values.prompt?.trim()) throw new UsageError("schedule: --prompt is required");
  const timeoutMinutes = Number(values.timeout ?? DEFAULT_TIMEOUT_MINUTES);
  if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > MAX_TIMEOUT_MINUTES) {
    throw new UsageError(`schedule: --timeout must be a whole number of minutes, at most ${MAX_TIMEOUT_MINUTES}`);
  }
  const claude = onPath("claude");
  if (!claude) throw new UsageError("schedule: cannot find claude on PATH");
  if (isCmdShim(claude) && [claude, ...args].some((a) => CMD_UNSAFE.test(a))) {
    throw new UsageError(`schedule: ${claude} runs through cmd.exe, so neither its path nor the claude args can hold any of " % ^ & | < > !`);
  }

  const home = stateDir();
  const bin = path.join(home, "bin");
  fs.mkdirSync(bin, { recursive: true });
  if (path.resolve(HERE) !== path.resolve(bin)) for (const script of SCRIPTS) fs.copyFileSync(path.join(HERE, script), path.join(bin, script));

  /** @type {Task} */
  const task = {
    name,
    at: values.at,
    cwd: path.resolve(values.cwd),
    prompt: values.prompt.trim(),
    args,
    timeoutMinutes,
    claude,
    node: process.execPath,
    home,
    path: process.env.PATH ?? "",
    env: Object.fromEntries(REPORT_ENV.filter((key) => process.env[key]).map((key) => [key, process.env[key]])),
  };
  const file = taskFile(home, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(task, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  const target = SCHEDULERS[process.platform];
  if (!target) {
    const [hour, minute] = task.at.split(":").map(Number);
    throw new UsageError(`schedule: no scheduler for ${process.platform}. The task is saved, so add this line with \`crontab -e\`:\n${minute} ${hour} * * * "${task.node}" "${path.join(bin, "schedule.mjs")}" run ${name}`);
  }
  const registered = target.register(task, file);
  console.log(`${name}: runs daily at ${task.at} in ${task.cwd}, as ${registered}`);
  console.log(`task file: ${file}`);
  const missing = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"].filter((key) => !task.env[key]);
  if (missing.length && (task.env.GSTACK_REPORT_ADAPTER ?? "telegram") === "telegram") console.log(`warning: ${missing.join(" and ")} not set, so reports will fail to send`);
}

function remove(name) {
  const home = stateDir();
  scheduler().unregister(home, name);
  fs.rmSync(taskFile(home, name), { force: true });
  console.log(`${name}: removed`);
}

function list() {
  const dir = path.join(stateDir(), "tasks");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
  for (const f of files) {
    const task = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    console.log(`${task.name}\t${task.at}\t${task.cwd}`);
  }
  if (!files.length) console.error("schedule: no tasks");
}

function promptFor(task, reportFile) {
  return `${task.prompt}

This run is unattended, so nobody can answer a question. Make reversible choices yourself and say so in the report. When you finish, or when you cannot go on, write a status report as JSON to ${reportFile}. Its fields are "title" and "status" (both required, and status is done, blocked or failed), "summary", "completed", "blockers" and "next" (lists of one-sentence strings), and "links" (a list of {"label", "url"}). Give every claim its evidence. Write only that file. The runner sends it.`;
}

/** A process that claude starts in a group of its own escapes a group kill, so walk the parent links too. */
function killTree(child) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    return;
  }
  const children = new Map();
  for (const line of exec("ps", ["-A", "-o", "pid=,ppid="], { allowFail: true }).stdout?.split("\n") ?? []) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    if (pid) children.set(ppid, [...(children.get(ppid) ?? []), pid]);
  }
  const tree = [child.pid];
  for (let i = 0; i < tree.length; i++) tree.push(...(children.get(tree[i]) ?? []));
  for (const pid of [-child.pid, ...tree]) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
}

/** @returns {Promise<ClaudeExit>} */
async function runClaude(task, env, dir, prompt) {
  const out = fs.openSync(path.join(dir, "claude.json"), "w");
  const err = fs.openSync(path.join(dir, "claude.log"), "w");
  const args = ["-p", "--output-format", "json", ...task.args];
  const options = { cwd: task.cwd, env, stdio: ["pipe", out, err], windowsHide: true };
  // npm installs claude as a .cmd shim, which Node only starts through a shell. Args were checked for cmd metacharacters in add.
  const child = isCmdShim(task.claude)
    ? spawn([task.claude, ...args].map((a) => `"${a}"`).join(" "), { ...options, shell: true })
    : spawn(task.claude, args, { ...options, detached: process.platform !== "win32" });
  try {
    return await new Promise((resolve) => {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        killTree(child);
      }, task.timeoutMinutes * 60_000);
      child.on("error", (e) => {
        clearTimeout(timer);
        resolve({ code: null, timedOut, error: e.message });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ code, timedOut });
      });
      child.stdin.on("error", () => {});
      child.stdin.end(prompt);
    });
  } finally {
    fs.closeSync(out);
    fs.closeSync(err);
  }
}

async function send(task, reportFile) {
  for (let attempt = 1; ; attempt++) {
    const result = spawnSync(process.execPath, [path.join(HERE, "report.mjs"), reportFile], { env: sendEnv(task), encoding: "utf8", stdio: ["ignore", "inherit", "pipe"], windowsHide: true });
    const sent = { status: result.status ?? 1, stderr: result.stderr ?? "" };
    process.stderr.write(sent.stderr);
    log(task, `sent ${path.basename(path.dirname(reportFile))}: exit ${sent.status}\n${sent.stderr}`);
    if (sent.status !== 4 || !NOT_CONNECTED.test(sent.stderr) || attempt === SEND_ATTEMPTS) return sent;
    await new Promise((resolve) => setTimeout(resolve, SEND_RETRY_MS));
  }
}

/** report.mjs exits 2 both for a bad report and for a bad adapter setting. Only a bad report is the agent's fault. */
const badReport = (sent) => sent.status === 2 && /^report: (invalid report|cannot read)/.test(sent.stderr);

const problems = (stderr) =>
  stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "report: invalid report" && !/^(usage: )?report\.mjs /.test(line))
    .join(" ");

function failureReason(task, exit) {
  if (exit.error) return `claude could not start (${exit.error}).`;
  if (exit.timedOut) return `The run hit its ${task.timeoutMinutes}-minute limit and was stopped.`;
  return `claude exited with code ${exit.code} and wrote no report.`;
}

/** 0 and 1 mean a message went out. Any other code is report.mjs's own, or 5 when it crashed. */
const exitFor = (sent, fallback) => (sent.status === 0 ? Number(fallback) : [2, 3, 4].includes(sent.status) ? sent.status : 5);

async function run(target) {
  const file = target.endsWith(".json") ? path.resolve(target) : taskFile(stateDir(), target);
  /** @type {Task} */
  const task = JSON.parse(fs.readFileSync(file, "utf8"));
  const dir = newRunDir(task.name, { GSTACK_HOME: task.home });
  const reportFile = path.join(dir, "report.json");
  log(task, `started ${path.basename(dir)}`);

  let reason;
  if (!fs.statSync(task.cwd, { throwIfNoEntry: false })?.isDirectory()) reason = `The folder ${task.cwd} no longer exists, so claude did not start.`;
  else {
    const exit = await runClaude(task, agentEnv(task), dir, promptFor(task, reportFile));
    reason = failureReason(task, exit);
    if (fs.existsSync(reportFile)) {
      const sent = await send(task, reportFile);
      if (!badReport(sent)) return exitFor(sent, false);
      fs.renameSync(reportFile, path.join(dir, "report.invalid.json"));
      reason = `The agent wrote a report the runner could not read. ${problems(sent.stderr)}`;
    }
  }
  const fallback = { title: `${task.name}: no usable report`, status: "failed", summary: reason, next: [`Read the logs in ${dir}`] };
  fs.writeFileSync(reportFile, `${JSON.stringify(fallback, null, 2)}\n`);
  return exitFor(await send(task, reportFile), true);
}

async function main() {
  const argv = process.argv.slice(2);
  const split = argv.indexOf("--");
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: split === -1 ? argv : argv.slice(0, split),
      options: { at: { type: "string" }, cwd: { type: "string" }, prompt: { type: "string" }, timeout: { type: "string" } },
      allowPositionals: true,
    }));
  } catch (e) {
    throw new UsageError(e.message);
  }
  const [command, name, ...rest] = positionals;
  const claudeArgs = split === -1 ? [] : argv.slice(split + 1);
  const named = () => {
    if (!NAME.test(name ?? "") || rest.length) throw new UsageError("schedule: a task name is lowercase letters, digits and hyphens, at most 40 characters");
    return name;
  };
  if (command === "add") return add(named(), values, claudeArgs);
  if (command === "remove") return remove(named());
  if (command === "list" && !name) return list();
  if (command === "run" && name && !rest.length) process.exit(await run(name.endsWith(".json") ? name : named()));
  throw new UsageError(`schedule: unknown command "${command ?? ""}"`);
}

main().catch((e) => {
  console.error(e.message);
  if (e instanceof UsageError) console.error(USAGE);
  process.exit(e instanceof UsageError ? 2 : 1);
});
