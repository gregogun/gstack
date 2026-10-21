#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkModelRows, MODEL_ROLES_PATH, MODEL_VALUES_PATH, parseRoles } from "../../go-mode/scripts/model-table.mjs";

const BUILD_INPUTS = "build-inputs.json";
const MIN_EDIT_LENGTH = 5;
const MIN_STEM = 5;
const MIN_STEM_SHARE = 2 / 3;

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
const code = (names) => names.map((n) => `\`${n}\``).join(", ");
const once = (fn) => {
  let value;
  return () => (value ??= fn());
};

function readJson(p) {
  if (!p || !fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`${show(p)} is not valid JSON (${e.message})`);
  }
}

const pluginRoot = real(expand(args["plugin-root"]));
const cwd = real(process.cwd());

function readSkill(dir) {
  const text = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
  const front = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const name = front.match(/^name:[ \t]*["']?([^"'\n]+?)["']?[ \t]*$/m)?.[1] ?? path.basename(dir);
  const link = fs.lstatSync(dir).isSymbolicLink() ? fs.realpathSync(dir) : null;
  return { dir, name, link, invocable: !/^disable-model-invocation:[ \t]*["']?true["']?[ \t]*(#.*)?$/m.test(front) };
}

const skillDirsIn = (root) =>
  !fs.existsSync(root)
    ? []
    : fs.existsSync(path.join(root, "SKILL.md"))
      ? [root]
      : fs.readdirSync(root).map((e) => path.join(root, e)).filter((d) => fs.existsSync(path.join(d, "SKILL.md")));

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

const installs = once(() => {
  const file = expand(args["plugin-records"]);
  const records = readJson(file)?.plugins ?? {};
  if (Object.values(records).some((list) => !Array.isArray(list))) throw new Error(`${show(file)} lists a plugin's installs as something other than an array`);
  const marketplaces = readJson(expand(args["marketplace-records"])) ?? {};
  const enabled = Object.assign({}, ...args.settings.map((f) => readJson(expand(f))?.enabledPlugins ?? {}));

  // A plugin from a local directory marketplace loads in place from the marketplace folder, not from its install path.
  function loadDir(id, record) {
    const market = marketplaces[id.split("@")[1]];
    if (market?.source?.source === "directory") {
      const entry = readJson(path.join(market.installLocation, ".claude-plugin/marketplace.json"))?.plugins?.find((p) => p.name === id.split("@")[0]);
      if (typeof entry?.source === "string") return { dir: path.resolve(market.installLocation, entry.source), repo: market.installLocation };
    }
    return { dir: record.installPath, repo: null };
  }

  const own = [];
  const others = [];
  for (const [id, list] of Object.entries(records)) {
    const loads = list.map((record) => ({ id, ...record, ...loadDir(id, record) }));
    own.push(...loads.filter((l) => real(l.dir) === pluginRoot));
    const other = loads.find((l) => real(l.dir) !== pluginRoot && (l.scope === "user" || l.scope === "managed" || (l.projectPath && real(l.projectPath) === cwd)));
    if (other && (enabled[id] ?? readJson(path.join(other.dir, ".claude-plugin/plugin.json"))?.defaultEnabled ?? true)) others.push(other);
  }
  return { own, others };
});

const skills = once(() => {
  const userDir = args["user-skills"] && expand(args["user-skills"]);
  const projectDir = args["project-skills"] && path.resolve(expand(args["project-skills"]));
  return {
    own: new Set(pluginSkills(pluginRoot, "gstack").map((s) => s.name)),
    user: userDir ? looseSkills(userDir, "user") : [],
    project: projectDir && (!userDir || real(projectDir) !== real(userDir)) ? looseSkills(projectDir, "project") : [],
    plugins: installs().others.map((l) => ({ id: l.id, dir: l.dir, skills: pluginSkills(l.dir, l.id) })),
  };
});

const where = (skill) => (skill.link ? `${show(skill.dir)}, a symlink to ${show(skill.link)}` : show(skill.dir));
const ok = (detail) => [{ severity: "ok", detail, fix: "" }];

function clashRows() {
  const { own, user, plugins } = skills();
  const rows = [];
  for (const name of [...own].sort()) {
    for (const s of user.filter((u) => u.names.has(name))) {
      rows.push({
        severity: "error",
        detail: `The user skill at ${where(s)} takes the bare \`/${name}\`, so gstack's runs only as \`/gstack:${name}\`.`,
        fix: s.link ? `Remove only the link ${show(s.dir)}. Its target stays.` : `Remove or rename ${show(s.dir)}. Change its folder and its \`name:\`, since both answer to \`/${name}\`.`,
      });
    }
  }
  for (const plugin of plugins) {
    const shared = [...new Set(plugin.skills.map((s) => s.name).filter((n) => own.has(n)))].sort();
    if (!shared.length) continue;
    rows.push({
      severity: "error",
      detail: `Plugin ${plugin.id} at ${show(plugin.dir)} also has ${shared.length} of gstack's skill names: ${code(shared)}. Which plugin a bare command runs is unknown.`,
      fix: `Disable ${plugin.id}, or type the full \`/gstack:<name>\`.`,
    });
  }
  return rows.length ? rows : ok("No user skill or other enabled plugin uses a gstack skill's name.");
}

function projectCopyRows() {
  const { own, user, project } = skills();
  const rows = [];
  for (const name of [...own].sort()) {
    for (const s of project.filter((p) => p.names.has(name))) {
      const winner = user.find((u) => u.names.has(name));
      rows.push({
        severity: "warn",
        detail: winner
          ? `The project skill at ${where(s)} also uses \`/${name}\`, but the user skill at ${show(winner.dir)} takes the bare name first.`
          : `The project skill at ${where(s)} takes the bare \`/${name}\`, so gstack's runs only as \`/gstack:${name}\`. Probably an override on purpose.`,
        fix: `None if it is on purpose. \`/gstack:${name}\` still runs gstack's.`,
      });
    }
  }
  return rows.length ? rows : ok("No project skill uses a gstack skill's name.");
}

function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

function sharesLongStem(x, y) {
  const shorter = Math.min(x.length, y.length);
  let stem = 0;
  while (stem < shorter && x[stem] === y[stem]) stem++;
  return stem >= MIN_STEM && stem >= shorter * MIN_STEM_SHARE;
}

function lookalike(a, b) {
  const [x, y] = [a.replaceAll("-", ""), b.replaceAll("-", "")];
  if (x === y) return false;
  return (Math.min(x.length, y.length) >= MIN_EDIT_LENGTH && distance(x, y) <= 1) || sharesLongStem(x, y);
}

function lookalikeRows() {
  const { own, user, project, plugins } = skills();
  const frontmatter = "add `disable-model-invocation: true` to its frontmatter";
  const rows = [];
  for (const skill of [...user, ...project, ...plugins.flatMap((p) => p.skills)]) {
    if (!skill.invocable || [...skill.names].some((n) => own.has(n))) continue;
    const near = [...own].filter((n) => lookalike(skill.name, n));
    if (!near.length) continue;
    rows.push({
      severity: "warn",
      detail: `The ${skill.label} \`${skill.name}\` at ${where(skill)} can run without being called, and its name is close to gstack's ${code(near)}.`,
      fix: {
        plugin: `Ignore it, or disable ${skill.id}.`,
        project: `To make it run only when called, ${frontmatter}.`,
        user: `If it is an old copy, remove it${skill.link ? " (the link only)" : ""}. To keep it, ${frontmatter}.`,
      }[skill.kind],
    });
  }
  return rows.length ? rows : ok("No skill that runs on its own has a name close to a gstack skill's.");
}

function installScopeRows() {
  const { own } = installs();
  if (!own.length) return [{ severity: "n/a", detail: `No install record loads ${show(pluginRoot)}, so it was loaded another way.`, fix: "" }];
  if (own.some((r) => r.scope === "user")) return ok("Installed at user scope.");
  const scopes = own.map((r) => `${r.scope}${r.projectPath ? ` scope for ${show(r.projectPath)}` : " scope"}`).join("; ");
  return [{ severity: "warn", detail: `Installed only at ${scopes}, so gstack loads only there.`, fix: "Reinstall gstack at user scope." }];
}

function newestFile(p) {
  if (!fs.existsSync(p)) return null;
  const stat = fs.statSync(p);
  if (!stat.isDirectory()) return { file: p, mtime: stat.mtimeMs };
  let best = null;
  for (const name of fs.readdirSync(p)) {
    if (name === ".DS_Store" || name === "node_modules") continue;
    const found = newestFile(path.join(p, name));
    if (found && (!best || found.mtime > best.mtime)) best = found;
  }
  return best;
}

function staleBuildRows() {
  const source = installs().own.find((l) => l.repo);
  if (!source) return [{ severity: "n/a", detail: `${show(pluginRoot)} is not where an install loads gstack from a local source folder.`, fix: "" }];
  const recordFile = path.join(pluginRoot, BUILD_INPUTS);
  const record = readJson(recordFile);
  const rebuild = (harness) => `Run \`node scripts/build.mjs ${harness}\` in ${show(source.repo)}.`;
  if (!record) {
    return [{
      severity: "warn",
      detail: `${show(pluginRoot)} has no ${BUILD_INPUTS}, so its last build failed or is older than this check.`,
      fix: rebuild(path.relative(path.join(source.repo, "dist"), pluginRoot)),
    }];
  }
  if (!Array.isArray(record.inputs)) throw new Error(`${show(recordFile)} has no inputs list`);
  const built = fs.statSync(recordFile).mtimeMs;
  const changed = record.inputs.map((p) => newestFile(path.join(source.repo, p))).filter(Boolean).reduce((a, b) => (b.mtime > a.mtime ? b : a), { mtime: 0 });
  if (changed.mtime <= built) return ok(`${show(pluginRoot)} is newer than every file its build reads.`);
  const stamp = (ms) => new Date(ms).toISOString().replace("T", " ").slice(0, 19);
  return [{
    severity: "warn",
    detail: `${show(pluginRoot)} was built at ${stamp(built)}, before ${show(changed.file)} changed at ${stamp(changed.mtime)}.`,
    fix: rebuild(record.harness),
  }];
}

function modelConfigRows() {
  const config = expand(args["models-config"]);
  if (!config || !fs.existsSync(config)) return ok("No override file, so every role uses its default.");
  const rows = [];
  const { roles } = parseRoles(fs.readFileSync(path.join(pluginRoot, MODEL_ROLES_PATH), "utf8"));
  const values = readJson(path.join(pluginRoot, MODEL_VALUES_PATH));
  if (!values) rows.push({ severity: "warn", detail: `${show(path.join(pluginRoot, MODEL_VALUES_PATH))} is missing, so models and efforts were not checked.`, fix: "Rebuild gstack." });
  const { problems } = checkModelRows(fs.readFileSync(config, "utf8"), roles, values ?? {});
  for (const { line, message } of problems) {
    rows.push({ severity: "error", detail: `${show(config)}${line ? `:${line}` : ""}: ${message}.`, fix: "Run `/gstack:setup-gstack` to rewrite the file, or fix the row by hand." });
  }
  return rows.length ? rows : ok(`${show(config)} uses only known roles, models and efforts.`);
}

const CHECKS = [
  ["clash", clashRows],
  ["project copy", projectCopyRows],
  ["lookalike", lookalikeRows],
  ["install scope", installScopeRows],
  ["stale build", staleBuildRows],
  ["model config", modelConfigRows],
];

let stopped = false;
const findings = CHECKS.flatMap(([check, run]) => {
  try {
    return run().map((row) => ({ check, ...row }));
  } catch (e) {
    stopped = true;
    return [{ check, severity: "error", detail: `The check stopped: ${e.message}.`, fix: "Fix or remove the file it names, then run the doctor again." }];
  }
});

const cell = (s) => s.replaceAll("|", "\\|").replaceAll("\n", " ");
console.log("| Check | Severity | Detail | Fix |\n|---|---|---|---|");
for (const f of findings) console.log(`| ${f.check} | ${f.severity} | ${cell(f.detail)} | ${cell(f.fix)} |`);
const count = (s) => findings.filter((f) => f.severity === s).length;
console.log(`\n${count("error")} error(s), ${count("warn")} warning(s).`);
process.exitCode = stopped ? 2 : count("error") ? 1 : 0;
