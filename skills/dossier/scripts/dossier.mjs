#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const USAGE = "usage: dossier.mjs [--report <report.json>] [--out <dir>] [--hook]";
const DOSSIER_FILE = /^\d{2,}-[\w.-]*\.md$/;
const ANSI = /\x1b\[[0-9;]*m/g;
const OUTPUT_LINES = 40;
const HOOK_SLACK_MS = 2000;

/**
 * One failure, parsed from the report. Everything after parseReport reads only this shape.
 *
 * @typedef {{ name?: string, path: string }} Artifact
 * @typedef {{
 *   kind: "test",
 *   titlePath: string[],
 *   file: string,
 *   line: number,
 *   column: number,
 *   project: string,
 *   status: string,
 *   retry: number,
 *   messages: string[],
 *   screenshot: Artifact | null,
 *   trace: Artifact | null,
 *   video: Artifact | null,
 *   output: string[],
 * }} TestFailure
 * @typedef {{ kind: "run", file: string | null, messages: string[] }} RunFailure
 * @typedef {TestFailure | RunFailure} FailureRecord
 */

const clean = (text) => String(text ?? "").replace(ANSI, "").trimEnd();
const posix = (p) => p.split(path.sep).join("/");
const shq = (word) => (/^[\w@%+=:,./-]+$/.test(word) ? word : `'${word.replaceAll("'", `'\\''`)}'`);
const shell = (argv) => argv.map(shq).join(" ");
const regexEscape = (text) => text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
const fence = (text) => {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  return "`".repeat(longest + 1);
};

function messagesOf(result) {
  const errors = result.errors?.length ? result.errors : result.error ? [result.error] : [];
  return errors.map((e) => clean(e.message ?? e.value ?? e.stack)).filter(Boolean);
}

function artifact(attachments, test) {
  const found = attachments.find((a) => a.path && test(a));
  return found ? { name: found.name, path: found.path } : null;
}

function screenshotOf(attachments) {
  const image = (a) => a.contentType?.startsWith("image/");
  return (
    artifact(attachments, (a) => image(a) && a.name?.includes("diff")) ??
    artifact(attachments, (a) => image(a) && a.name?.includes("actual")) ??
    artifact(attachments, image)
  );
}

function outputOf(result) {
  const chunks = [...(result.stdout ?? []), ...(result.stderr ?? [])];
  const text = chunks.map((c) => c.text ?? Buffer.from(c.buffer ?? "", "base64").toString("utf8")).join("");
  return clean(text).split("\n").filter(Boolean).slice(-OUTPUT_LINES);
}

function parseReport(report) {
  const rootDir = report.config?.rootDir ?? ".";
  const records = (report.errors ?? []).map((e) => ({
    kind: "run",
    file: e.location?.file && path.isAbsolute(e.location.file) ? e.location.file : null,
    messages: [clean(e.message ?? e.stack)].filter(Boolean),
  }));
  const walk = (suite, titles) => {
    const here = suite.title && !suite.file?.endsWith(suite.title) ? [...titles, suite.title] : titles;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const result = test.results?.at(-1);
        if (test.status !== "unexpected" || !result) continue;
        const attachments = result.attachments ?? [];
        records.push({
          kind: "test",
          titlePath: [...here, spec.title],
          file: path.resolve(rootDir, spec.file),
          line: spec.line,
          column: spec.column,
          project: test.projectName ?? "",
          status: result.status,
          retry: result.retry,
          messages: messagesOf(result),
          screenshot: screenshotOf(attachments),
          trace: artifact(attachments, (a) => a.name === "trace"),
          video: artifact(attachments, (a) => a.contentType?.startsWith("video/")),
          output: outputOf(result),
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, here);
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  return records;
}

function reproduceArgv(record, cwd) {
  if (record.kind === "run") {
    return ["npx", "playwright", "test", ...(record.file ? [posix(path.relative(cwd, record.file))] : [])];
  }
  const location = `${posix(path.relative(cwd, record.file))}:${record.line}:${record.column}`;
  const title = record.titlePath.at(-1);
  return [
    "npx", "playwright", "test", location,
    ...(record.project ? [`--project=${record.project}`] : []),
    "-g", regexEscape(title),
  ];
}

function render(record, cwd) {
  const rel = (p) => posix(path.relative(cwd, p));
  const block = (text, lang = "") => `${fence(text)}${lang}\n${text}\n${fence(text)}`;
  const messages = record.messages.length
    ? record.messages.map((m) => block(m)).join("\n\n")
    : "The report holds no message for this failure. Read the trace and the runner output.";
  const reproduce = block(shell(reproduceArgv(record, cwd)), "sh");

  if (record.kind === "run") {
    return [
      "# The run failed before or outside any test",
      record.file ? `**File**: \`${rel(record.file)}\`` : null,
      `**Error**:\n\n${messages}`,
      `**Reproduce** (from \`${posix(cwd)}\`):\n\n${reproduce}`,
    ].filter(Boolean).join("\n\n") + "\n";
  }

  const evidence = [
    record.screenshot ? `- **Screenshot**: [${path.basename(record.screenshot.path)}](${encodeURI(rel(record.screenshot.path))})` : null,
    record.trace ? `- **Trace**: \`${shell(["npx", "playwright", "show-trace", rel(record.trace.path)])}\`` : null,
    record.video ? `- **Video**: \`${rel(record.video.path)}\`` : null,
  ].filter(Boolean);
  return [
    `# ${record.titlePath.join(" › ")}`,
    [
      `- **Status**: ${record.status}${record.retry ? ` (retry ${record.retry})` : ""}`,
      record.project ? `- **Project**: \`${record.project}\`` : null,
      `- **Location**: \`${rel(record.file)}:${record.line}:${record.column}\``,
      ...evidence,
    ].filter(Boolean).join("\n"),
    `## Error\n\n${messages}`,
    `## Reproduce\n\nRun from \`${posix(cwd)}\`. It selects this test alone.\n\n${reproduce}`,
    record.output.length ? `## Runner output (last ${OUTPUT_LINES} lines)\n\n${block(record.output.join("\n"))}` : null,
  ].filter(Boolean).join("\n\n") + "\n";
}

function slug(record) {
  const words = record.kind === "run" ? ["run-error"] : [record.project, ...record.titlePath];
  return words.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "failure";
}

function writeDossiers(records, outDir, cwd) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const old of fs.readdirSync(outDir)) if (DOSSIER_FILE.test(old)) fs.rmSync(path.join(outDir, old));
  return records.map((record, i) => {
    const file = path.join(outDir, `${String(i + 1).padStart(2, "0")}-${slug(record)}.md`);
    fs.writeFileSync(file, render(record, cwd));
    return file;
  });
}

function readReport(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`dossier: cannot read ${file} (${e.message})`);
    console.error(USAGE);
    process.exit(2);
  }
}

