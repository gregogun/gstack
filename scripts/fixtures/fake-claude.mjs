#!/usr/bin/env node
// Stands in for `claude -p` in schedule.test.mjs. FAKE_CLAUDE_MODE picks what the agent does with the report path in its prompt.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const prompt = fs.readFileSync(0, "utf8");
const reportFile = prompt.match(/write a status report as JSON to (.+?\.json)\. /)?.[1];
const dir = path.dirname(reportFile);
fs.writeFileSync(path.join(dir, "fake.json"), JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), prompt, home: process.env.GSTACK_HOME, telegram: Object.keys(process.env).filter((key) => key.startsWith("TELEGRAM_")) }));

const mode = process.env.FAKE_CLAUDE_MODE ?? "report";
if (mode === "report") fs.writeFileSync(reportFile, JSON.stringify({ title: "Nightly", status: "done", completed: ["did the thing"] }));
if (mode === "invalid") fs.writeFileSync(reportFile, JSON.stringify({ title: "Nightly", status: "finished" }));
if (mode === "garbage") fs.writeFileSync(reportFile, "{");
if (mode === "hang") {
  const grandchild = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", detached: true });
  fs.writeFileSync(path.join(dir, "grandchild.pid"), String(grandchild.pid));
  setInterval(() => {}, 1000);
} else {
  process.stdout.write(JSON.stringify({ result: "ok" }));
  process.exit(mode === "none" ? 3 : 0);
}
