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
| Worktrees | `worktrees` | `safe` rows that are `clean`, have no `processes` row, and are not this run's own worktree | rows the user picks |
| Local branches | `branches`, `local` | `safe` rows | rows the user picks |
| Remote branches | `branches`, `origin` | nothing | rows the user picks |
| Stashes | `stashes` | nothing | rows the user picks |
| PRs | `prs` | nothing | rows the user picks |
| Scratch | `scratch` | nothing | rows the user picks |
| Processes | `processes` | nothing | rows the user picks |
| Package caches | `disk`, `cache` | every row, with its prune command | rows the user picks |
| Xcode and simulators | `disk`, `xcode` and `simulator` | nothing | rows the user picks |

An autonomous run that saw the transcripts-dir warning in step 1 removes no worktrees, since an unscanned `LAST_CHAT` can hide a worktree a live chat is using. Every row an autonomous run keeps goes to the report.

## Steps

1. **Audit.** Record `df -h /`. Run `scripts/audit.sh -t <transcripts-dir> [-b <pr-base-ref>] [--<section>...] [repo-path]` in the background, since the transcript scan and the disk sizes are slow. `<transcripts-dir>` is `{{transcripts_dir}}` for the main worktree's path. {{transcript_format}} Pass `-b origin/<branch>` when PRs merge into a branch other than the remote's default. Name sections to audit only some areas. Take every worktree path from the audit, since a harness can create worktrees under its own directory, such as `<harness-dir>/worktrees/myrepo/x`, that a hand-typed `myrepo-worktrees/x` misses. Done when every requested section has printed its table and you have read every stderr warning.
2. **Decide.** Sort every row into the remove set or the keep set, each kept row with a one-line reason.
   - **Autonomous:** take exactly the rows the Modes table allows. Ask nothing.
   - **User-invoked:**
     1. Ask which sessions and worktrees are in use. That set is final over any bucket, since the audit has marked `safe` a worktree the user still had in use. A session in use spawns arena and repro trees into sibling worktrees through background subagents, and those are in use even when the user never names them.
     2. For every `verify-recent-chat` row, and any row you doubt, fan subagents out to read the transcripts and report whether the chat is ongoing and which worktrees it touches, per the **guard-the-context-window** principle skill. Set each subagent's model and effort per the Subagents section of the **go-mode** skill ([`../go-mode/SKILL.md`](../go-mode/SKILL.md)).
     3. Show one table per area, plus the kept rows of the last autonomous report if the repo has one, and ask which buckets or rows to remove. A `wip:N` worktree holds N uncommitted tracked edits with no other copy, so show its diff and get a decision on it alone. A `scratch:N` worktree holds N untracked files, so name them.
3. **Prune.** Run the command for each row in the remove set. Done when every command has run and you have read each failure.
   - **Worktree:** `git worktree remove --force <path>`. If the directory survives on ignored build artifacts, `rm -rf` it. Then `git worktree prune`. The branch survives, so no commits are lost.
   - **Local branch, or a scratch `wip-commit` row:** write `<branch> <sha>` to the report, then `git branch -D <branch>`. `git branch <branch> <sha>` restores it. It takes `-D` because a squash-merged branch is not an ancestor of the base.
   - **Remote branch:** `git push origin --delete <branch>`.
   - **Stash:** write `git rev-parse stash@{N}` to the report, then `git stash drop stash@{N}`, highest `N` first, since a drop renumbers the stashes after it. `git stash store <sha>` restores one.
   - **PR:** `gh pr close <number>`.
   - **Resume note:** `rm <path>`.
   - **Process:** `kill <pid>`. Use `kill -9` only on a process still alive after that.
   - **Package cache:** `pnpm store prune`, `npm cache verify`, `yarn cache clean`, `brew cleanup` or `uv cache prune`. Clear only caches the user has not said to keep.
   - **Simulators and Xcode:** `xcrun simctl --set testing delete all` for test clones, `xcrun simctl delete unavailable`, and `xcrun simctl runtime list` then `xcrun simctl runtime delete <id>` for old runtimes. `rm -rf` a `DerivedData` or `iOS DeviceSupport` folder.
4. **Confirm.** Rerun the audit on the same sections and record `df -h /` again. Done when every removed row is gone and every kept row is still there.
5. **Report.** An autonomous run writes `$(git rev-parse --git-common-dir)/housekeeping-report.md` over the last one: the date, `df -h /` before and after, each removed row with its restore command, and each kept row with its reason.

**Reply:** `df -h /` before and after with the space reclaimed, the rows removed in each area, a one-line reason for each row kept (in use by which chat, uncommitted work, or report only), and the report path for an autonomous run.
