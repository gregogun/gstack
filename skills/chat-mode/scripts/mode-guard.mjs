#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STATE_DIR = path.join(os.tmpdir(), "gstack-mode");
const MODE_COMMAND = /^\s*\/(?:gstack:)?(chat|lite|go)-mode(?=\s|$)/;
const ANY_COMMAND = /^\s*\/[\w:-]+(?=\s|$)/;

const READ_TOOLS = new Set(["Read", "Grep", "Glob", "WebSearch", "WebFetch", "ToolSearch", "AskUserQuestion"]);

const READ_COMMANDS = {
  cat: [], head: [], tail: [], ls: [], pwd: [], echo: [], cd: [], wc: [], file: [], stat: [],
  which: [], basename: [], dirname: [], realpath: [], cut: [], tr: [], uniq: [], diff: [], jq: [], grep: [],
  rg: ["--pre"],
  find: ["-exec", "-execdir", "-ok", "-okdir", "-delete", "-fprint", "-fprint0", "-fprintf", "-fls"],
  sort: ["-o", "--output"],
  tree: ["-o"],
};
const GIT_READS = new Set(["log", "show", "diff", "status", "blame", "ls-files", "grep", "rev-parse", "describe", "shortlog", "cat-file"]);
const GH_READS = { pr: ["view", "list", "diff", "checks", "status"], issue: ["view", "list"], run: ["view", "list"], repo: ["view"] };
const SED_PRINT = /^[\d,$]+p$/;
const SAFE_REDIRECT = /^\s*(?:\/dev\/null|&[12])/;

export function nextState(state, prompt) {
  const mode = prompt.match(MODE_COMMAND)?.[1];
  if (mode) return { mode, paused: false };
  return { mode: state.mode, paused: ANY_COMMAND.test(prompt) };
}

export function denial(state, tool, input) {
  if (state.mode !== "chat" || state.paused) return null;
  if (READ_TOOLS.has(tool)) return null;
  if (tool === "Bash" && isReadOnly(input?.command ?? "")) return null;
  return `chat-mode is read-only, so this ${tool} call is blocked. Tell the user in one line to send the request with /gstack:lite-mode for a quick change or /gstack:go-mode for rigorous work, then stop.`;
}

export function readOnlySegments(command) {
  const out = [[]];
  let word = "";
  let quote = null;
  const endWord = () => {
    if (word) out.at(-1).push(word);
    word = "";
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    const next = command[i + 1];
    if (quote === "'") {
      if (c === "'") quote = null;
      else word += c;
      continue;
    }
    if (c === "`" || (c === "$" && next === "(")) return null;
    if (quote === '"') {
      if (c === '"') quote = null;
      else if (c === "\\" && next !== undefined) word += command[++i];
      else word += c;
      continue;
    }
    if (c === "'" || c === '"') quote = c;
    else if (c === "\\" && next !== undefined) word += command[++i];
    else if ((c === "<" || c === ">") && next === "(") return null;
    else if (c === ">") {
      const target = command.slice(i + 1).match(SAFE_REDIRECT);
      if (!target) return null;
      if (/^\d$/.test(word)) word = "";
      endWord();
      i += target[0].length;
    } else if (c === "<" || (/\s/.test(c) && c !== "\n")) endWord();
    else if (c === "|" || c === ";" || c === "&" || c === "\n") {
      endWord();
      out.push([]);
    } else word += c;
  }
  if (quote) return null;
  endWord();
  return out.filter((s) => s.length);
}

function isReadOnlySegment([name, ...args]) {
  if (name === "git") {
    const rest = args[0] === "-C" ? args.slice(2) : args;
    return GIT_READS.has(rest[0]) && !rest.some((a) => a.startsWith("--output"));
  }
  if (name === "gh") return GH_READS[args[0]]?.includes(args[1]) ?? false;
  if (name === "sed") return args.includes("-n") && args.every((a) => !a.startsWith("-") || a === "-n") && SED_PRINT.test(args.find((a) => !a.startsWith("-")) ?? "");
  const banned = READ_COMMANDS[name];
  return banned !== undefined && !args.some((a) => banned.some((b) => a === b || a.startsWith(`${b}=`)));
}

export function isReadOnly(command) {
  const parsed = readOnlySegments(command);
  return parsed !== null && parsed.every(isReadOnlySegment);
}

const statePath = (sessionId) => path.join(STATE_DIR, String(sessionId).replace(/[^\w-]/g, "_"));

function readState(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), "utf8"));
  } catch {
    return { mode: null, paused: false };
  }
}

function main() {
  let event;
  try {
    event = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch (e) {
    console.error(`mode-guard: unreadable hook input: ${e.message}`);
    return;
  }
  const state = readState(event.session_id);
  if (event.hook_event_name === "UserPromptSubmit") {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(statePath(event.session_id), JSON.stringify(nextState(state, event.prompt ?? "")));
  } else if (event.hook_event_name === "PreToolUse") {
    const reason = denial(state, event.tool_name, event.tool_input);
    if (reason) {
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } }));
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
