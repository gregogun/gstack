import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** GSTACK_HOME, else a gstack folder in the Claude Code config folder. */
export function stateDir(env = process.env) {
  if (env.GSTACK_HOME) return path.resolve(env.GSTACK_HOME);
  return path.join(env.CLAUDE_CONFIG_DIR ? path.resolve(env.CLAUDE_CONFIG_DIR) : path.join(os.homedir(), ".claude"), "gstack");
}

/** Creates runs/<UTC stamp>-<slug>/ and returns its path. The stamp has no colons, which Windows forbids in names. */
export function newRunDir(slug, env = process.env, now = new Date()) {
  const stamp = `${now.toISOString().slice(0, 19).replaceAll(":", "")}Z`;
  const name = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "run";
  const dir = path.join(stateDir(env), "runs", `${stamp}-${name}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
