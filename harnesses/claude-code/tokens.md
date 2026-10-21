# Claude Code token values

The build replaces each `{{name}}` in the Markdown under `skills/` and `agents/` with the body of the `## name` section below. Text before the first section and HTML comments are ignored. Each value is spliced into a sentence, so keep it to one paragraph with no trailing period unless the sentence around it ends there.

## install

<!-- Used as "Install gstack: {{install}}". The marketplace and plugin are both named gstack (see README.md in this folder). -->

clone the gstack repo, run `node scripts/build.mjs claude-code` in it, then run `/plugin marketplace add <path-to-gstack>` and `/plugin install gstack@gstack` in Claude Code and start a new session. Rerun the build and `/reload-plugins` after each change.

## loop_command

<!-- Used inline, as in "{{loop_command}} until done". -->

`/loop`

## skill_authoring

<!-- Used as "the {{skill_authoring}} skill" and "{{skill_authoring}}'s writing guidelines". Not built in: installed as a user skill or through the anthropic-skills plugin. -->

skill-creator

## remote_isolation

<!-- Swarm's opt-in remote workers. -->

the Agent tool's `isolation: "remote"`, where the account has it

## models_config

<!-- The user's model override file. Used as a noun, as in "look up the role in {{models_config}}". Outside the plugin, so edits need no rebuild. -->

`~/.claude/gstack-models.md`

## project_skills_dir

<!-- Used as {{project_skills_dir}}/verify-<app>/. No trailing slash. -->

.claude/skills

## user_skills_dir

<!-- No trailing slash. -->

~/.claude/skills

## plugin_root

<!-- Claude Code substitutes ${CLAUDE_PLUGIN_ROOT} inline in skill, command and agent Markdown bodies (plugins manifest reference, "Where each variable resolves"). -->

${CLAUDE_PLUGIN_ROOT}

## transcripts_dir

<!-- Used in prose and in ls globs such as {{transcripts_dir}}/*.jsonl. No trailing slash. -->

~/.claude/projects/<slug>

## transcript_format

<!-- A sentence or two that follows the directory. -->

`<slug>` is the workspace's absolute path with each `/` and `.` changed to `-`, so `/Users/you/proj` becomes `-Users-you-proj`. Each session is one `<session-id>.jsonl` file directly in that directory, and the newest is the current session. Subagent transcripts are in `<session-id>/subagents/agent-<id>.jsonl`. Each line is a JSON object with `type`, `timestamp`, `cwd`, `gitBranch` and `sessionId`. User and assistant turns have `type` `user` or `assistant` and their text in `message.content`, a string or a list of text, tool-use and tool-result blocks. Skip the other types.

## plugin_records

<!-- Used as a doctor script argument. Claude Code's record of each plugin install: scope, install path and, for project or local scope, the project path. -->

`~/.claude/plugins/installed_plugins.json`

## marketplace_records

<!-- Used as a doctor script argument. Claude Code's record of each added marketplace, including whether it was added from a local directory. -->

`~/.claude/plugins/known_marketplaces.json`

## plugin_settings

<!-- Used as "pass --settings once for each of {{plugin_settings}}". The settings files whose enabledPlugins decide which plugins are on, lowest precedence first. Relative paths are from the project root. -->

`~/.claude/settings.json`, `.claude/settings.json` and `.claude/settings.local.json`, in that order

## reload_plugins

<!-- Used as "then {{reload_plugins}}" after a rebuild. -->

run `/reload-plugins` or start a new session

## doctor_command

<!-- The full doctor command. The bare /doctor is Claude Code's built-in install check, so the doctor skill is always written with its plugin prefix. -->

`/gstack:doctor`
