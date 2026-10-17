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

### Triage

Decisions only. Nothing below has been acted on. Line numbers are at commit `04d410e`. Paths are relative to the repo root, and `pm/` means `skills/poteto-mode/`.

| Feature | Where | Coupling | Proposal |
| --- | --- | --- | --- |
| `deslop` (cursor-team-kit) | `pm/SKILL.md:28`, `pm/playbooks/opening-a-pr.md:9,34`, `skills/poteto-help/SKILL.md:109`, `README.md:254,258` | Low. A named pre-commit cleanup step. Nothing depends on its output. | Replace with "run the code-cleanup skill over the diff" as a token. Claude Code maps it to `simplify`. Partial cover, see Needs decision. |
| `control-cli` / `control-ui` (cursor-team-kit) | `pm/SKILL.md:30`, `pm/playbooks/bug-fix.md:7`, `perf-issue.md:5`, `prototype.md:11`, `runtime-forensics.md:5`, `visual-parity.md:8`, `skills/poteto-help/SKILL.md:109`, `README.md:255` | Low. Every playbook says "the matching control skill". None uses a control-* command. | Replace with "the project's `verify-*` skill if one exists, otherwise whatever browser or terminal driving skill the session has". Claude Code maps it to `claude-in-chrome` or the built-in browser for web UIs, and `run` to launch. Partial. Nothing covers Electron, CDP traces or TUI driving, so those fall back to the project harness (`create-verification-skill`). |
| Built-in `create-skill` | `pm/playbooks/authoring-a-skill.md:5`, `pm/SKILL.md:26`, `skills/reflect/SKILL.md:54-56`, `skills/reflect/references/synthesizer.md:17,44`, `skills/automate-me/SKILL.md:3,11,67,72,77,96,102`, `skills/poteto-help/SKILL.md:110`, `README.md:256` | Low. Authoring is handed off. Reflect expects a draft, test and iterate loop plus a description loop. Automate-me expects YAML rules and writing guidelines. | Replace with a `{{skill_authoring}}` token. Claude Code maps it to `skill-creator` (has both loops) plus `writing-for-agents` (prose rules). |
| Built-in `babysit` | `pm/SKILL.md:32`, `pm/playbooks/babysit.md:3`, `skills/poteto-help/SKILL.md:121`, `README.md:256` | Low. Only "don't route to Cursor's babysit" warnings. | Drop those clauses. The Babysit playbook stays. |
| Bugbot and the agentic security review (prose) | `pm/SKILL.md:32-33`, `pm/playbooks/babysit.md:7,8,20,21`, `pm/references/bugbot-triage.md` (whole file), `skills/reflect/references/synthesizer.md:27` | Low. The rubric and the babysit steps work for any review bot. Only the name is Cursor's. | Replace "Bugbot" and "agentic security review" with "review bot". Rename `bugbot-triage.md` to `review-bot-triage.md` in step 4. Keep its learned patterns. |
| Bugbot detection in the PR watcher | `pm/scripts/watch-pr/github.ts:329-349,392-404`, `policy.ts:53-57`, `render.ts:62-63`, `types.ts:68-69`, `github.test.ts` | Low. The watcher works without it. `isBugbot` matches author `cursor` and `CURSOR_AUTOMATION_ID`, so it never fires off Cursor. | Replace with a generic review-bot check. Needs decision. |
| Origin (Cursor's forge CLI) | `pm/playbooks/babysit.md:7,12,14,18,20,21`, `pm/playbooks/opening-a-pr.md:24,28,30`, `pm/scripts/worktree-audit.sh:50-57` | Low. Always behind `command -v origin`, with `gh` as the default. | Drop the Origin branches. Keep `gh` and the neutral "resolved forge" wording. |
| Built-in PR tool | `pm/playbooks/opening-a-pr.md:26,28,30` | Low. Written as "when the run provides one". Claude Code has none. | Drop the paragraph and the `draft: false` clause. Needs decision. |
| Cloud agents in swarm | `skills/swarm/SKILL.md:27,29` | Low. Cloud is the default spawn target, used for isolation. The skill works on local subagents. | Replace with background subagents. Writing workers get their own worktree. `cloud_base_branch` becomes "a worktree off that branch". Claude Code maps to `isolation: "worktree"`, and `isolation: "remote"` where enabled. Partial. Local workers share one machine, so timing races contend for CPU. Needs decision. |
| Cloud agents (mentions) | `pm/SKILL.md:140`, `pm/playbooks/session-pickup.md:5`, `skills/poteto-help/SKILL.md:76,136` | Low. Mentions only. | Stub: "a remote-session link, if the harness has one" in session pickup. In poteto-help, drop "as cloud agents" and keep "give each agent its own worktree". |
| Custom modes (option+enter) | `skills/poteto-help/SKILL.md:11,45,54-57,131`, `README.md:103` | Low. Help text on keeping `/poteto-mode` on across turns. | Replace with "start each task with `/poteto-mode`". Needs decision. |
| Cursor `/loop` | `pm/playbooks/autonomous-run.md:6`, `bug-fix.md:8`, `visual-parity.md:8`, `babysit.md:12`, `pm/SKILL.md:35,139`, `skills/poteto-help/SKILL.md:45,110,137`, `skills/poteto-help/references/prompting.md:41`, `recipes.md:43`, `README.md:105` | Low. A wake and rerun mechanism. Babysit wants "dynamic mode" with watcher output driving wakeups. | Replace with a `{{loop_command}}` token. Claude Code maps it to the `loop` skill. Omitting the interval self-paces, and background tasks wake the session on exit, which covers the watcher pattern. |
| Cursor Plan Mode | `skills/poteto-help/SKILL.md:123`, `README.md:262` | Low. A "works alongside" note. | Replace with "the harness's plan mode". Claude Code has one. |
| Cursor chat transcripts | `skills/recall/SKILL.md:15-21`, `skills/reflect/SKILL.md:13-18` and `references/{divergent,judgment,tooling}-reviewer.md`, `skills/show-me-your-work/SKILL.md:57,67`, `skills/automate-me/SKILL.md:29-31`, `pm/playbooks/eval.md:22`, `pm/playbooks/session-pickup.md:5`, `pm/playbooks/worktree-cleanup.md:3,5`, `pm/scripts/worktree-audit.sh:64-66,103-116` | High for recall, reflect, automate-me and the show-me-your-work audit. Transcripts are their core input. Low elsewhere. | Replace, not drop, since Claude Code has transcripts. Add a `{{transcripts_dir}}` token and one rule for finding the current transcript. Claude Code keeps them at `~/.claude/projects/<slug>/<session>.jsonl`, with subagents under `<session>/subagents/`. Partial. Its system prompt does not name the path, its slug keeps the leading `-` and turns `.` into `-`, and the JSONL shape differs. So recall's slug rule, reflect's `ls -t` globs and the audit script's slug line need rewriting. |
| Pinned chats and the sidebar | `pm/playbooks/worktree-cleanup.md:4-5` | Low. A safety cross-check before deleting worktrees. | Replace with "ask the user which sessions and worktrees are in use, and treat that set as final". Make the `.cursor/worktrees/myrepo/x` example on line 3 neutral. Claude Code has no pinned chats. |
| Cursor app caches | `pm/playbooks/worktree-cleanup.md:8` (`~/Library/Application Support/Cursor`) | Low. One tip in a list. | Drop the Cursor cache tip. Keep the rest of the list. |
| Grok Bot and Cursor automation webhooks | `skills/make-bot-ui/SKILL.md` (whole), `skills/poteto-help/SKILL.md:93`, `README.md:138` | High. Exists only to wire a Cursor routine (`update_state`, `api2.cursor.sh`, Cmd+Shift+I panel). | Drop the whole skill and its two routing rows. |
| Cursor MCP discovery | `skills/why/SKILL.md:35` | Low. A discovery step that names Cursor's `mcps/` directory. | Replace with "list the MCP tools available in this session". |
| Cursor app restart | `pm/SKILL.md:141` | Low. One phrase. | Replace "a Cursor restart" with "a harness restart". |
| Cursor install and distribution text | `skills/poteto-help/SKILL.md:13,37,45` | Low. Help text. Links point to `cursor/plugins`, install uses `/add-plugin` and the sidebar, and line 45 says "built for Cursor". | Replace links with our repo or local paths. Install steps become an `{{install}}` token. Drop the line 45 paragraph. |
| README in poteto's Cursor voice | `README.md:3-11,28-34,51,103-105,138,254-262,268` | Low per line, but most of the prose is Cursor pitch and install. | Replace with a lean gstack README. Needs decision. |

**Resolved decisions** (agreed with the user, these replace the recommendations below where they differ)

1. `deslop`, `control-ui` and `control-cli` are copied into gstack from `cursor-team-kit` at the same upstream commit and recorded in the README's Upstream section. They are not Cursor-specific. This replaces the `deslop` and `control-cli` / `control-ui` rows above.
2. The watcher treats a review comment from any bot account as a review bot. The pass count is kept.
3. The built-in PR tool paragraph and its draft and Origin clauses are dropped. Only Cursor has such a tool, and `gh` already covers it.
4. Swarm uses local background subagents, with a worktree each for writers. Remote isolation is an opt-in harness token.
5. Custom-mode text is dropped. Users start each task with `/go-mode`.
6. The README is rewritten as a short gstack README in 4b.

**Needs decision** (original recommendations)

1. **`deslop` replacement.** Recommend mapping to `simplify` now. Reason: `simplify` plus `no-comments` covers most of what deslop removes, and a gstack-owned `deslop` can come later if gaps show.
2. **Watcher Bugbot detection.** Recommend generalizing `isBugbot` to "review comment from a bot account" (GraphQL `__typename: Bot` or a `[bot]` login), with the pass count kept. Reason: it keeps the third-pass dismissal rule working for any review bot, such as a Claude review action.
3. **Built-in PR tool paragraph.** Recommend dropping it. Reason: no harness we target has one, and a harness that does can add it back as a token.
4. **Swarm default without cloud agents.** Recommend local background subagents with a worktree each for writers, and `remote` isolation as an opt-in harness token. Reason: worktrees are available everywhere, and timing races already need a quiet machine.
5. **Custom modes.** Recommend dropping the text and telling users to start each task with `/poteto-mode`. Reason: a Claude Code output style could keep it on, but that replaces part of the system prompt and is not worth it yet.
6. **README.** Recommend rewriting it in step 4 as a short gstack README: what it is, install, the skill and playbook tables, and the Upstream section. Reason: most of the current prose sells Cursor and documents Cursor install paths.

**Out of scope, handled in step 4/5**

- Model slugs and `~/.cursor/rules/pstack-models.mdc` in `skills/arena`, `interrogate`, `swarm`, `setup-pstack`, `pm/SKILL.md:94-96` and `skills/poteto-help/SKILL.md:27`.
- `.cursor/skills/` paths in `automate-me`, `create-verification-skill`, `maintain-verification-skill` and the reflect reviewer prompts.
- `agents/poteto-agent.md` searching `~/.cursor/plugins/` (already named in step 4).
- `plugin.json` homepage, and the `@cursor-skill/poteto-mode-tools` package name in `pm/scripts/package.json` and `bun.lock`.
- "readonly strips MCP" notes in `why` and `reflect`.
- False positives: `origin` as the git remote in `worktree-audit.sh` and `watch-pr`, `endCursor` GraphQL paging, "cursor location" in `why`, and "pinned version" or "pinned contract" in `blast-radius`, `refactoring` and the principle skills.

### 4. Neutral source and Claude Code build

Step 4 is large, so it runs as four sub-steps. Each one is done by its own subagent and committed before the next starts.

**4a. Rename.** Replace poteto and pstack with gstack names.
- `poteto-mode` becomes `go-mode`, `poteto-agent` becomes `go-agent`, `poteto-help` becomes `go-help` and `setup-pstack` becomes `setup-gstack`. Rename the folders, frontmatter `name` fields and every reference.
- Prose like "poteto's agent style" or "pstack skills" becomes gstack wording. Leave the README for 4b and the Upstream section as it is.

**4b. Act on the triage.** Done. Apply the decisions in the Triage table and the resolved list below. This includes dropping `make-bot-ui`, copying in `deslop`, `control-ui` and `control-cli`, and writing a short gstack README.

**4c. Neutral source.** Done. Rewrite the remaining Cursor names across skills, playbooks and agents into neutral language or tokens. Use upstream's translation doc as the checklist of names, then delete it.
- Fix `go-agent`. It searches `~/.cursor/plugins/` for the mode skill and uses `is_background`, which is Cursor frontmatter.
- Rewrite the transcript-reading skills (`recall`, `reflect`, `automate-me`, the `show-me-your-work` audit and `worktree-audit.sh`) against a transcripts token.

**4d. Build and install.** Build done, install not yet.
- Done: `harnesses/claude-code/` holds `tokens.md`, `plugin.json`, `harness.json` (manifest target, extra root files, Cursor deny list) and agent frontmatter overlays (`go-agent`: `background: true`, `color`; `comment-sicko`: `color`). Model and effort stay unset for step 5.
- Done: `scripts/build.mjs [harness...]` renders `dist/<harness>/` and fails with `file:line` on unknown or unrendered tokens, tokens in non-Markdown files, deny-listed Cursor names under `skills/` and `agents/`, and overlays without an agent. It warns on unused tokens. `dist/` is in `.gitignore`.
- Done: `.claude-plugin/marketplace.json` at the repo root, marketplace `gstack`, plugin `gstack` from `./dist/claude-code`. `claude plugin validate` passes on both.
- Remaining: build, then `claude plugin marketplace add <repo path>` and `claude plugin install gstack@gstack` (see `harnesses/claude-code/README.md`). Uninstall `pstack@cursor-plugins`.
- Remaining: check whether `/go-mode` works without the `gstack:` prefix. The docs say a plugin skill with a frontmatter `name` also answers to the bare name while no other command uses it.

Token values (claude-code). The build renders these in every Markdown file under `skills/` and `agents/`, references and playbooks included. It does not render scripts, so `worktree-audit.sh` takes its transcripts directory from `-t` or `GSTACK_TRANSCRIPTS_DIR`. Confidence is in brackets.

- `{{install}}` (go-help install step): build with `node scripts/build.mjs claude-code`, then `/plugin marketplace add <path-to-gstack>` and `/plugin install gstack@gstack`. [high]
- `{{loop_command}}`: the `/loop` skill. Used inline, as in "{{loop_command}} until done", so render it as `` `/loop` ``. [high]
- `{{skill_authoring}}`: `skill-creator`. Used as "the {{skill_authoring}} skill" and "{{skill_authoring}}'s writing guidelines". Claude Code doesn't ship it built in. Here it is installed as a user skill (`~/.claude/skills/skill-creator`) and through the `anthropic-skills` plugin. `writing-for-agents` covers the prose rules if `skill-creator`'s are too thin. [medium]
- `{{remote_isolation}}` (swarm, opt-in remote workers): the Agent tool's `isolation: "remote"`, where the account has it. [medium]
- `{{models_config}}`: `~/.claude/gstack-models.md`, the user override file from step 5. Used as a noun, as in "its entry in {{models_config}}", so render it as `` `~/.claude/gstack-models.md` ``. Step 5 may change the path. [medium]
- `{{project_skills_dir}}`: `.claude/skills`, no trailing slash. Used as `{{project_skills_dir}}/verify-<app>/`. [high]
- `{{user_skills_dir}}`: `~/.claude/skills`, no trailing slash. [high]
- `{{plugin_root}}` (go-agent, path to `skills/go-mode/SKILL.md` when the parent gave none): `${CLAUDE_PLUGIN_ROOT}`. The plugins manifest reference says Claude Code substitutes `${...}` variables anywhere in skill, command and agent Markdown bodies. Confirm in step 6. [high]
- `{{transcripts_dir}}`: `~/.claude/projects/<slug>`, no trailing slash. Used in prose and in `ls` globs such as `{{transcripts_dir}}/*.jsonl`. [high, checked against this repo's transcripts]
- `{{transcript_format}}` (a sentence or two that follows the dir): "`<slug>` is the workspace's absolute path with each `/` and `.` changed to `-`, so `/Users/you/proj` becomes `-Users-you-proj`. Each session is one `<session-id>.jsonl` file directly in that directory, and the newest is the current session. Subagent transcripts are in `<session-id>/subagents/agent-<id>.jsonl`. Each line is a JSON object with `type`, `timestamp`, `cwd`, `gitBranch` and `sessionId`. User and assistant turns have `type` `user` or `assistant` and their text in `message.content`, a string or a list of text, tool-use and tool-result blocks. Skip the other types." [high, checked against this repo's transcripts]

Agent names: skills say "spawn a `go-agent` subagent" or "a `comment-sicko` subagent" in prose, with no token. Claude Code lists them as `gstack:go-agent` and `gstack:comment-sicko`. Check in step 6 that the model maps the bare name. If it doesn't, add an agent-name token.

### 5. Model and effort config

- Start by agreeing on the default model and effort for each role in Claude Code. This is a short discussion before any edits.
- Define roles in neutral terms (code, hardest tasks, judgment and prose, explorer, reviewer panels and so on), keeping upstream's role list as the starting point.
- Each harness defines its default model and effort per role. For Claude Code, that's `model` (opus, sonnet, haiku, fable) and `effort`.
- Keep a user override file outside the plugin, such as `~/.claude/gstack-models.md`, so changing a model doesn't need a reinstall. Its path is a harness token.
- Rewrite `setup-pstack` to edit that file, or drop it if editing by hand is enough.

Model roles used by the source after 4c. Skills read each one from `{{models_config}}`. When a role has no entry, the skill uses the available model that best fits the description below. `inherit-parent` means the parent model. Step 5 sets the real defaults.

| Role | Used by | Description in the skills |
| --- | --- | --- |
| `feature, refactoring` | feature and refactoring playbooks | a fast code model |
| `bug-fix` | bug-fix playbook | a fast code model |
| `perf-issue` | perf-issue playbook | a fast code model |
| `hillclimb` | hillclimb playbook | a fast code model |
| `hardest tasks` | go-mode code delegates for the hardest changes | the strongest reasoning model |
| `judgment and prose` | go-mode prose and judgment delegates | the strongest reasoning model |
| `how explorer` | how | a fast code model |
| `how explainer` | how | the strongest reasoning model |
| `why investigators` | why | a fast code model |
| `why synthesizer` | why | the strongest reasoning model |
| `reflect tooling` | reflect | a fast code model, from a different family than the judgment role where possible |
| `reflect judgment, divergent, synthesizer` | reflect | the strongest reasoning model |
| `arena runners` (list) | arena | the strongest reasoning model plus a second, different model for diversity |
| `arena cross-judge pool` (list) | arena | the same two, preferring a family other than the parent's |
| `architect runners` (list) | architect, via arena | the strongest reasoning model plus a second, different model for diversity |
| `interrogate reviewers` (list) | interrogate | Reviewer A: the strongest reasoning model. Reviewer B: a second, different model for diversity |
| `swarm workers` | swarm, and go-mode verification | a fast code model |

`setup-gstack` still has Cursor-shaped slugs (Grok and Opus defaults, effort tokens inside slugs, the `auto` alias). Its paths and tool names are neutral. Rewrite the rest here.

### 6. Verify

- Build and install the plugin, then start a fresh Claude Code session.
- Run `poteto-mode` on a small real task. Check that it picks a playbook, that subagents get the configured model and effort, and that no skill hits a missing Cursor name.
- Run `interrogate` on a diff, and `how` on a question, to cover the panel and read-only subagent paths.

### 7. Merge overlapping skills (separate task)

Not part of the port. Some pstack skills overlap with skills we already have: `tdd`, prototype, `grilling`, `diagnosing-bugs`, `codebase-design`, `code-review` and `writing-for-agents`. For each overlap, take the useful parts of both and write a new skill, leaning towards the pstack version. Until then, keep the pstack versions as they are, and do the merges after steps 1 to 6.

## Open decisions

- Default model and effort per role. Settled at the start of step 5.
