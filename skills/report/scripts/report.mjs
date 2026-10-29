#!/usr/bin/env node

import fs from "node:fs";
import { parseArgs } from "node:util";

const USAGE = "usage: report.mjs [--adapter <name>] [<report.json>]   (reads stdin when no file is given)";
const STATUS_ICON = { done: "✅", running: "⏳", blocked: "⛔", failed: "❌" };
const SECTIONS = [
  ["completed", "Completed"],
  ["blockers", "Blocked on"],
  ["next", "Next"],
];
const KEYS = new Set(["title", "status", "summary", ...SECTIONS.map(([key]) => key), "links"]);
const TELEGRAM_LIMIT = 4096;
const TIMEOUT_MS = 15000;

/**
 * The one shape every adapter receives. parseReport is the only code that reads the raw JSON.
 *
 * @typedef {keyof typeof STATUS_ICON} Status
 * @typedef {{ label: string, url: string }} Link
 * @typedef {{
 *   title: string,
 *   status: Status,
 *   summary: string,
 *   completed: string[],
 *   blockers: string[],
 *   next: string[],
 *   links: Link[],
 * }} Report
 * @typedef {(report: Report, env: NodeJS.ProcessEnv) => Promise<void>} Adapter
 */

class ReportError extends Error {
  constructor(exitCode, message) {
    super(message);
    this.exitCode = exitCode;
  }
}

/** @returns {Report} */
function parseReport(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new ReportError(2, "report: the report must be a JSON object");
  const problems = Object.keys(raw).filter((key) => !KEYS.has(key)).map((key) => `unknown field "${key}"`);
  const text = (key, required) => {
    const value = raw[key];
    if ((value ?? "") === "" && !required) return "";
    if (typeof value === "string" && value.trim()) return value.trim();
    problems.push(`"${key}" must be a non-empty string`);
    return "";
  };
  const list = (key) => {
    const value = raw[key] ?? [];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value.map((item) => item.trim()).filter(Boolean);
    problems.push(`"${key}" must be a list of strings`);
    return [];
  };
  const links = raw.links ?? [];
  if (!Array.isArray(links)) problems.push(`"links" must be a list of { label, url }`);
  else if (!links.every((link) => typeof link?.label === "string" && link.label.trim() && /^https?:\/\//.test(link.url))) problems.push(`each link needs a "label" and an http(s) "url"`);
  const report = {
    title: text("title", true),
    status: raw.status,
    summary: text("summary", false),
    completed: list("completed"),
    blockers: list("blockers"),
    next: list("next"),
    links: Array.isArray(links) ? links.map((link) => ({ label: link?.label?.trim?.(), url: link?.url })) : [],
  };
  if (!Object.hasOwn(STATUS_ICON, raw.status)) problems.push(`"status" must be one of ${Object.keys(STATUS_ICON).join(", ")}`);
  if (problems.length) throw new ReportError(2, `report: invalid report\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  return report;
}

/** Plain text, so no adapter has to escape a markup dialect. */
function render(report, limit = Infinity) {
  const blocks = [`${STATUS_ICON[report.status]} ${report.status.toUpperCase()} · ${report.title}`];
  if (report.summary) blocks.push(report.summary);
  for (const [key, heading] of SECTIONS) {
    if (report[key].length) blocks.push(`${heading}\n${report[key].map((item) => `• ${item}`).join("\n")}`);
  }
  if (report.links.length) blocks.push(report.links.map((link) => `${link.label}: ${link.url}`).join("\n"));
  const message = blocks.join("\n\n");
  if (message.length <= limit) return message;
  const end = /[\uD800-\uDBFF]/.test(message[limit - 2]) ? limit - 2 : limit - 1;
  return `${message.slice(0, end)}…`;
}

/** @type {Record<string, Adapter>} */
const ADAPTERS = {
  stdout: async (report) => {
    process.stdout.write(`${render(report)}\n`);
  },
  telegram: async (report, env) => {
    const missing = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"].filter((name) => !env[name]);
    if (missing.length) throw new ReportError(3, `telegram: set ${missing.join(" and ")} (see the report skill's Setup)`);
    const base = (env.TELEGRAM_API_URL ?? "https://api.telegram.org").replace(/\/+$/, "");
    let response;
    try {
      response = await fetch(`${base}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: render(report, TELEGRAM_LIMIT), link_preview_options: { is_disabled: true } }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      // The token is part of the URL, so report the cause and never the request.
      throw new ReportError(4, `telegram: request failed (${e.cause?.code ?? e.name})`);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok !== true) throw new ReportError(4, `telegram: ${response.status} ${body.description ?? response.statusText}`);
  },
};

function readInput(file) {
  try {
    const text = fs.readFileSync(file ?? 0, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(text);
  } catch (e) {
    throw new ReportError(2, `report: cannot read ${file ?? "stdin"} (${e.message})\n${USAGE}`);
  }
}

async function main() {
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({ options: { adapter: { type: "string" } }, allowPositionals: true }));
  } catch (e) {
    throw new ReportError(2, `${e.message}\n${USAGE}`);
  }
  if (positionals.length > 1) throw new ReportError(2, USAGE);
  const name = values.adapter ?? process.env.GSTACK_REPORT_ADAPTER ?? "telegram";
  const adapter = Object.hasOwn(ADAPTERS, name) ? ADAPTERS[name] : null;
  if (!adapter) throw new ReportError(2, `report: no adapter "${name}" (have: ${Object.keys(ADAPTERS).join(", ")})`);
  await adapter(parseReport(readInput(positionals[0])), process.env);
}

main().catch((e) => {
  if (!(e instanceof ReportError)) throw e;
  console.error(e.message);
  process.exit(e.exitCode);
});
