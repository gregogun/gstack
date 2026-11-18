#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const FORK_COMMIT = "182f2ce414e83224915c190d2f63239c1608d0a5";
export const RENAMES = { "poteto-mode": "go-mode", "poteto-help": "go-help", "setup-pstack": "setup-gstack" };
const TEAM_KIT_SKILLS = ["deslop", "control-cli", "control-ui"];
const ROOTS = [
  { dir: "pstack/skills", keep: () => true },
  { dir: "cursor-team-kit/skills", keep: (name) => TEAM_KIT_SKILLS.includes(name) },
];
const PATHSPEC = ["pstack", ...TEAM_KIT_SKILLS.map((name) => `cursor-team-kit/skills/${name}`)];

function fail(message) {
  process.stderr.write(`inventory: ${message}\n`);
  process.exit(2);
}

export function inventory({ upstream, gstack, since = FORK_COMMIT }) {
  const git = (...args) => execFileSync("git", ["-C", upstream, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const lines = (text) => text.split("\n").filter(Boolean);
  const dirsAt = (ref, dir) => {
    try {
      return lines(git("ls-tree", "-d", "--name-only", `${ref}:${dir}`));
    } catch {
      return [];
    }
  };

  try {
    git("cat-file", "-e", `${since}^{commit}`);
  } catch {
    throw new Error(`commit ${since} is not in ${upstream}; clone without --depth so history back to the fork is present`);
  }

  const head = { sha: git("rev-parse", "HEAD").trim(), date: git("log", "-1", "--format=%cs").trim() };
  const commits = lines(git("log", "--format=%h%x09%cs%x09%s", `${since}..HEAD`, "--", ...PATHSPEC)).map((l) => {
    const [sha, date, ...subject] = l.split("\t");
    return { sha, date, subject: subject.join("\t") };
  });

  const stats = new Map();
  const other = new Map();
  for (const l of lines(git("diff", "--numstat", "--no-renames", since, "HEAD", "--", ...PATHSPEC))) {
    const [ins, del, file] = l.split("\t");
    const add = (map, key) => {
      const s = map.get(key) ?? { files: 0, insertions: 0, deletions: 0 };
      s.files += 1;
      s.insertions += ins === "-" ? 0 : Number(ins);
      s.deletions += del === "-" ? 0 : Number(del);
      map.set(key, s);
    };
    const root = ROOTS.find((r) => file.startsWith(`${r.dir}/`));
    const rest = root && file.slice(root.dir.length + 1);
    if (rest?.includes("/")) add(stats, `${root.dir}/${rest.split("/")[0]}`);
    else add(other, file.split("/").slice(0, 2).join("/"));
  }

  const gstackDirs = fs.readdirSync(gstack).filter((d) => fs.existsSync(path.join(gstack, d, "SKILL.md")));
  const matched = new Set();
  const skills = [];
  let unchanged = 0;
  for (const root of ROOTS) {
    const before = new Set(dirsAt(since, root.dir));
    const after = new Set(dirsAt("HEAD", root.dir));
    for (const name of [...new Set([...before, ...after])].filter(root.keep).sort()) {
      const mapped = RENAMES[name] ?? name;
      const counterpart = gstackDirs.includes(mapped) ? mapped : null;
      if (counterpart) matched.add(counterpart);
      const s = stats.get(`${root.dir}/${name}`);
      const status = !before.has(name) ? "added" : !after.has(name) ? "removed" : s ? "changed" : "unchanged";
      if (status === "unchanged") {
        unchanged += 1;
        continue;
      }
      skills.push({ upstream: `${root.dir}/${name}`, gstack: counterpart, status, ...(s ?? { files: 0, insertions: 0, deletions: 0 }) });
    }
  }

  return {
    upstream: { repo: "cursor/plugins", head, since },
    commits,
    skills,
    unchanged,
    other: [...other].map(([group, s]) => ({ group, ...s })).sort((a, b) => a.group.localeCompare(b.group)),
    gstackOnly: gstackDirs.filter((d) => !matched.has(d)).sort(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  let values;
  try {
    ({ values } = parseArgs({ options: { upstream: { type: "string" }, gstack: { type: "string" }, since: { type: "string" } } }));
  } catch (e) {
    fail(e.message);
  }
  if (!values.upstream || !values.gstack) fail("--upstream and --gstack are required");
  try {
    process.stdout.write(`${JSON.stringify(inventory(values), null, 2)}\n`);
  } catch (e) {
    fail(e.message);
  }
}
