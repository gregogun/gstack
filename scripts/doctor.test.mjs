import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCTOR = path.join(REPO, "skills/doctor/scripts/doctor.mjs");
const COPIED = ["scripts/build.mjs", "skills/go-mode/scripts/model-table.mjs"];

const skill = (name, extra = "") => `---\nname: ${name}\ndescription: test\n${extra}---\n\n# ${name}\n`;
const past = () => new Date(Date.now() - 60_000);
const future = () => new Date(Date.now() + 60_000);

function write(root, files) {
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), typeof text === "string" ? text : JSON.stringify(text));
  }
}

function touch(file, when) {
  fs.utimesSync(file, when, when);
}

function makeLocalMarketplaceInstall(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "doctor-test-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, {
    ...Object.fromEntries(COPIED.map((f) => [`repo/${f}`, fs.readFileSync(path.join(REPO, f), "utf8")])),
    "repo/.claude-plugin/marketplace.json": { plugins: [{ name: "gstack", source: "./dist/fx" }] },
    "repo/LICENSE": "MIT\n",
    "repo/agents/.keep": "",
    "repo/skills/teach/SKILL.md": skill("teach"),
    "repo/skills/grilling/SKILL.md": skill("grilling"),
    "repo/skills/why/SKILL.md": skill("why"),
    "repo/skills/go-mode/references/model-roles.md":
      "## Roles\n\n| Role | Entries | Can drop | Used by | Description |\n|---|---|---|---|---|\n| `bug-fix` | one | yes | x | y |\n",
    "repo/harnesses/fx/harness.json": {
      manifest: { source: "plugin.json", target: ".claude-plugin/plugin.json" },
      copy: ["LICENSE"],
      models: ["opus", "sonnet"],
      efforts: ["low", "high"],
    },
    "repo/harnesses/fx/plugin.json": { name: "gstack" },
    "repo/harnesses/fx/models.md": "Drop order: high, low\n\n| Role | Model | Effort |\n|---|---|---|\n| `bug-fix` | opus | high |\n",
    "repo/harnesses/fx/README.md": "# fx\n",
    "plugins/installed.json": { plugins: { "gstack@gstack": [{ scope: "user", installPath: path.join(root, "cache/gstack") }] } },
    "plugins/marketplaces.json": { gstack: { source: { source: "directory" }, installLocation: path.join(root, "repo") } },
    "project/README.md": "",
  });
  for (const file of fs.readdirSync(path.join(root, "repo"), { recursive: true })) touch(path.join(root, "repo", file), past());
  const built = spawnSync(process.execPath, [path.join(root, "repo/scripts/build.mjs"), "fx"], { encoding: "utf8" });
  assert.equal(built.status, 0, built.stderr);
  return root;
}

function doctor(root, extra = []) {
  const r = spawnSync(
    process.execPath,
    [
      DOCTOR,
      "--plugin-root", path.join(root, "repo/dist/fx"),
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

function addPlugin(root, id, record, files) {
  const records = JSON.parse(fs.readFileSync(path.join(root, "plugins/installed.json"), "utf8"));
  records.plugins[id] = [record];
  write(root, { "plugins/installed.json": records, ...files });
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
  assert.match(copy.detail, /takes the bare `\/teach`/);
  assert.doesNotMatch(copy.fix, /[Rr]emove/);
  assert.equal(r.of("clash")[0].severity, "ok");
});

test("a project copy says a user skill with the same name wins the bare command", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, { "project/.claude/skills/teach/SKILL.md": skill("teach"), "home/skills/teach/SKILL.md": skill("teach") });
  const [copy] = doctor(root).of("project copy");
  assert.match(copy.detail, /but the user skill at .*home\/skills\/teach takes the bare name first/);
});

test("a project skills folder that is the user skills folder is not reported twice", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, { "home/skills/teach/SKILL.md": skill("teach") });
  const r = doctor(root, ["--project-skills", path.join(root, "home/skills")]);
  assert.equal(r.of("clash").length, 1);
  assert.equal(r.of("project copy")[0].severity, "ok");
});

test("another enabled plugin gets one error row listing every name it shares", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  addPlugin(root, "other@mkt", { scope: "user", installPath: path.join(root, "cache/other") }, {
    "cache/other/skills/teach/SKILL.md": skill("teach"),
    "cache/other/skills/grilling/SKILL.md": skill("grilling"),
    "cache/other/skills/deploy/SKILL.md": skill("deploy"),
  });
  addPlugin(root, "off@mkt", { scope: "user", installPath: path.join(root, "cache/off") }, {
    "settings.json": { enabledPlugins: { "off@mkt": false } },
    "cache/off/skills/teach/SKILL.md": skill("teach"),
  });
  addPlugin(root, "elsewhere@mkt", { scope: "project", projectPath: path.join(root, "repo"), installPath: path.join(root, "cache/elsewhere") }, {
    "cache/elsewhere/skills/teach/SKILL.md": skill("teach"),
  });
  const r = doctor(root);
  const clashes = r.of("clash");
  assert.equal(clashes.length, 1);
  assert.match(clashes[0].detail, /Plugin other@mkt .* has 2 of gstack's skill names: `grilling`, `teach`\. .*unknown/);
  assert.match(clashes[0].fix, /Disable other@mkt/);
  assert.equal(r.status, 1);
});

