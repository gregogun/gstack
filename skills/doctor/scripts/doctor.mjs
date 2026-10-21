#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkModelRows, MODEL_ROLES_PATH, MODEL_VALUES_PATH, parseRoles } from "../../go-mode/scripts/model-table.mjs";

const { values: args } = parseArgs({
  options: {
    "plugin-root": { type: "string" },
    "user-skills": { type: "string" },
    "project-skills": { type: "string" },
    "plugin-records": { type: "string" },
    "marketplace-records": { type: "string" },
    settings: { type: "string", multiple: true, default: [] },
    "models-config": { type: "string" },
  },
});
if (!args["plugin-root"]) {
  console.error("usage: doctor.mjs --plugin-root <dir> [--user-skills <dir>] [--project-skills <dir>] [--plugin-records <file>] [--marketplace-records <file>] [--settings <file>]... [--models-config <file>]");
  process.exit(2);
}

const expand = (p) => (p?.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : p);
const show = (p) => (p.startsWith(os.homedir() + path.sep) ? `~${p.slice(os.homedir().length)}` : p);
const real = (p) => (fs.existsSync(p) ? fs.realpathSync(p) : path.resolve(p));
const readJson = (p) => (p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);

const pluginRoot = real(expand(args["plugin-root"]));
const gstack = readJson(path.join(pluginRoot, ".claude-plugin/plugin.json"))?.name ?? path.basename(pluginRoot);

