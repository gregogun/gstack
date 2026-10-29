import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SLUG_MAX = 40;

/**
 * GSTACK_HOME, else a gstack folder in the Claude Code config folder.
 * A scheduled job runs with no shell and an arbitrary working folder, so a relative or `~` path would land somewhere unexpected.
 */
export function stateDir(env = process.env) {
  const absolute = (name) => {
    const value = env[name].replace(/^~(?=$|[\\/])/, os.homedir());
    if (!path.isAbsolute(value)) throw new Error(`${name} must be an absolute path, not "${env[name]}"`);
    return path.normalize(value);
  };
  if (env.GSTACK_HOME) return absolute("GSTACK_HOME");
  return path.join(env.CLAUDE_CONFIG_DIR ? absolute("CLAUDE_CONFIG_DIR") : path.join(os.homedir(), ".claude"), "gstack");
}

/** Creates runs/<UTC stamp>-<slug>/ and returns its path. The stamp has no colons, which Windows forbids in names. */
export function newRunDir(slug, env = process.env, now = new Date()) {
  const stamp = `${now.toISOString().slice(0, 19).replaceAll(":", "")}Z`;
  const name = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, SLUG_MAX).replace(/^-+|-+$/g, "") || "run";
  const runs = path.join(stateDir(env), "runs");
  fs.mkdirSync(runs, { recursive: true });
  for (let n = 1; ; n++) {
    const dir = path.join(runs, `${stamp}-${name}${n > 1 ? `-${n}` : ""}`);
    try {
      fs.mkdirSync(dir);
      return dir;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
  }
}
