import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DOCTOR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../skills/doctor/scripts/doctor.mjs");

const skill = (name, extra = "") => `---\nname: ${name}\ndescription: test\n${extra}---\n\n# ${name}\n`;

function write(root, files) {
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), typeof text === "string" ? text : JSON.stringify(text));
  }
}

function makeLocalMarketplaceInstall(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "doctor-test-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, {
    "repo/.claude-plugin/marketplace.json": { plugins: [{ name: "gstack", source: "./dist" }] },
    "repo/skills/teach/SKILL.md": skill("teach"),
    "repo/dist/.claude-plugin/plugin.json": { name: "gstack" },
    "repo/dist/skills/teach/SKILL.md": skill("teach"),
    "repo/dist/skills/grilling/SKILL.md": skill("grilling"),
    "repo/dist/skills/go-mode/references/model-roles.md":
      "## Roles\n\n| Role | Entries | Can drop | Used by | Description |\n|---|---|---|---|---|\n| `bug-fix` | one | yes | x | y |\n",
    "repo/dist/skills/go-mode/references/model-values.json": { models: ["opus", "sonnet"], efforts: ["low", "high"] },
    "plugins/installed.json": { plugins: { "gstack@gstack": [{ scope: "user", installPath: path.join(root, "cache/gstack") }] } },
    "plugins/marketplaces.json": { gstack: { source: { source: "directory" }, installLocation: path.join(root, "repo") } },
    "project/README.md": "",
  });
  const past = new Date(Date.now() - 60_000);
  fs.utimesSync(path.join(root, "repo/skills/teach/SKILL.md"), past, past);
  return root;
}

function doctor(root, extra = []) {
  const r = spawnSync(
    process.execPath,
    [
      DOCTOR,
      "--plugin-root", path.join(root, "repo/dist"),
      "--user-skills", path.join(root, "home/skills"),
      "--project-skills", ".claude/skills",
      "--plugin-records", path.join(root, "plugins/installed.json"),
      "--marketplace-records", path.join(root, "plugins/marketplaces.json"),
      "--settings", path.join(root, "settings.json"),
      "--models-config", path.join(root, "home/gstack-models.md"),
      ...extra,
    ],
    { cwd: path.join(root, "project"), encoding: "utf8" },
  );
  const rows = r.stdout
    .split("\n")
    .filter((l) => l.startsWith("| ") && !l.startsWith("| Check"))
    .map((l) => {
      const [check, severity, detail, fix] = l.slice(2, -2).split(" | ");
      return { check, severity, detail, fix };
    });
  return { status: r.status, rows, of: (check) => rows.filter((row) => row.check === check), stderr: r.stderr };
}

test("a healthy install reports every check ok", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  const r = doctor(root);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(
    r.rows.map((row) => [row.check, row.severity]),
    [["clash", "ok"], ["project copy", "ok"], ["lookalike", "ok"], ["install scope", "ok"], ["stale build", "ok"], ["model config", "ok"]],
  );
});

test("a user skill with a gstack name is an error, and a bare command runs it", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, { "home/skills/teach/SKILL.md": skill("teach") });
  const r = doctor(root);
  assert.equal(r.status, 1);
  const [clash] = r.of("clash");
  assert.equal(clash.severity, "error");
  assert.match(clash.detail, /user skill at .*home\/skills\/teach takes the bare `\/teach`/);
  assert.match(clash.fix, /Remove or rename/);
});

test("a symlinked clash names the target and offers to remove only the link", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, { "elsewhere/grilling/SKILL.md": skill("grilling") });
  fs.mkdirSync(path.join(root, "home/skills"), { recursive: true });
  fs.symlinkSync(path.join(root, "elsewhere/grilling"), path.join(root, "home/skills/grilling"));
  const [clash] = doctor(root).of("clash");
  assert.equal(clash.severity, "error");
  assert.match(clash.detail, /a symlink to .*elsewhere\/grilling/);
  assert.match(clash.fix, /Remove only the link .*home\/skills\/grilling\. Its target stays\./);
});

test("a user skill whose frontmatter name clashes is caught under another folder name", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, { "home/skills/my-teacher/SKILL.md": skill("teach") });
  assert.equal(doctor(root).of("clash")[0].severity, "error");
});

