---
name: housekeeping
description: "Audit and clean up what work leaves behind: worktrees, local and remote branches, stashes, stale PRs, scratch notes, orphaned processes and disk caches. Audits first without deleting anything, then removes only what the run's mode allows. Use for /housekeeping, \"clean up my branches\", \"prune worktrees\", \"free up space\", or a scheduled cleanup run."
disable-model-invocation: true
---

# Housekeeping

Audit, decide, prune, confirm. `scripts/audit.sh` does the audit. It fetches the base ref and deletes nothing. This skill decides what goes. `scripts/audit.sh --help` lists the sections, the flags and what each bucket means.

This skill deletes user state with no code review to catch a slip, so its gates are the review.

## Modes

The mode sets what a run removes without asking. A run started by {{loop_command}}, a schedule, or go-mode's Autonomous run playbook is **autonomous**. Every other run is **user-invoked**.

| Area | Audit rows | Autonomous run removes | User-invoked run removes |
|---|---|---|---|
| Worktrees | `worktrees` | `safe` rows (a worktree with ignored files outside the rebuildable list is `hold-ignored`, not `safe`) that are `clean`, whose MERGED is `YES` or PR is `#N/merged`, that have no `processes` row, and that are not this run's own worktree | rows the user picks |
| Local branches | `branches`, `local` | `safe` rows, which are branches whose PR merged | rows the user picks |
| Remote branches | `branches`, `origin` | nothing | rows the user picks |
| Stashes | `stashes` | nothing | rows the user picks |
| PRs | `prs` | nothing | rows the user picks |
| Scratch | `scratch` | nothing | rows the user picks |
| Processes | `processes` | nothing | rows the user picks |
| Package caches | `disk`, `cache` | nothing | rows the user picks |
| Xcode and simulators | `disk`, `xcode` and `simulator` | nothing | rows the user picks |

An autonomous run removes worktrees only when it audited `worktrees` and `processes` in the same run and saw no transcripts-dir warning in step 1. A chat that is still open shows as a process whose cwd is in its worktree, and an unscanned `LAST_CHAT` can hide one that a recent chat used. Every row an autonomous run keeps goes to the report.

## Steps

1. **Audit.** Record `df -h /`. Run `scripts/audit.sh [--<section>...] [-b <pr-base-ref>] -t <transcripts-dir>... [repo-path]` in the background, since the transcript scan and the disk sizes are slow. Pass one `-t` for each path in `git worktree list`, with `<transcripts-dir>` set to `{{transcripts_dir}}` for that path, since a chat started in a linked worktree is stored under that worktree's path. {{transcript_format}} Pass `-b origin/<branch>` when PRs merge into a branch other than the remote's default. Name sections to audit only some areas. Take every worktree path from the audit, since a harness can create worktrees under its own directory, such as `<harness-dir>/worktrees/myrepo/x`, that a hand-typed `myrepo-worktrees/x` misses. Done when every requested section has printed its table and you have read every stderr warning.
2. **Decide.** Sort every row into the remove set or the keep set, each kept row with a one-line reason.
   - **Autonomous:** take exactly the rows the Modes table allows. Ask nothing.
   - **User-invoked:**
     1. Ask which sessions and worktrees are in use. That set is final over any bucket, since the audit has marked `safe` a worktree the user still had in use. A session in use spawns arena and repro trees into sibling worktrees through background subagents, and those are in use even when the user never names them.
     2. For every `verify-recent-chat` row, and any row you doubt, fan subagents out to read the transcripts and report whether the chat is ongoing and which worktrees it touches, per the **guard-the-context-window** principle skill. Set each subagent's model and effort per the Subagents section of the **go-mode** skill ([`../go-mode/SKILL.md`](../go-mode/SKILL.md)).
     3. Show one table per area, plus the kept rows of the newest autonomous entry in the report if the repo has one, and ask which buckets or rows to remove. A `wip:N` worktree holds N uncommitted tracked edits with no other copy, so show its diff and get a decision on it alone. A `scratch:N` worktree holds N untracked files, so name them.
3. **Prune.** Run the command for each row in the remove set. Before each command that deletes a branch or a stash, append its restore line to the report under a heading with today's date and the mode, in both modes. Done when every command has run and you have read each failure.
   - **Worktree:** an autonomous run uses `git worktree remove <path>` without `--force`, so git checks again at removal time and refuses a worktree that has changed or is locked. Keep a refused worktree and report it. A user-invoked run uses `git worktree remove --force <path>`. If the remove succeeds and the directory survives on ignored build artifacts, `rm -rf` it. Then `git worktree prune`. The branch survives, so no commits are lost.
   - **Local branch, or a scratch `wip-commit` row:** record `git branch <branch> <sha>`, with the sha from `git rev-parse <branch>`, then `git branch -D <branch>`. It takes `-D` because a squash-merged branch is not an ancestor of the base.
   - **Remote branch:** record `git push origin <sha>:refs/heads/<branch>`, with the sha from `git ls-remote origin <branch>`, then `git push origin --delete <branch>`.
   - **Stash:** record `git stash store <sha>`, with the sha from `git rev-parse stash@{N}`, then `git stash drop stash@{N}`, highest `N` first, since a drop renumbers the stashes after it.
   - **PR:** `gh pr close <number>`.
   - **Resume note:** `rm <path>`.
   - **Process:** `kill <pid>`. Use `kill -9` only on a process still alive after that.
   - **Package cache:** from `$HOME`, so no repo's own cache is cleaned, run `pnpm store prune`, `npm cache verify`, `yarn cache clean`, `rm -rf "$(brew --cache)"` or `uv cache prune`. Use `brew --cache`, not `brew cleanup`, since `brew cleanup` also uninstalls old formula versions. A user-invoked run clears only caches the user picks.
   - **Simulators and Xcode:** `xcrun simctl --set testing delete all` for test clones, `xcrun simctl delete unavailable`, and `xcrun simctl runtime list` then `xcrun simctl runtime delete <id>` for old runtimes. `rm -rf` a `DerivedData` or `iOS DeviceSupport` folder.
4. **Confirm.** Rerun the audit on the same sections and record `df -h /` again. Done when every removed row is gone and every kept row is still there.
5. **Report.** The report is `$(git rev-parse --git-common-dir)/housekeeping-report.md`. Each run appends to the entry it started in step 3, so earlier restore lines stay. An autonomous run's entry also holds `df -h /` before and after, each removed row, and each kept row with its reason.

**Reply:** `df -h /` before and after with the space reclaimed, the rows removed in each area, a one-line reason for each row kept (in use by which chat, uncommitted work, or report only), and the report path.
