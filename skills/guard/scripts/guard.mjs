#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PREFIX_WORDS = new Set(["command", "exec", "nohup", "time", "sudo", "env", "export", "{", "!", "if", "then", "else", "elif", "while", "until", "do"]);
const POSIX_SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const POWERSHELLS = new Set(["pwsh", "powershell"]);
const PS_EVAL = new Set(["invoke-expression", "iex"]);
const GIT_VALUE_OPTIONS = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env", "--attr-source"]);
const COMMIT_VALUE_SHORTS = new Set(["m", "F", "c", "C", "t"]);
const COMMIT_ATTACHED_VALUE_SHORTS = new Set(["S", "u"]);
const COMMIT_VALUE_LONGS = new Set(["--message", "--file", "--author", "--date", "--reuse-message", "--reedit-message", "--fixup", "--squash", "--template", "--cleanup", "--trailer", "--pathspec-from-file"]);

const SKIP_ENV = {
  HUSKY: (value) => value === "0",
  LEFTHOOK: (value) => value === "0" || value.toLowerCase() === "false",
  LEFTHOOK_EXCLUDE: () => true,
};

function splitCommand(command, dialect) {
  const escape = dialect === "powershell" ? "`" : "\\";
  const segments = [[]];
  let word = null;
  let quote = null;
  const endWord = () => {
    if (word !== null) segments.at(-1).push(word);
    word = null;
  };
  const endSegment = () => {
    endWord();
    segments.push([]);
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    const next = command[i + 1];
    if (quote === "'") {
      if (c === "'") quote = null;
      else word += c;
    } else if ((c === "$" && next === "(") || (c === "`" && dialect === "bash")) {
      // A command substitution runs even inside double quotes, so its body is checked as its own invocation.
      quote = null;
      if (c === "$") i++;
      endSegment();
    } else if (c === escape && next !== undefined) {
      if (next !== "\n") word = (word ?? "") + next;
      i++;
    } else if (quote === '"') {
      if (c === '"') quote = null;
      else word += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      word ??= "";
    } else if (";|&()\n".includes(c)) endSegment();
    else if (/\s/.test(c) || c === "<" || c === ">") endWord();
    else word = (word ?? "") + c;
  }
  endWord();
  return segments.filter((s) => s.length);
}

const programName = (word) => word.split(/[\\/]/).at(-1).toLowerCase().replace(/\.exe$/, "");

function parseInvocation(words) {
  const env = [];
  let i = 0;
  for (; i < words.length; i++) {
    const psEnv = words[i].match(/^\$env:(\w+)(?:=(.*))?$/is);
    if (psEnv) {
      env.push([psEnv[1].toUpperCase(), psEnv[2] ?? (words[i + 1] === "=" ? words[i + 2] ?? "" : "")]);
      return { env, program: null, gitOptions: [], subcommand: null, args: [] };
    }
    const assignment = words[i].match(/^([A-Za-z_]\w*)=(.*)$/s);
    if (assignment) env.push([assignment[1], assignment[2]]);
    else if (!PREFIX_WORDS.has(programName(words[i])) && !words[i].startsWith("-")) break;
  }
  const program = i < words.length ? programName(words[i]) : null;
  const rest = words.slice(i + 1);
  if (program !== "git") return { env, program, gitOptions: [], subcommand: null, args: rest };
  const gitOptions = [];
  let j = 0;
  for (; j < rest.length && rest[j].startsWith("-"); j++) {
    const [flag, value] = rest[j].split(/=(.*)/s);
    gitOptions.push({ flag, value: value ?? (GIT_VALUE_OPTIONS.has(flag) ? rest[++j] ?? "" : null) });
  }
  return { env, program, gitOptions, subcommand: rest[j] ?? null, args: rest.slice(j + 1) };
}

const isNoVerify = (arg) => arg.length > "--no-".length && "--no-verify".startsWith(arg);

function commitSkip(args) {
  for (let k = 0; k < args.length && args[k] !== "--"; k++) {
    const arg = args[k];
    if (isNoVerify(arg)) return arg;
    if (COMMIT_VALUE_LONGS.has(arg)) k++;
    if (!/^-[^-]/.test(arg)) continue;
    for (let p = 1; p < arg.length; p++) {
      if (arg[p] === "n") return arg;
      if (COMMIT_ATTACHED_VALUE_SHORTS.has(arg[p])) break;
      if (COMMIT_VALUE_SHORTS.has(arg[p])) {
        if (p === arg.length - 1) k++;
        break;
      }
    }
  }
  return null;
}

