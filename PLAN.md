# Plan: fork pstack into gstack

> **Temporary.** Delete this file once the goal below is met. Anything worth keeping (such as the upstream commit) moves into `README.md` first.

## Goal

Take a one-time snapshot of pstack from `cursor/plugins` and turn it into our own skill set. It should run natively in Claude Code first, and adding another harness later should be straightforward. We will adapt it to our own workflows over time. Staying in sync with upstream is not a goal.

Done means:

- gstack installs in Claude Code as a plugin, and no skill depends on runtime translation of Cursor names.
- Each role has a model and an effort level we can configure in Claude Code.
- Harness-specific details live in one place, so adding a harness means adding a mapping, not rewriting skills.
- No skill depends on a Cursor-only feature. Each one has been dropped, replaced or stubbed on purpose.
- `README.md` records the upstream commit we forked from.

## Context

- Upstream source: https://github.com/cursor/plugins/tree/182f2ce414e83224915c190d2f63239c1608d0a5/pstack (commit `182f2ce`, 2026-10-16). A local clone is at `/Users/gregogun/webdev/ai/cursor/plugins`.
- Upstream's Claude Code support is a generated copy of the Cursor skills, plus a doc that each skill must read every session to translate Cursor names (`docs/harness/claude-code.md`). That doc is useful as a checklist of the names to convert. We will not copy the approach.
- Upstream's model config is an always-applied Cursor rule, `~/.cursor/rules/pstack-models.mdc`. Claude Code never loads it, so `setup-pstack` does nothing there and any Grok or GPT role falls back to the session model.
- Skills such as `interrogate`, `arena`, `architect` and `reflect` assume reviewers from different model families. In Claude Code every model is a Claude model, so these skills give weaker cross-checks. We can accept that, or later add a reviewer from another vendor through its CLI.

## Working rules

- One step at a time. Each step is done by a single subagent and reviewed before the next one starts.
- Each step ends in one or more commits, using Conventional Commits, before the next step begins.

## Approach: keep the source harness-neutral, render one tree per harness

Upstream writes skills in Cursor's terms and translates them for other harnesses at runtime. We do the reverse.

- **Source skills use neutral language.** They say "spawn a read-only subagent" or "ask the user", not `Task` or `AskUserQuestion`. Models already map plain descriptions like these to the right tool.
- **Specifics that can't be written neutrally become build-time tokens.** These are config paths, agent names, model defaults and skill invocation syntax, for example `{{models_config}}`. Keep the token set small.
- **Each harness gets a folder,** `harnesses/<name>/`. It holds the token values, the manifest template, agent frontmatter and default models.
- **A small build script renders `dist/<harness>/`** from the source and that harness's folder. It also fails if a skill uses a token the harness doesn't define, or still contains a Cursor name.

Only the Claude Code harness gets built now. Adding a harness later means adding a folder, not touching the skills.

## Steps

### 1. Snapshot

- Copy `pstack/` from the upstream source into this repo. Don't copy the generated `harness/pstack/claude-code` tree.
- Run `git init`. Don't import upstream history. The recorded commit is enough to look it up.
- Add an "Upstream" section to `README.md` linking to the upstream source at commit `182f2ce` on GitHub.

### 2. Prune

- Delete upstream's Cursor packaging and translation pieces: `.cursor-plugin/`, `docs/harness/claude-code.md` (after step 4 has used it as a checklist) and the generator.
- Delete `automations/benny/`, which only runs on Cursor.
- Delete the playbooks we won't use: orchestrate, autopilot-full, autopilot-stack and shipping. Keep worktree-cleanup (see step 3).
- Delete the multi-phase plan playbook and `check-plan.mjs`. They only fed the deleted autopilot and orchestrate playbooks.
- Delete `docs/guide/` and `assets/logo.png`. The guide stays readable upstream at `182f2ce`. If we need a guide later, write a lean one for gstack.

### 3. Triage Cursor dependencies

These are `deslop`, `control-cli` and `control-ui` (from `cursor-team-kit`), the built-in `create-skill`, Bugbot, Origin, cloud agents, custom modes and `/loop`. About 51 files mention one of them.

- For each, list the files it appears in and judge how much the file relies on it.
- **Heavily coupled:** drop the skill, playbook or section.
- **Lightly coupled:** replace it with a Claude Code equivalent (for example `isolation: "worktree"` for cloud agents, or the `/loop` skill), or stub it out.
- Record each decision in a table in this file before acting on it.
- Worktree-cleanup is known to be lightly coupled. The git worktree audit is generic. Only the transcript directory in `scripts/worktree-audit.sh`, the Cursor pinned-chat check and the Cursor cache-cleaning tips are Cursor-specific. Adapt it rather than drop it.

### 4. Neutral source and Claude Code build

- Rewrite Cursor names across the skills, playbooks and agents into neutral language or tokens. Use upstream's translation doc as the checklist of names.
- Create `harnesses/claude-code/` with the token values, the plugin manifest and agent frontmatter.
- Write the build script and the checks described in Approach.
- Fix `poteto-agent`. It searches `~/.cursor/plugins/` for `poteto-mode` and uses `is_background`, which is Cursor frontmatter.
- The plugin is named `gstack`. Don't commit `dist/` for now (add it to `.gitignore`). Install from the local path.
- Add a local `marketplace.json`, install with `/plugin marketplace add`, and uninstall `pstack@cursor-plugins`.

### 5. Model and effort config

- Start by agreeing on the default model and effort for each role in Claude Code. This is a short discussion before any edits.
- Define roles in neutral terms (code, hardest tasks, judgment and prose, explorer, reviewer panels and so on), keeping upstream's role list as the starting point.
- Each harness defines its default model and effort per role. For Claude Code, that's `model` (opus, sonnet, haiku, fable) and `effort`.
- Keep a user override file outside the plugin, such as `~/.claude/gstack-models.md`, so changing a model doesn't need a reinstall. Its path is a harness token.
- Rewrite `setup-pstack` to edit that file, or drop it if editing by hand is enough.

### 6. Verify

- Build and install the plugin, then start a fresh Claude Code session.
- Run `poteto-mode` on a small real task. Check that it picks a playbook, that subagents get the configured model and effort, and that no skill hits a missing Cursor name.
- Run `interrogate` on a diff, and `how` on a question, to cover the panel and read-only subagent paths.

### 7. Merge overlapping skills (separate task)

Not part of the port. Some pstack skills overlap with skills we already have: `tdd`, prototype, `grilling`, `diagnosing-bugs`, `codebase-design`, `code-review` and `writing-for-agents`. For each overlap, take the useful parts of both and write a new skill, leaning towards the pstack version. Until then, keep the pstack versions as they are, and do the merges after steps 1 to 6.

## Open decisions

- Default model and effort per role. Settled at the start of step 5.
