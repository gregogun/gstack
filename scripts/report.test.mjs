import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = path.join(REPO, "skills/report/scripts/report.mjs");
const TOKEN = "123:secret-token";

const sample = {
  title: "Nightly dependency upgrade",
  status: "blocked",
  summary: "Upgraded 4 of 5 packages.",
  completed: ["react 19.2", "vite 7.1"],
  blockers: ["eslint 10 drops the flat-config shim"],
  next: ["pin eslint 9 or migrate the config"],
  links: [{ label: "PR", url: "https://github.com/o/r/pull/1" }],
};

function run(args, { input, env = {} } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [REPORT, ...args], {
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(input === undefined ? "" : typeof input === "string" ? input : JSON.stringify(input));
  });
}

async function fakeTelegram(t, reply = { status: 200, body: { ok: true } }) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      requests.push({ url: req.url, body: JSON.parse(body) });
      res.writeHead(reply.status, { "content-type": "application/json" }).end(JSON.stringify(reply.body));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const env = { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: "42", TELEGRAM_API_URL: `http://127.0.0.1:${server.address().port}` };
  return { requests, env };
}

test("stdout renders every section in order and skips empty ones", async () => {
  const result = await run(["--adapter", "stdout"], { input: { ...sample, next: [] } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    [
      "⛔ BLOCKED · Nightly dependency upgrade",
      "Upgraded 4 of 5 packages.",
      "Completed\n• react 19.2\n• vite 7.1",
      "Blocked on\n• eslint 10 drops the flat-config shim",
      "PR: https://github.com/o/r/pull/1",
    ].join("\n\n") + "\n",
  );
});

test("reads a file argument, including one saved with a UTF-8 BOM by Windows PowerShell", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "report-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "report.json");
  fs.writeFileSync(file, `\uFEFF${JSON.stringify({ title: "Done", status: "done" })}`);
  const result = await run(["--adapter", "stdout", file]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "✅ DONE · Done\n");
});

test("rejects an invalid report with exit 2 and names every problem", async () => {
  const result = await run(["--adapter", "stdout"], { input: { status: "maybe", completed: "all of it", links: [{ label: "x", url: "javascript:alert(1)" }] } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /"title" must be a non-empty string/);
  assert.match(result.stderr, /"status" must be one of done, running, blocked, failed/);
  assert.match(result.stderr, /"completed" must be a list of strings/);
  assert.match(result.stderr, /http\(s\) "url"/);
  assert.equal(result.stdout, "");
});

test("rejects a null link and an unknown field with exit 2, and accepts a null summary", async () => {
  const bad = await run(["--adapter", "stdout"], { input: { ...sample, links: [null], blocked: ["typo for blockers"] } });
  assert.equal(bad.status, 2, bad.stderr);
  assert.match(bad.stderr, /http\(s\) "url"/);
  assert.match(bad.stderr, /unknown field "blocked"/);
  const ok = await run(["--adapter", "stdout"], { input: { title: "Done", status: "done", summary: null } });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout, "✅ DONE · Done\n");
});

test("rejects input that is not JSON, and an unknown adapter, with exit 2", async () => {
  assert.equal((await run(["--adapter", "stdout"], { input: "not json" })).status, 2);
  const unknown = await run(["--adapter", "signal"], { input: sample });
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /no adapter "signal" \(have: stdout, telegram\)/);
});

test("telegram is the default adapter and posts the rendered text to the configured chat", async (t) => {
  const { requests, env } = await fakeTelegram(t);
  const result = await run([], { input: sample, env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `/bot${TOKEN}/sendMessage`);
  assert.equal(requests[0].body.chat_id, "42");
  assert.match(requests[0].body.text, /^⛔ BLOCKED · Nightly dependency upgrade\n/);
  assert.match(requests[0].body.text, /Next\n• pin eslint 9 or migrate the config/);
});

test("GSTACK_REPORT_ADAPTER picks the adapter when no flag is given", async () => {
  const result = await run([], { input: sample, env: { GSTACK_REPORT_ADAPTER: "stdout" } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^⛔ BLOCKED/);
});

test("telegram truncates a message past its 4096-character limit", async (t) => {
  const { requests, env } = await fakeTelegram(t);
  const result = await run([], { input: { ...sample, summary: "x".repeat(5000) }, env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(requests[0].body.text.length, 4096);
  assert.ok(requests[0].body.text.endsWith("…"));
});

test("telegram truncation never splits an emoji at the cut", async (t) => {
  const { requests, env } = await fakeTelegram(t);
  const header = "⛔ BLOCKED · Nightly dependency upgrade\n\n";
  const summary = "x".repeat(4094 - header.length) + "😀".repeat(100);
  const result = await run([], { input: { title: sample.title, status: "blocked", summary }, env });
  assert.equal(result.status, 0, result.stderr);
  const text = requests[0].body.text;
  assert.ok(text.length <= 4096);
  assert.ok(!/[\uD800-\uDBFF]…$/.test(text), "no lone high surrogate before the ellipsis");
  assert.ok(text.endsWith("x…"));
});

test("telegram without credentials exits 3 and sends nothing", async () => {
  const result = await run([], { input: sample, env: { TELEGRAM_CHAT_ID: "42" } });
  assert.equal(result.status, 3);
  assert.match(result.stderr, /set TELEGRAM_BOT_TOKEN/);
});

test("a Telegram API error exits 4 with its description and never prints the token", async (t) => {
  const { env } = await fakeTelegram(t, { status: 400, body: { ok: false, description: "Bad Request: chat not found" } });
  const result = await run([], { input: sample, env });
  assert.equal(result.status, 4);
  assert.match(result.stderr, /telegram: 400 Bad Request: chat not found/);
  assert.ok(!result.stderr.includes("secret-token"));
});

test("an unreachable Telegram exits 4 and never prints the token", async () => {
  const env = { TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: "42", TELEGRAM_API_URL: "http://127.0.0.1:1" };
  const result = await run([], { input: sample, env });
  assert.equal(result.status, 4);
  assert.match(result.stderr, /telegram: request failed/);
  assert.ok(!result.stderr.includes("secret-token"));
});