const HOOK_BYPASS = [
  (inv) => {
    const hit = inv.env.find(([name, value]) => SKIP_ENV[name]?.(value));
    return hit && `\`${hit[0]}=${hit[1]}\` turns off git hooks`;
  },
  (inv) => {
    const hit = inv.gitOptions.find(({ flag, value }) => (flag === "-c" || flag === "--config-env") && /^core\.hookspath=/i.test(value ?? ""));
    return hit && `\`git ${hit.flag} ${hit.value}\` runs hooks from another directory`;
  },
  (inv) => {
    if (inv.program !== "git" || inv.subcommand === "commit") return null;
    const end = inv.args.indexOf("--");
    const hit = (end === -1 ? inv.args : inv.args.slice(0, end)).find(isNoVerify);
    return hit && `\`git ${inv.subcommand} ${hit}\` skips git hooks`;
  },
  (inv) => {
    if (inv.program !== "git" || inv.subcommand !== "commit") return null;
    const hit = commitSkip(inv.args);
    return hit && `\`git commit ${hit}\` skips the pre-commit and commit-msg hooks`;
  },
];

function hookBypass(inv) {
  for (const check of HOOK_BYPASS) {
    const reason = check(inv);
    if (reason) return `${reason}. Run the command without the skip, then fix whatever the hook reports`;
  }
  return null;
}

function nestedScript(inv) {
  if (inv.program === "eval") return { command: inv.args.join(" "), dialect: "bash" };
  if (POSIX_SHELLS.has(inv.program)) {
    const at = inv.args.findIndex((a) => /^-[a-z]*c[a-z]*$/.test(a));
    if (at !== -1 && inv.args[at + 1] !== undefined) return { command: inv.args[at + 1], dialect: "bash" };
  }
  if (POWERSHELLS.has(inv.program)) {
    const at = inv.args.findIndex((a) => /^-c(ommand)?$/i.test(a));
    if (at !== -1) return { command: inv.args.slice(at + 1).join(" "), dialect: "powershell" };
  }
  if (PS_EVAL.has(inv.program)) return { command: inv.args.join(" "), dialect: "powershell" };
  return null;
}

function* invocations(command, dialect, cwd) {
  for (const words of splitCommand(command, dialect)) {
    const inv = parseInvocation(words);
    if (inv.program === "cd") cwd = path.resolve(cwd, inv.args[0] ?? os.homedir());
    yield { ...inv, cwd };
    const script = nestedScript(inv);
    if (script) yield* invocations(script.command, script.dialect, cwd);
  }
}

export const RULES = {
  "hook-bypass": { shell: hookBypass },
};

export function check(action, ruleNames) {
  for (const name of ruleNames) {
    const rule = RULES[name];
    let reason = null;
    if (action.kind === "shell" && rule.shell) {
      for (const inv of invocations(action.command, action.dialect, action.cwd)) if ((reason = rule.shell(inv))) break;
    } else if (action.kind === "edit" && rule.edit) reason = rule.edit(action.path);
    if (reason) return `guard(${name}): ${reason}.`;
  }
  return null;
}

const CLAUDE_EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

export const ADAPTERS = {
  "claude-code": {
    action(event) {
      const input = event.tool_input ?? {};
      const cwd = event.cwd ?? process.cwd();
      const dialect = { Bash: "bash", PowerShell: "powershell" }[event.tool_name];
      if (dialect) return typeof input.command === "string" ? { kind: "shell", command: input.command, dialect, cwd } : null;
      const file = input.file_path ?? input.notebook_path;
      if (CLAUDE_EDIT_TOOLS.has(event.tool_name) && typeof file === "string") return { kind: "edit", path: path.resolve(cwd, file) };
      return null;
    },
    deny(reason) {
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } }));
    },
  },
};

function main() {
  const [harness, ...flags] = process.argv.slice(2);
  const adapter = ADAPTERS[harness];
  if (!adapter) {
    console.error(`guard: usage is guard.mjs <${Object.keys(ADAPTERS).join("|")}> [--rules <name,...>]`);
    process.exit(1);
  }
  const at = flags.indexOf("--rules");
  const allowed = new Set((process.env.AGENT_GUARD_ALLOW ?? "").split(",").map((s) => s.trim()));
  const names = (at === -1 ? Object.keys(RULES) : flags[at + 1].split(",")).filter((name) => RULES[name] && !allowed.has(name));
  let event;
  try {
    event = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch (e) {
    console.error(`guard: unreadable hook input: ${e.message}`);
    return;
  }
  const action = adapter.action(event);
  const reason = action && check(action, names);
  if (reason) adapter.deny(reason);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
