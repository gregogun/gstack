import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(HERE, "build.mjs");
const MODEL_TABLE = "skills/go-mode/scripts/model-table.mjs";

function makeFixture(skillBody, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "build-test-"));
  const files = {
    "scripts/build.mjs": fs.readFileSync(BUILD, "utf8"),
    [MODEL_TABLE]: fs.readFileSync(path.join(HERE, "..", MODEL_TABLE), "utf8"),
    "skills/go-mode/references/model-roles.md": "## Roles\n\n| Role | Entries | Can drop | Use | Notes |\n| --- | --- | --- | --- | --- |\n| `only role` | one | yes | x | y |\n",
    "skills/demo/SKILL.md": skillBody,
    "harnesses/fx/harness.json": "{}",
    "harnesses/fx/models.md": "Drop order: opus, sonnet\n\n| Role | Model | Effort |\n| --- | --- | --- |\n| `only role` | opus | high |\n",
    "harnesses/fx/tokens.md": "## known_token\n\nKNOWN-VALUE\n",
    ...extra,
  };
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  fs.mkdirSync(path.join(root, "agents"));
  return root;
}

function build(root) {
  return spawnSync(process.execPath, [path.join(root, "scripts/build.mjs"), "fx"], { encoding: "utf8" });
}

test("known token renders", (t) => {
  const root = makeFixture("# Demo\n\nuse {{known_token}}\n");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const r = build(root);
  assert.equal(r.status, 0, `fixture should build cleanly: ${r.stderr}`);
  const out = fs.readFileSync(path.join(root, "dist/fx/skills/demo/SKILL.md"), "utf8");
  assert.match(out, /KNOWN-VALUE/, "rendered skill should contain the token value");
});

test("unknown token fails the build with file:line", (t) => {
  const root = makeFixture("# Demo\n\nuse {{nope}}\n");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const r = build(root);
  assert.equal(r.status, 1, "build should exit 1 on an unknown token");
  assert.match(r.stderr, /error: skills\/demo\/SKILL\.md:3:/, "stderr should name the source file:line");
  assert.ok(r.stderr.includes("{{nope}}"), `stderr should name the token: ${r.stderr}`);
});

test("drop order with an unknown model fails the build", (t) => {
  const root = makeFixture("# Demo\n", {
    "harnesses/fx/harness.json": '{"models": ["opus", "sonnet"]}',
    "harnesses/fx/models.md": "Drop order: opus, gpt\n\n| Role | Model | Effort |\n| --- | --- | --- |\n| `only role` | opus | high |\n",
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const r = build(root);
  assert.equal(r.status, 1, "build should exit 1 on an unknown drop-order model");
  assert.match(r.stderr, /drop order model "gpt"/);
});

test("the build writes the harness's models and efforts for the doctor", (t) => {
  const root = makeFixture("# Demo\n", {
    "harnesses/fx/harness.json": '{"models": ["opus", "sonnet"], "efforts": ["low", "high"]}',
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(build(root).status, 0);
  const values = JSON.parse(fs.readFileSync(path.join(root, "dist/fx/skills/go-mode/references/model-values.json"), "utf8"));
  assert.deepEqual(values, { models: ["opus", "sonnet"], efforts: ["low", "high"] });
});
