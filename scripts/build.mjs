#!/usr/bin/env node
// Renders dist/<harness>/ from skills/, agents/ and harnesses/<harness>/.
// Usage: node scripts/build.mjs [harness...]   (default: every folder in harnesses/)
//
// A harness folder holds:
//   harness.json   manifest {source, target}, extra root files to copy, deny/allow lists
//   tokens.md      one "## name" section per {{name}} token; HTML comments are ignored
//   agents/*.yml   frontmatter lines merged into agents/<name>.md
//   models.md      default model and effort per role and a "Drop order:" line (required),
//                  checked against ROLES_FILE
//                  and shipped as MODEL_DEFAULTS_TARGET
//   the manifest template named by harness.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkModelRows, parseRoles as parseRoleTable } from "../skills/doctor/scripts/model-table.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIRS = ["skills", "agents"];
const EXCLUDE = new Set(["node_modules", ".DS_Store"]);
const TOKEN = /\{\{([a-z_]+)\}\}/g;
const ROLES_FILE = "skills/go-mode/references/model-roles.md";
const MODEL_DEFAULTS_TARGET = "skills/go-mode/references/model-defaults.md";
const MODEL_VALUES_TARGET = "skills/go-mode/references/model-values.json";

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

function parseRoles(errors) {
  const { roles, problems } = parseRoleTable(fs.readFileSync(path.join(ROOT, ROLES_FILE), "utf8"));
  for (const { line, message } of problems) errors.push(`${ROLES_FILE}${line ? `:${line}` : ""}: ${message}`);
  return roles;
}

function checkModelDefaults(file, roles, config, errors) {
  const label = rel(file);
  if (!fs.existsSync(file)) {
    errors.push(`${label}: missing. Every harness needs a default model and effort per role (see ${ROLES_FILE})`);
    return;
  }
  const models = config.models ?? [];
  const text = fs.readFileSync(file, "utf8");
  const order = text.match(/^Drop order: *(.+)$/m)?.[1].split(",").map((m) => m.trim());
  if (!order) errors.push(`${label}: missing a "Drop order: <model>, <model>, ..." line, strongest model first`);
  for (const model of order ?? []) {
    if (models.length && !models.includes(model)) errors.push(`${label}: drop order model "${model}" is not one of ${models.join(", ")}`);
  }
  if (order && new Set(order).size !== order.length) errors.push(`${label}: drop order lists a model twice`);
  const { problems, counts } = checkModelRows(text, roles, config);
  for (const { line, message } of problems) errors.push(`${label}${line ? `:${line}` : ""}: ${message}`);
  for (const name of roles.keys()) {
    if (!counts.has(name)) errors.push(`${label}: no default for role "${name}"`);
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
  fs.writeFileSync(path.join(out, MODEL_VALUES_TARGET), `${JSON.stringify({ models: config.models ?? [], efforts: config.efforts ?? [] }, null, 2)}\n`);

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
