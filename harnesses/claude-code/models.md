# gstack model defaults for Claude Code

The model and effort each role runs on unless `~/.claude/gstack-models.md` overrides it. The roles and the lookup rule are in `model-roles.md`, next to this file. A list role has one row per entry, in order.

Model is what the Agent tool's `model` takes: `opus`, `sonnet`, `haiku` or `fable`, or `inherit-parent` to leave model and effort unset. Effort is what its `effort` takes: `low`, `medium`, `high`, `xhigh` or `max`, or `-` with `inherit-parent`.

Drop order: high, medium, low

Never drops: haiku

A role marked "Can drop" in `model-roles.md` may move its effort one step down this order for a smaller job, keeping its model. An effort not in the order, and a model on the `Never drops` line, never drop.

| Role | Model | Effort |
|---|---|---|
| `feature, refactoring` | sonnet | medium |
| `bug-fix` | sonnet | medium |
| `perf-issue` | sonnet | medium |
| `hillclimb` | sonnet | medium |
| `hardest tasks` | opus | medium |
| `judgment and prose` | sonnet | medium |
| `how explorer` | haiku | medium |
| `how explainer` | sonnet | high |
| `why investigators` | haiku | medium |
| `why synthesizer` | opus | low |
| `research explorer` | haiku | medium |
| `research synthesizer` | opus | low |
| `reflect tooling` | haiku | medium |
| `reflect judgment, divergent, synthesizer` | opus | low |
| `swarm workers` | haiku | medium |
| `code reviewer` | sonnet | medium |
| `arena runners` | opus | low |
| `arena runners` | sonnet | medium |
| `arena cross-judge pool` | sonnet | medium |
| `architect runners` | opus | low |
| `architect runners` | sonnet | medium |
| `interrogate reviewers` | opus | low |
| `interrogate reviewers` | sonnet | medium |