test("a second gstack install from another marketplace is a clash, not gstack itself", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  addPlugin(root, "gstack@upstream", { scope: "user", installPath: path.join(root, "cache/gstack-upstream") }, {
    "cache/gstack-upstream/.claude-plugin/plugin.json": { name: "gstack" },
    "cache/gstack-upstream/skills/teach/SKILL.md": skill("teach"),
  });
  const r = doctor(root);
  assert.match(r.of("clash")[0].detail, /Plugin gstack@upstream .*`teach`/);
  assert.equal(r.of("install scope")[0].severity, "ok");
});

test("a model-invocable skill with a close name is a lookalike, and a disabled or short one is not", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, {
    "home/skills/grill-me/SKILL.md": skill("grill-me"),
    "home/skills/teachx/SKILL.md": skill("teachx", 'disable-model-invocation: "true" # only when called\n'),
    "home/skills/who/SKILL.md": skill("who"),
    "home/skills/deploy/SKILL.md": skill("deploy"),
  });
  const r = doctor(root);
  const looks = r.of("lookalike");
  assert.equal(looks.length, 1);
  assert.equal(looks[0].severity, "warn");
  assert.match(looks[0].detail, /`grill-me`.*close to gstack's `grilling`/);
  assert.match(looks[0].fix, /add `disable-model-invocation: true`/);
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

test("a skill source newer than the build is a stale build warning with the rebuild command", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  touch(path.join(root, "repo/skills/teach/SKILL.md"), future());
  const [stale] = doctor(root).of("stale build");
  assert.equal(stale.severity, "warn");
  assert.match(stale.detail, /before .*repo\/skills\/teach\/SKILL\.md changed/);
  assert.match(stale.fix, /^Run `node scripts\/build\.mjs fx` in .*repo\.$/);
});

test("a stale build counts the files the build copies, and not the harness README it never reads", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  touch(path.join(root, "repo/harnesses/fx/README.md"), future());
  assert.equal(doctor(root).of("stale build")[0].severity, "ok");
  touch(path.join(root, "repo/LICENSE"), future());
  assert.match(doctor(root).of("stale build")[0].detail, /before .*repo\/LICENSE changed/);
});

test("a build with no inputs record is a stale build warning", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  fs.rmSync(path.join(root, "repo/dist/fx/build-inputs.json"));
  const [stale] = doctor(root).of("stale build");
  assert.equal(stale.severity, "warn");
  assert.match(stale.fix, /`node scripts\/build\.mjs fx`/);
});

test("a plugin not built from a local folder skips the stale build check, and a project install warns", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, {
    "plugins/marketplaces.json": { gstack: { source: { source: "github" }, installLocation: path.join(root, "mkt") } },
    "plugins/installed.json": { plugins: { "gstack@gstack": [{ scope: "project", projectPath: path.join(root, "project"), installPath: path.join(root, "repo/dist/fx") }] } },
  });
  const r = doctor(root);
  assert.equal(r.of("stale build")[0].severity, "n/a");
  const [scope] = r.of("install scope");
  assert.equal(scope.severity, "warn");
  assert.match(scope.detail, /project scope for .*project/);
});

test("a malformed settings file stops only the checks that read it, and exits 2", (t) => {
  const root = makeLocalMarketplaceInstall(t);
  write(root, { "settings.json": "{bad" });
  const r = doctor(root);
  assert.equal(r.status, 2);
  assert.match(r.of("clash")[0].detail, /^The check stopped: .*settings\.json is not valid JSON/);
  assert.equal(r.of("model config")[0].severity, "ok");
  assert.equal(r.rows.length, 6);
});

test("an unknown option prints the usage and exits 2", () => {
  const r = spawnSync(process.execPath, [DOCTOR, "--plugin-root", REPO, "--bogus"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown option '--bogus'/);
  assert.match(r.stderr, /^usage: doctor\.mjs --plugin-root/m);
});

test("no skill sends users to the bare /doctor, which is the harness's own command", () => {
  const skills = path.join(REPO, "skills");
  const bare = [];
  for (const file of fs.readdirSync(skills, { recursive: true })) {
    if (!file.endsWith(".md")) continue;
    fs.readFileSync(path.join(skills, file), "utf8").split("\n").forEach((line, i) => {
      if (/(?<![\w:./-])\/doctor\b/.test(line)) bare.push(`skills/${file}:${i + 1}`);
    });
  }
  assert.deepEqual(bare, []);
});