function runHook(args) {
  const payload = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const cwd = payload.cwd ?? process.cwd();
  const report = path.resolve(cwd, args.report);
  const startedAt = Date.now() - (payload.duration_ms ?? 0) - HOOK_SLACK_MS;
  if (!fs.existsSync(report) || fs.statSync(report).mtimeMs < startedAt) return;
  const records = parseReport(readReport(report));
  if (records.length === 0) return;
  const files = writeDossiers(records, path.resolve(cwd, args.out), cwd);
  const list = files.map((f) => `- ${posix(path.relative(cwd, f))}`).join("\n");
  const additionalContext =
    `The Playwright run wrote ${files.length} failure dossier${files.length === 1 ? "" : "s"}:\n${list}\n` +
    "Read each dossier and its trace before changing code. Rerun one failure with its Reproduce command.";
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: payload.hook_event_name ?? "PostToolUseFailure", additionalContext } }));
}

function main() {
  let args;
  try {
    ({ values: args } = parseArgs({
      options: {
        report: { type: "string", default: "playwright-report/report.json" },
        out: { type: "string", default: "playwright-report/dossier" },
        hook: { type: "boolean", default: false },
      },
    }));
  } catch (e) {
    console.error(e.message);
    console.error(USAGE);
    process.exit(2);
  }
  if (args.hook) return runHook(args);
  const cwd = process.cwd();
  const records = parseReport(readReport(path.resolve(args.report)));
  const files = writeDossiers(records, path.resolve(args.out), cwd);
  for (const f of files) console.log(posix(path.relative(cwd, f)));
  console.error(`dossier: ${files.length} failure${files.length === 1 ? "" : "s"} written to ${posix(path.relative(cwd, path.resolve(args.out))) || "."}`);
}

main();
