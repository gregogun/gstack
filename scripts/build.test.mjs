import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUILD = path.join(path.dirname(fileURLToPath(import.meta.url)), "build.mjs");

function makeFixture(skillBody) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "build-test-"));
  const files = {
    "scripts/build.mjs": fs.readFileSync(BUILD, "utf8"),
    "skills/go-mode/references/model-roles.md": "## Roles\n\n| Role | Entries | Use | Notes |\n| --- | --- | --- | --- |\n| `only role` | one | x | y |\n",
    "skills/demo/SKILL.md": skillBody,
    "harnesses/fx/harness.json": "{}",
    "harnesses/fx/models.md": "| Role | Model | Effort |\n| --- | --- | --- |\n| `only role` | opus | high |\n",
    "harnesses/fx/tokens.md": "## known_token\n\nKNOWN-VALUE\n",
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
