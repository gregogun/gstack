#!/usr/bin/env node
// Renders dist/<harness>/ from skills/, agents/ and harnesses/<harness>/.
// Usage: node scripts/build.mjs [harness...]   (default: every folder in harnesses/)
//
// A harness folder holds:
//   harness.json   manifest {source, target}, extra root files to copy, deny/allow lists
//   tokens.md      one "## name" section per {{name}} token; HTML comments are ignored
//   agents/*.yml   frontmatter lines merged into agents/<name>.md
//   models.md      default model and effort per role (required), checked against ROLES_FILE
//                  and shipped as MODEL_DEFAULTS_TARGET
//   the manifest template named by harness.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIRS = ["skills", "agents"];
const EXCLUDE = new Set(["node_modules", ".DS_Store"]);
const TOKEN = /\{\{([a-z_]+)\}\}/g;
const ROLES_FILE = "skills/go-mode/references/model-roles.md";
const MODEL_DEFAULTS_TARGET = "skills/go-mode/references/model-defaults.md";

const rel = (p) => path.relative(ROOT, p);
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function parseTokens(file) {
  const text = fs.readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const tokens = new Map();
  const sections = text.split(/^## +/m).slice(1);
  for (const section of sections) {
    const newline = section.indexOf("\n");
    const name = section.slice(0, newline).trim();
    const value = section.slice(newline + 1).trim();
    if (!/^[a-z_]+$/.test(name)) throw new Error(`${rel(file)}: bad token name "${name}"`);
    if (tokens.has(name)) throw new Error(`${rel(file)}: token "${name}" defined twice`);
    if (!value) throw new Error(`${rel(file)}: token "${name}" has no value`);
    if (value.includes("\n\n")) throw new Error(`${rel(file)}: token "${name}" spans more than one paragraph`);
    tokens.set(name, value.replace(/\s*\n\s*/g, " "));
  }
  return tokens;
}

// Rows of the Markdown tables in `text` (after the first line matching `after`, if given),
// as arrays of trimmed cells, skipping header and separator rows.
function tableRows(text, after) {
  let lines = text.split("\n");
  if (after) lines = lines.slice(Math.max(0, lines.findIndex((l) => after.test(l))));
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("|")) continue;
    if (/^\|[\s:|-]+\|$/.test(lines[i]) || lines[i + 1]?.match(/^\|[\s:|-]+\|$/)) continue;
    rows.push({ line: i + 1, cells: lines[i].split("|").slice(1, -1).map((c) => c.trim()) });
  }
  return rows;
}

const roleName = (cell) => cell.match(/^`([^`]+)`$/)?.[1];

function parseRoles(errors) {
  const file = path.join(ROOT, ROLES_FILE);
  const roles = new Map();
  for (const { line, cells } of tableRows(fs.readFileSync(file, "utf8"), /^## Roles\s*$/)) {
    const name = roleName(cells[0]);
    if (!name || !["one", "list"].includes(cells[1])) {
      errors.push(`${ROLES_FILE}:${line}: role row needs a \`role\` and an Entries of "one" or "list"`);
      continue;
    }
    roles.set(name, cells[1]);
  }
  if (!roles.size) errors.push(`${ROLES_FILE}: no roles found under "## Roles"`);
  return roles;
}

function checkModelDefaults(file, roles, config, errors) {
  const label = rel(file);
  if (!fs.existsSync(file)) {
    errors.push(`${label}: missing. Every harness needs a default model and effort per role (see ${ROLES_FILE})`);
    return;
  }
  const models = config.models ?? [];
  const efforts = config.efforts ?? [];
  const counts = new Map();
  for (const { line, cells } of tableRows(fs.readFileSync(file, "utf8"))) {
    const [cell, model, effort] = cells;
    const name = roleName(cell ?? "");
    const at = `${label}:${line}`;
    if (!name) {
      errors.push(`${at}: first cell must be a \`role\``);
      continue;
    }
    if (!roles.has(name)) errors.push(`${at}: unknown role "${name}" (not in ${ROLES_FILE})`);
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (model === "inherit-parent") {
      if (effort !== "-") errors.push(`${at}: inherit-parent takes effort "-", got "${effort}"`);
    } else {
      if (models.length && !models.includes(model)) errors.push(`${at}: model "${model}" is not one of ${models.join(", ")}, inherit-parent`);
      if (efforts.length && !efforts.includes(effort)) errors.push(`${at}: effort "${effort}" is not one of ${efforts.join(", ")}`);
    }
  }
  for (const [name, entries] of roles) {
    const n = counts.get(name) ?? 0;
    if (n === 0) errors.push(`${label}: no default for role "${name}"`);
    if (entries === "one" && n > 1) errors.push(`${label}: role "${name}" takes one entry, has ${n}`);
  }
}

function mergeFrontmatter(text, overlay, label, errors) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    errors.push(`${label}: no frontmatter to merge the overlay into`);
    return text;
  }
  const keyOf = (line) => line.match(/^([A-Za-z_][\w-]*):/)?.[1];
  const existing = new Set(match[1].split("\n").map(keyOf).filter(Boolean));
  const lines = overlay.trimEnd().split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const key = keyOf(line);
    if (key && existing.has(key)) errors.push(`${label}: overlay sets "${key}", which the source frontmatter already sets`);
  }
  return `---\n${match[1]}\n${lines.join("\n")}\n---\n${text.slice(match[0].length)}`;
}

