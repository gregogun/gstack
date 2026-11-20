# Ticket priority

Priority says how soon a ticket matters. Every ticket gets exactly one priority label. Readiness (`ready-for-agent`, `ready-for-human`, `needs-triage`) is a separate label and says who can pick the ticket up. On GitHub, run `gh label create <label> --force` for each label before you first apply it.

## Levels

| Label | Means | Examples |
|---|---|---|
| `p1` | Urgent. Breaks things now, or the owner says it jumps the queue | Data loss or a security hole. A core flow broken with no workaround |
| `p2` | Normal. The default for planned work | A real bug with a workaround. A spec's tickets. A planned feature |
| `p3` | Someday. Do it when nothing above it is ready | A cosmetic glitch. A rare edge case. A refactor nothing needs yet. A nice-to-have |

Pick the level from the examples, not from how interesting the fix is. When torn between two levels, pick the lower one. A ticket with no priority label ranks as `p2`. Inside a spec, blocking edges already set the order, so a spec's tickets are `p2` unless the owner marks one urgent.

## Who sets it

- **The owner sets priority.** A ticket the owner asks for, or approves in a **to-tickets** breakdown, carries the priority agreed there.
- **An agent only proposes priority on a ticket it files itself**, such as a side finding or an unattended diagnosis. Label it `needs-triage`, or `ready-for-human` when the fix needs the owner's judgment. Add the proposed priority label, and give one line of reason in the body under `## Priority`. The owner confirms it by setting the readiness label.

## Side findings

A side finding is a bug, edge case or refactor you notice while working on something else.

- **It blocks the task.** Then it is part of the task. Fix it on the current branch, or in its own PR when it is out of band, and say so in the reply. Don't file it as a ticket.
- **It doesn't block the task.** Don't fix it. File it as above and keep going. Write `Found during #<n>` in the body, where `<n>` is the ticket or PR you were working on. Don't make it a sub-issue of the spec and don't add a blocking link, since either would hold up the spec.

List the side findings you filed, with their proposed priority, in your reply.

## Picking the next ticket

Run `node <to-tickets skill dir>/scripts/next-ticket.mjs` from the project's checkout. The script sits in `scripts/` beside the folder this file is in. Add `--parent <spec>` to stay inside one spec, and `--repo owner/name` when you run it outside the project.

It lists open `ready-for-agent` tickets with no open blockers. The order is priority first, then how many open tickets each one unblocks, then oldest first. Blockers come from native blocking links, including links to other repos, and from same-repo references in the `## Blocked by` section. A section that starts with "None" has no blockers. `--parent` matches native sub-issues and the `## Parent` section, direct children only. The script flags a frontier `p1` that has carried the label for more than 14 days.

Take the first ticket. Report a flagged `p1` to the owner rather than demoting it yourself. For a blocker in another repo, use a native link, because the script ignores cross-repo references in the body. The script reads GitHub issues only. For a local-file tracker, apply the same order by hand.
