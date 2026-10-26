### Autonomous run

**You own the exit condition. Define done, then drive to it without stopping.**

1. State the exit condition as a checkable predicate before the first iteration (tests green, repro fixed, all N PRs merged, pixel-diff zero).
2. Pick the wake mechanism using {{loop_command}}. An event to watch (CI, a merge, a ref advancing) gets a watcher subagent that wakes you on the event, with a long time-based heartbeat as fallback. No event gets a fixed-interval heartbeat sized to when the result is worth re-checking. Set each subagent's model and effort per the Subagents section.
3. Each iteration makes the smallest change the evidence justifies, verifies it against the predicate, commits if it advanced, discards changes that didn't help. Belt-and-suspenders that "might help" gets reverted, not left to ride.
   Sequence the work via the **sequence-verifiable-units** principle skill, verifying each unit before the next instead of batching checks at the end.
   For a spec with tickets, the exit condition is every `ready-for-agent` ticket closed with its criteria verified. Work the frontier (open `ready-for-agent` tickets whose blockers are closed) one ticket at a time. Stay a thin orchestrator so your context lasts the whole spec. Hand each ticket to a fresh `go-agent` that runs it through Feature, passing the ticket's reference rather than its contents. Spawn it under the Feature playbook's role, or `hardest tasks` when the ticket is a hardest change per the Subagents section. Review its diff yourself, verify the criteria by running them, and close the ticket only then. Leave `ready-for-human` tickets for the user, and list them in the reply.
4. Mid-run discoveries are yours. Address broken skills, related bugs, flaky verifiers, review noise, tooling failures, orphaned follow-ups, and fixable drift yourself via go-mode. Put out-of-band fixes in their own PR. Do not park reversible work for the human or ask the user a question. Surface only irreversible actions, genuine product or preference calls no experiment can settle, or a real dead end. Keep the predicate as the main drive, and return to it after each side fix.
5. Checkpoint every iteration via the **show-me-your-work** skill, a row for what changed and whether the predicate moved.
6. Stop when the predicate is met. A plateau is not a stop, so keep going and pivot your approach to push past it. Surface a genuine dead end rather than spinning, and never relax the predicate to declare victory.

**Reply:** the exit condition, iterations run, what landed, what was discarded, final predicate state.