test("a project copy is a warning with no removal offered", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, { "project/.claude/skills/teach/SKILL.md": skill("teach") });
  const r = doctor(root);
  assert.equal(r.status, 0);
  const [copy] = r.of("project copy");
  assert.equal(copy.severity, "warn");
  assert.doesNotMatch(copy.fix, /[Rr]emove/);
  assert.equal(r.of("clash")[0].severity, "ok");
});

test("another enabled plugin with a gstack name is an error whose winner is unknown", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  const records = JSON.parse(fs.readFileSync(path.join(root, "plugins/installed.json"), "utf8"));
  records.plugins["other@mkt"] = [{ scope: "user", installPath: path.join(root, "cache/other") }];
  records.plugins["off@mkt"] = [{ scope: "user", installPath: path.join(root, "cache/off") }];
  records.plugins["elsewhere@mkt"] = [{ scope: "project", projectPath: path.join(root, "repo"), installPath: path.join(root, "cache/elsewhere") }];
  write(root, {
    "plugins/installed.json": records,
    "settings.json": { enabledPlugins: { "off@mkt": false } },
    "cache/other/skills/teach/SKILL.md": skill("teach"),
    "cache/off/skills/teach/SKILL.md": skill("teach"),
    "cache/elsewhere/skills/teach/SKILL.md": skill("teach"),
  });
  const clashes = doctor(root).of("clash");
  assert.equal(clashes.length, 1);
  assert.match(clashes[0].detail, /Plugin other@mkt also has `teach`.*unknown/);
  assert.match(clashes[0].fix, /\/gstack:teach/);
});

test("a model-invocable skill with a close name is a lookalike, and a disabled one is not", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, {
    "home/skills/grill-me/SKILL.md": skill("grill-me"),
    "home/skills/teachx/SKILL.md": skill("teachx", "disable-model-invocation: true\n"),
    "home/skills/deploy/SKILL.md": skill("deploy"),
  });
  const r = doctor(root);
  const looks = r.of("lookalike");
  assert.equal(looks.length, 1);
  assert.equal(looks[0].severity, "warn");
  assert.match(looks[0].detail, /`grill-me`.*close to gstack's `grilling`/);
  assert.equal(r.status, 0);
});

test("a bad model config row is an error with its line", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, {
    "home/gstack-models.md": "# overrides\n\n| Role | Model | Effort |\n|---|---|---|\n| `bug-fix` | gpt | high |\n| `nope` | opus | low |\n",
  });
  const r = doctor(root);
  assert.equal(r.status, 1);
  const details = r.of("model config").map((row) => `${row.severity} ${row.detail}`);
  assert.equal(details.length, 2);
  assert.match(details[0], /^error .*gstack-models\.md:5: model "gpt" is not one of opus, sonnet, inherit-parent/);
  assert.match(details[1], /^error .*gstack-models\.md:6: unknown role "nope"/);
});

test("source newer than the build is a stale build warning with the rebuild command", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  const future = new Date(Date.now() + 60_000);
  fs.utimesSync(path.join(root, "repo/skills/teach/SKILL.md"), future, future);
  const [stale] = doctor(root).of("stale build");
  assert.equal(stale.severity, "warn");
  assert.match(stale.detail, /before .*repo\/skills\/teach\/SKILL\.md changed/);
  assert.match(stale.fix, /`node scripts\/build\.mjs dist` in .*repo, then reload plugins/);
});

test("a plugin not built from a local folder skips the stale build check, and a project install warns", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, {
    "plugins/marketplaces.json": { gstack: { source: { source: "github" }, installLocation: path.join(root, "mkt") } },
    "plugins/installed.json": { plugins: { "gstack@gstack": [{ scope: "project", projectPath: path.join(root, "project"), installPath: path.join(root, "repo/dist") }] } },
  });
  const r = doctor(root);
  assert.equal(r.of("stale build")[0].severity, "n/a");
  const [scope] = r.of("install scope");
  assert.equal(scope.severity, "warn");
  assert.match(scope.detail, /project scope for .*project/);
});
