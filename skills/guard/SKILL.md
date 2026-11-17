---
name: guard
description: Install a pre-tool hook in a project that stops agents from editing the primary checkout on the default branch, running git commands that destroy work, or skipping git hooks. One script serves every supported harness. Use for /guard, or to add agent guardrails to a project.
disable-model-invocation: true
---

# guard

Installs `scripts/guard.mjs` as a pre-tool hook in the user's project. The harness hands the hook each tool call before it runs. The script turns the call into an action, checks it against its rules, and denies it with a reason the agent reads.

## Rules

Every rule is on unless the hook command names a subset with `--rules <name,...>`. An unknown rule name makes the hook exit with an error, so a typo never turns rules off without a word. A user who wants a rule off for one session starts the harness with `AGENT_GUARD_ALLOW=<name,...>` in its environment. The agent's own shell can't change the hook's environment, so only the user can lift a rule.

### hook-bypass

Stops an agent from skipping the git hooks. It splits each shell command into separate invocations and denies these:

- `git commit` with `-n`, a cluster such as `-anm`, or the long no-verify flag or a prefix of it, also after `git -C <path>` or `-c <key>=<value>`
- the long no-verify flag on any other git command, such as `git push` and `git merge`
- `git -c core.hooksPath=<dir>`
- the env prefixes `HUSKY=0`, `LEFTHOOK=0`, `LEFTHOOK=false` and `LEFTHOOK_EXCLUDE=`, on any command or through `env`, `export` or `$env:`

It reads `-n` only on `git commit`, so `git log -n 5`, `git push -n` and `grep -n` still run. It also reads the body of `sh -c`, `bash -c`, `eval` and `$(...)`. It does not see git aliases, scripts that the command runs, or `git config core.hooksPath`, so CI still reruns the hook checks.

### primary-checkout

Stops an agent from editing the primary checkout while it is on the default branch. The primary checkout is where the user and other agents work, so concurrent edits there mix together. The denial tells the agent to fetch and create its own worktree off `<remote>/<default>`, with the exact command.

It reads the harness's file-edit tools. An edit through the shell, such as `sed -i` or a redirect, gets past it. Edits in a linked worktree, in a checkout on another branch, outside git, and in a repo other than the project all pass.

The default branch is `refs/remotes/<remote>/HEAD`, where `<remote>` is `origin`, else the first remote `git remote` lists. When that ref is missing, the guard falls back to a local `main` or `master`. A clone has the ref. A repo that added its remote by hand does not, so setup step 3 sets it.

### destructive-git

Stops git commands that destroy work. Anywhere in the repo it denies:

- `git push --force`, `-f` and a `+` refspec. `--force-with-lease` and `--dry-run` pass.
- a push to the default branch, by refspec or glob refspec, `--all`, `--branches`, `--mirror`, or a bare `git push` while on it. `git push --tags` passes.
- `git branch -D`, or `--delete --force`. `git branch -d` refuses unmerged work, so it passes.

In the primary checkout only, it also denies the commands that throw away uncommitted work: `git reset --hard`, `git clean -f`, `git checkout -- <path>`, `git checkout .`, `git switch -f`, `git restore` without `--staged`, and `git stash drop` or `clear`. An agent's own worktree holds only its own work, so these pass there. gstack's own playbooks rely on `git reset --hard` in a worktree.

It follows `git -C <dir>` and each `cd <dir>` in the command to find which checkout a command acts on. A `cd` inside `( )` or `$( )` still counts after the subshell ends, so a later command can be checked against the wrong checkout. PowerShell's `Set-Location` is not followed.

## Setup

1. Copy `{{plugin_root}}/skills/guard/scripts/guard.mjs` to `.agents/hooks/guard.mjs` in the project. The plugin's folder changes with each update, so the project needs its own copy. `.agents/` is not tied to one harness, so every harness's config points at the same file.
2. Ask which harnesses the project's contributors use. Wire each one below. Ask before editing any settings file.
3. Run `git symbolic-ref -q refs/remotes/<remote>/HEAD`. If it prints nothing, run `git remote set-head <remote> --auto`, so the guard reads the real default branch.
4. If the project already runs an older `bypass-guard.mjs` hook, replace its entry with the guard entry and delete the old file.

### Claude Code

Add this to `.claude/settings.json`, or to `.claude/settings.local.json` for this user only. Merge it into any existing `hooks.PreToolUse` array:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell|Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.agents/hooks/guard.mjs\" claude-code" }]
      }
    ]
  }
}
```

### Other harnesses

`guard.mjs` has an adapter only for Claude Code. Most agent harnesses now have a pre-tool hook of the same shape: JSON in on stdin, a deny decision out. A new harness is one entry in the script's `ADAPTERS` table:

- `action(event)` turns the harness's hook input into `{ kind: "shell", command, dialect, cwd }`, `{ kind: "edit", path, project }`, or `null`. `project` is the folder the session opened, so `primary-checkout` skips edits to other repos for a call no rule reads.
- `deny(reason)` writes the deny decision in that harness's format.

Add an adapter only against a running copy of the harness, and add its wiring here. A table entry tested on sample JSON from the docs proves nothing about the real hook.

Done when a new session in each wired harness, started in the primary checkout on the default branch, gets three denials: `guard(primary-checkout):` for a file edit, `guard(destructive-git):` for `git reset --hard`, and `guard(hook-bypass):` for `git commit -n -m test`. `git log -n 1` still runs.
