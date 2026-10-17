# gstack model defaults for Claude Code

The model and effort each role runs on unless `~/.claude/gstack-models.md` overrides it. The roles and the lookup rule are in `model-roles.md`, next to this file. A list role has one row per entry, in order.

Model is what the Agent tool's `model` takes: `opus`, `sonnet`, `haiku` or `fable`, or `inherit-parent` to leave model and effort unset. Effort is what its `effort` takes: `low`, `medium`, `high`, `xhigh` or `max`, or `-` with `inherit-parent`.

| Role | Model | Effort |
|---|---|---|
| `feature, refactoring` | opus | medium |
| `bug-fix` | opus | medium |
| `perf-issue` | opus | medium |
| `hillclimb` | opus | medium |
| `hardest tasks` | opus | high |
| `judgment and prose` | opus | high |
| `how explorer` | opus | medium |
| `how explainer` | opus | high |
| `why investigators` | opus | medium |
| `why synthesizer` | opus | high |
| `reflect tooling` | opus | medium |
| `reflect judgment, divergent, synthesizer` | opus | high |
| `swarm workers` | opus | medium |
| `arena runners` | opus | high |
| `arena runners` | sonnet | high |
| `arena cross-judge pool` | opus | high |
| `arena cross-judge pool` | sonnet | high |
| `architect runners` | opus | high |
| `architect runners` | sonnet | high |
| `interrogate reviewers` | opus | high |
| `interrogate reviewers` | sonnet | high |