function build(harness) {
  const hdir = path.join(ROOT, "harnesses", harness);
  const out = path.join(ROOT, "dist", harness);
  const config = JSON.parse(fs.readFileSync(path.join(hdir, "harness.json"), "utf8"));
  const tokensFile = path.join(hdir, "tokens.md");
  const tokens = fs.existsSync(tokensFile) ? parseTokens(tokensFile) : new Map();
  const deny = (config.denyList ?? []).map((p) => new RegExp(p));
  const allow = config.allowList ?? [];
  const overlayDir = path.join(hdir, "agents");
  const overlays = new Map(
    fs.existsSync(overlayDir)
      ? fs.readdirSync(overlayDir).filter((f) => f.endsWith(".yml")).map((f) => [f.slice(0, -4), fs.readFileSync(path.join(overlayDir, f), "utf8")])
      : [],
  );

  const errors = [];
  const warnings = [];
  const used = new Set();

  fs.rmSync(out, { recursive: true, force: true });

  const modelDefaults = path.join(hdir, "models.md");
  checkModelDefaults(modelDefaults, parseRoles(errors), config, errors);
  if (fs.existsSync(path.join(ROOT, MODEL_DEFAULTS_TARGET))) errors.push(`${MODEL_DEFAULTS_TARGET}: the build writes this file from harnesses/<harness>/models.md, so the source must not have it`);

  for (const dir of SOURCE_DIRS) {
    for (const src of walk(path.join(ROOT, dir))) {
      const dest = path.join(out, rel(src));
      fs.mkdirSync(path.dirname(dest), { recursive: true });

      if (!src.endsWith(".md")) {
        fs.copyFileSync(src, dest);
        fs.chmodSync(dest, fs.statSync(src).mode);
        const text = fs.readFileSync(src, "latin1");
        for (const m of text.matchAll(TOKEN)) {
          errors.push(`${rel(src)}:${lineOf(text, m.index)}: token ${m[0]} in a non-Markdown file is never rendered`);
        }
        continue;
      }

      const text = fs.readFileSync(src, "utf8");
      let rendered = text.replace(TOKEN, (whole, name, index) => {
        if (!tokens.has(name)) {
          errors.push(`${rel(src)}:${lineOf(text, index)}: unknown token ${whole} for harness ${harness}`);
          return whole;
        }
        used.add(name);
        return tokens.get(name);
      });

      if (dir === "agents") {
        const name = path.basename(src, ".md");
        if (overlays.has(name)) {
          rendered = mergeFrontmatter(rendered, overlays.get(name), rel(src), errors);
          overlays.delete(name);
        }
      }

      rendered.split("\n").forEach((line, i) => {
        const at = `${rel(dest)}:${i + 1}`;
        if (line.includes("{{")) errors.push(`${at}: unrendered "{{" left in output`);
        let scrubbed = line;
        for (const ok of allow) scrubbed = scrubbed.split(ok).join("");
        for (const re of deny) {
          const hit = scrubbed.match(re);
          if (hit) errors.push(`${at}: deny-listed name "${hit[0]}": ${line.trim().slice(0, 120)}`);
        }
      });

      fs.writeFileSync(dest, rendered);
    }
  }

  for (const name of overlays.keys()) errors.push(`harnesses/${harness}/agents/${name}.yml: no agents/${name}.md to merge into`);
  for (const name of tokens.keys()) if (!used.has(name)) warnings.push(`harnesses/${harness}/tokens.md: token "${name}" is defined but never used`);

  if (fs.existsSync(modelDefaults)) fs.copyFileSync(modelDefaults, path.join(out, MODEL_DEFAULTS_TARGET));

  for (const file of config.copy ?? []) {
    fs.copyFileSync(path.join(ROOT, file), path.join(out, file));
  }

  if (config.manifest) {
    const manifestSrc = path.join(hdir, config.manifest.source);
    const manifestText = fs.readFileSync(manifestSrc, "utf8");
    try {
      JSON.parse(manifestText);
    } catch (e) {
      errors.push(`${rel(manifestSrc)}: invalid JSON: ${e.message}`);
    }
    const manifestDest = path.join(out, config.manifest.target);
    fs.mkdirSync(path.dirname(manifestDest), { recursive: true });
    fs.writeFileSync(manifestDest, manifestText);
  }

  for (const w of warnings) console.warn(`warning: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`);
    console.error(`\n${harness}: build failed with ${errors.length} error(s). Output in ${rel(out)} is incomplete.`);
    return false;
  }
  console.log(`${harness}: built ${rel(out)}`);
  return true;
}

const all = fs.readdirSync(path.join(ROOT, "harnesses"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const requested = process.argv.slice(2);
for (const h of requested) {
  if (!all.includes(h)) {
    console.error(`error: no harness "${h}" in harnesses/ (have: ${all.join(", ")})`);
    process.exit(1);
  }
}
let ok = true;
for (const h of requested.length ? requested : all) ok = build(h) && ok;
process.exit(ok ? 0 : 1);