function readSkill(dir) {
  const text = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
  const front = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const name = front.match(/^name:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? path.basename(dir);
  const link = fs.lstatSync(dir).isSymbolicLink() ? fs.realpathSync(dir) : null;
  return { dir, name, link, invocable: !/^disable-model-invocation:\s*true\s*$/m.test(front) };
}

const skillDirsIn = (root) =>
  !fs.existsSync(root)
    ? []
    : fs.existsSync(path.join(root, "SKILL.md"))
      ? [root]
      : fs.readdirSync(root).map((e) => path.join(root, e)).filter((d) => fs.existsSync(path.join(d, "SKILL.md")));

// A personal or project skill also answers to its directory name; a plugin skill only to its name.
function looseSkills(dir, kind) {
  return skillDirsIn(dir).filter((d) => d !== dir).map((d) => {
    const skill = readSkill(d);
    return { ...skill, kind, label: `${kind} skill`, names: new Set([skill.name, path.basename(d)]) };
  });
}

function pluginSkills(dir, id) {
  const manifest = readJson(path.join(dir, ".claude-plugin/plugin.json")) ?? {};
  const extra = [manifest.skills ?? []].flat().map((p) => path.resolve(dir, p));
  const roots = [path.join(dir, "skills"), ...extra].filter((r) => fs.existsSync(r));
  const dirs = roots.length ? roots.flatMap(skillDirsIn) : skillDirsIn(dir).filter((d) => d === dir);
  return dirs.map((d) => {
    const skill = readSkill(d);
    return { ...skill, kind: "plugin", id, label: `plugin ${id}`, names: new Set([skill.name]) };
  });
}

const records = readJson(expand(args["plugin-records"]))?.plugins ?? {};
const marketplaces = readJson(expand(args["marketplace-records"])) ?? {};
const enabled = Object.assign({}, ...args.settings.map((f) => readJson(expand(f))?.enabledPlugins ?? {}));
const cwd = real(process.cwd());
const namePart = (id) => id.split("@")[0];

// A plugin from a local directory marketplace loads in place from the marketplace folder, not from its install path.
function loadDir(id, record) {
  const market = marketplaces[id.split("@")[1]];
  if (market?.source?.source === "directory") {
    const entry = readJson(path.join(market.installLocation, ".claude-plugin/marketplace.json"))?.plugins?.find((p) => p.name === namePart(id));
    if (typeof entry?.source === "string") return { dir: path.resolve(market.installLocation, entry.source), repo: market.installLocation };
  }
  return { dir: record.installPath, repo: null };
}

const otherPlugins = [];
for (const [id, list] of Object.entries(records)) {
  if (namePart(id) === gstack) continue;
  const record = list.find((r) => r.scope === "user" || r.scope === "managed" || (r.projectPath && real(r.projectPath) === cwd));
  if (!record) continue;
  const { dir } = loadDir(id, record);
  const manifest = readJson(path.join(dir, ".claude-plugin/plugin.json")) ?? {};
  if (manifest.name === gstack || !(enabled[id] ?? manifest.defaultEnabled ?? true)) continue;
  otherPlugins.push(...pluginSkills(dir, id));
}

const own = new Set(pluginSkills(pluginRoot, gstack).map((s) => s.name));
const others = [
  ...(args["user-skills"] ? looseSkills(expand(args["user-skills"]), "user") : []),
  ...(args["project-skills"] ? looseSkills(path.resolve(expand(args["project-skills"])), "project") : []),
  ...otherPlugins,
];

const findings = [];
const add = (check, severity, detail, fix = "") => findings.push({ check, severity, detail, fix });
const okIfNone = (check, detail) => findings.some((f) => f.check === check) || add(check, "ok", detail);

function where(skill) {
  return skill.link ? `${show(skill.dir)}, a symlink to ${show(skill.link)}` : show(skill.dir);
}

const CLASH = {
  user: (s, n) => [
    "clash",
    "error",
    `The user skill at ${where(s)} takes the bare \`/${n}\`, so gstack's runs only as \`/${gstack}:${n}\`.`,
    s.link ? `Remove only the link ${show(s.dir)}. Its target stays.` : `Remove or rename ${show(s.dir)}. Change its folder and its \`name:\`, since both answer to \`/${n}\`.`,
  ],
  project: (s, n) => [
    "project copy",
    "warn",
    `The project skill at ${where(s)} takes the bare \`/${n}\`, so gstack's runs only as \`/${gstack}:${n}\`. Probably an override on purpose.`,
    `None if it is on purpose. \`/${gstack}:${n}\` still runs gstack's.`,
  ],
  plugin: (s, n) => [
    "clash",
    "error",
    `Plugin ${s.id} also has \`${n}\`, at ${show(s.dir)}. Which one a bare \`/${n}\` runs is unknown.`,
    `Type \`/${gstack}:${n}\`, or disable ${s.id}.`,
  ],
};

for (const name of [...own].sort()) {
  for (const skill of others) if (skill.names.has(name)) add(...CLASH[skill.kind](skill, name));
}
okIfNone("clash", "No user skill or other enabled plugin uses a gstack skill's name.");
okIfNone("project copy", "No project skill uses a gstack skill's name.");

function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

const MIN_STEM = 5;
const MIN_STEM_SHARE = 2 / 3;

function sharesLongStem(x, y) {
  const shorter = Math.min(x.length, y.length);
  let stem = 0;
  while (stem < shorter && x[stem] === y[stem]) stem++;
  return stem >= MIN_STEM && stem >= shorter * MIN_STEM_SHARE;
}

function lookalike(a, b) {
  const [x, y] = [a.replaceAll("-", ""), b.replaceAll("-", "")];
  return x !== y && (distance(x, y) <= 1 || sharesLongStem(x, y));
}

for (const skill of others) {
  if (!skill.invocable || [...skill.names].some((n) => own.has(n))) continue;
  const near = [...own].filter((n) => lookalike(skill.name, n));
  if (!near.length) continue;
  add(
    "lookalike",
    "warn",
    `The ${skill.label} \`${skill.name}\` at ${where(skill)} can run without being called, and its name is close to gstack's ${near.map((n) => `\`${n}\``).join(", ")}.`,
    {
      plugin: `Ignore it, or disable ${skill.id}.`,
      project: "Add `disable-model-invocation: true` to its frontmatter if it should run only when called.",
      user: `If it is an old copy, remove it${skill.link ? " (the link only)" : ""}. To keep it, add \`disable-model-invocation: true\` to its frontmatter.`,
    }[skill.kind],
  );
}
okIfNone("lookalike", "No skill that runs on its own has a name close to a gstack skill's.");

