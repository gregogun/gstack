# Claude Code harness

This folder holds what the Claude Code build of gstack needs beyond the shared source in `skills/` and `agents/`:

- `tokens.md`: the value of each `{{token}}` in the source Markdown.
- `plugin.json`: the plugin manifest. The build writes it to `.claude-plugin/plugin.json`.
- `models.md`: the default model and effort for each model role. The build ships it as `skills/go-mode/references/model-defaults.md`. See [Models](#models).
- `agents/<name>.yml`: frontmatter lines the build adds to `agents/<name>.md`. They never set `model` or `effort`: the skill that spawns an agent sets both from the agent's role.
- `harness.json`: where the manifest goes, the extra root files to copy, the deny list of Cursor names the build rejects, the `model` and `effort` values `models.md` may use, and the `skillPrefix` the build puts on skill mentions (see [Names](#names)).

## Build

From the repo root, with Node 18 or later (or bun):

```sh
node scripts/build.mjs claude-code
```

This writes `dist/claude-code/`. The build fails, listing `file:line`, on an unknown or unrendered token, a Cursor name left in the rendered Markdown, or a `models.md` that is missing, misses a role, names an unknown role, or uses a model or effort outside `harness.json`. `dist/` is not committed.

The build also writes the `model` and `effort` values from `harness.json` to `skills/go-mode/references/model-values.json`, so `/gstack:doctor` checks the override file against the same lists.

## Install

The repo root is a local marketplace named `gstack` (`.claude-plugin/marketplace.json`). Its one plugin, also `gstack`, points at `./dist/claude-code`, so build first.

```sh
claude plugin marketplace add /path/to/gstack
claude plugin install gstack@gstack
```

Inside a session, `/plugin marketplace add /path/to/gstack` and `/plugin install gstack@gstack` do the same. Start a new session afterwards.

Claude Code loads a plugin from a local-directory marketplace in place, so after a source change rerun the build and run `/reload-plugins` or start a new session. No reinstall or version bump is needed.

If a gstack command runs a different skill, or a source change doesn't show up, run `/gstack:doctor`. Type the full name, because the bare `/doctor` is Claude Code's own command. It finds other skills with gstack's names, a build older than the files it reads, and a non-user install scope. Each build writes `build-inputs.json` to `dist/claude-code/`, which lists those files. The doctor script reads Claude Code's plugin records, so another harness needs its own readers.

To remove it, run `claude plugin marketplace remove gstack`, which also uninstalls the plugin.

## Models

Every subagent a skill spawns runs under a model role. The roles, and the rule for picking a spawn's model and effort, are in [`skills/go-mode/references/model-roles.md`](../../skills/go-mode/references/model-roles.md). For each spawn the skill looks the role up in the user's override file, `~/.claude/gstack-models.md`, then falls back to the shipped defaults from `models.md`. It passes both to the Agent tool's `model` and `effort`. `inherit-parent` leaves both unset, so the subagent runs on the parent's model and effort.

The override file lives outside the plugin, so a change applies at the next spawn with no rebuild or reinstall. It has the same shape as `models.md`, with rows only for the roles you change. Any row for a role replaces all of its default rows, so list a list role's entries in full. Deleting a role's rows resets it. For example, to run swarm workers on Sonnet and give interrogate a third reviewer:

```markdown
| Role | Model | Effort |
|---|---|---|
| `swarm workers` | sonnet | medium |
| `interrogate reviewers` | opus | high |
| `interrogate reviewers` | sonnet | high |
| `interrogate reviewers` | haiku | high |
```

`/setup-gstack` shows the current table and writes this file for you. Editing it by hand works too.

## Names

Skills are namespaced by the plugin, so `/go-mode` is also `/gstack:go-mode`. The bare name works while no other command uses it. A user skill of the same name takes the bare name, so the build sets `skillPrefix` in `harness.json` and writes every `` `/<skill>` `` mention in the rendered Markdown as `` `/gstack:<skill>` ``. A skill that tells the agent to run another gstack skill then always gets gstack's copy. Agents load as `gstack:go-agent` and `gstack:comment-sicko`.