const ownRecords = Object.entries(records).filter(([id]) => namePart(id) === gstack).flatMap(([id, list]) => list.map((r) => ({ id, ...r })));

if (!ownRecords.length) add("install scope", "n/a", `No install record names ${gstack}, so it was loaded another way.`);
else if (ownRecords.some((r) => r.scope === "user")) add("install scope", "ok", "Installed at user scope.");
else {
  const scopes = ownRecords.map((r) => `${r.scope}${r.projectPath ? ` scope for ${show(r.projectPath)}` : " scope"}`).join("; ");
  add("install scope", "warn", `Installed only at ${scopes}, so ${gstack} loads only there.`, `Reinstall ${gstack} at user scope.`);
}

function newest(dir, pick) {
  let best = null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    const found = entry.isDirectory() ? newest(full, pick) : { file: full, mtime: fs.statSync(full).mtimeMs };
    if (found && (!best || pick(found.mtime, best.mtime))) best = found;
  }
  return best;
}

const source = ownRecords.map((r) => loadDir(r.id, r)).find((l) => l.repo && real(l.dir) === pluginRoot);
const sourceDirs = source ? ["skills", "agents", "harnesses"].map((d) => path.join(source.repo, d)).filter((d) => fs.existsSync(d)) : [];
if (!sourceDirs.length) add("stale build", "n/a", `${show(pluginRoot)} is not where an install loads ${gstack} from a local source folder.`);
else {
  const changed = sourceDirs.map((d) => newest(d, (a, b) => a > b)).filter(Boolean).reduce((a, b) => (a.mtime > b.mtime ? a : b));
  const built = newest(pluginRoot, (a, b) => a < b);
  const stamp = (ms) => new Date(ms).toISOString().replace("T", " ").slice(0, 19);
  if (changed.mtime > built.mtime) {
    add(
      "stale build",
      "warn",
      `${show(pluginRoot)} was built at ${stamp(built.mtime)}, before ${show(changed.file)} changed at ${stamp(changed.mtime)}.`,
      `Run \`node scripts/build.mjs ${path.basename(pluginRoot)}\` in ${show(source.repo)}, then reload plugins.`,
    );
  } else add("stale build", "ok", `${show(pluginRoot)} is newer than its source.`);
}

const modelsConfig = expand(args["models-config"]);
if (!modelsConfig || !fs.existsSync(modelsConfig)) add("model config", "ok", "No override file, so every role uses its default.");
else {
  const { roles } = parseRoles(fs.readFileSync(path.join(pluginRoot, MODEL_ROLES_PATH), "utf8"));
  const values = readJson(path.join(pluginRoot, MODEL_VALUES_PATH));
  if (!values) add("model config", "warn", `${show(path.join(pluginRoot, MODEL_VALUES_PATH))} is missing, so models and efforts were not checked.`, "Rebuild gstack.");
  const { problems } = checkModelRows(fs.readFileSync(modelsConfig, "utf8"), roles, values ?? {});
  for (const { line, message } of problems) {
    add("model config", "error", `${show(modelsConfig)}${line ? `:${line}` : ""}: ${message}.`, `Run \`/${gstack}:setup-gstack\` to rewrite the file, or fix the row by hand.`);
  }
  okIfNone("model config", `${show(modelsConfig)} uses only known roles, models and efforts.`);
}

const cell = (s) => s.replaceAll("|", "\\|");
console.log("| Check | Severity | Detail | Fix |\n|---|---|---|---|");
for (const f of findings) console.log(`| ${f.check} | ${f.severity} | ${cell(f.detail)} | ${cell(f.fix)} |`);
const count = (s) => findings.filter((f) => f.severity === s).length;
console.log(`\n${count("error")} error(s), ${count("warn")} warning(s).`);
process.exit(count("error") ? 1 : 0);
