# Model roles

Every subagent gstack spawns runs under a model role. This file lists the roles and holds the one rule for picking a spawn's model and effort. Skills link here instead of repeating it.

## Picking a spawn's model and effort

1. **Find the role.** The skill or playbook names it. A spawn that names no role takes the role whose description fits its job: `swarm workers` for searching, reading, parsing and mechanical edits, `judgment and prose` for judgment, review and writing. When a skill asks for a model other than the one that did the work, pick an entry of `arena cross-judge pool` that differs from it.
2. **Look up the role in {{models_config}}.** If that file is missing or has no rows for the role, use the role's rows in `model-defaults.md`, next to this file. Those are the defaults shipped for this harness. If `model-defaults.md` is missing too, use the available model that best fits the role's description, leave the effort unset, and say which.
3. **Pass both the model and the effort on the spawn.** Pass the effort as configured, never higher or lower.
4. **A role marked "Can drop" may drop its model one step for a smaller job.** Smaller means well specified, mechanical or local, no design decisions, and easy to check: a rename, a one-file fix with a clear repro, a test for a known behavior. When in doubt, don't drop. Drop exactly one step down the `Drop order` line in `model-defaults.md`, keep the effort, and never raise a model. A model not in that order, and `inherit-parent`, never drop. Roles marked "no" never drop: review panels stay diverse, judgment and synthesis keep their quality, `hardest tasks` keeps its point, and verification stays on `swarm workers`. Say each drop in one line: the role, the configured and dropped model, and why the job is small.
5. **`inherit-parent` means leave both unset,** so the subagent runs on the parent's model and effort. It is a valid choice, never a rejected model.
6. **If a spawn rejects a dropped model,** spawn it again on the configured model. **If it rejects the configured model or effort,** spawn it again with both unset, so it runs on the parent, and say so. Don't block the work on it.

A list role has one row per entry, in order, and the skill spawns one subagent per entry unless it says otherwise. `arena cross-judge pool` is a pool: Arena picks one entry from it.

## Config files

Both files are a Markdown table with the columns Role, Model and Effort, one row per entry. A list role takes several rows with the same role name.

- `model-defaults.md` ships with gstack and covers every role.
- {{models_config}} is the user's override file, outside the plugin. It holds only the roles the user changed. Any row for a role replaces all of that role's default rows, so a list role is overridden as a whole. Deleting a role's rows resets it to the default. A row for a role not listed below is ignored. Say so when you see one.

Skills read the files at each spawn, so an edit applies to the next spawn without a rebuild or reinstall. `/setup-gstack` edits the override file, and editing it by hand works too.

## Roles

| Role | Entries | Can drop | Used by | Description |
|---|---|---|---|---|
| `feature, refactoring` | one | yes | feature and refactoring playbooks | a fast code model |
| `bug-fix` | one | yes | bug-fix playbook | a fast code model |
| `perf-issue` | one | yes | perf-issue playbook | a fast code model |
| `hillclimb` | one | yes | hillclimb playbook | a fast code model |
| `hardest tasks` | one | no | go-mode code delegates for the hardest changes | the strongest reasoning model |
| `judgment and prose` | one | no | go-mode prose and judgment delegates | the strongest reasoning model |
| `how explorer` | one | yes | how | a fast code model |
| `how explainer` | one | no | how | the strongest reasoning model |
| `why investigators` | one | yes | why | a fast code model |
| `why synthesizer` | one | no | why | the strongest reasoning model |
| `research explorer` | one | yes | research | a fast, cheap model; gathering is search and quoting, not judgment |
| `research synthesizer` | one | no | research | the strongest reasoning model |
| `reflect tooling` | one | no | reflect | a fast code model, from a different family than the judgment role where possible |
| `reflect judgment, divergent, synthesizer` | one | no | reflect | the strongest reasoning model |
| `swarm workers` | one | no | swarm, and go-mode verification | a fast code model |
| `arena runners` | list | no | arena | 1: the strongest reasoning model. 2: a second, different model for diversity |
| `arena cross-judge pool` | list | no | arena | the same two, preferring a family other than the parent's |
| `architect runners` | list | no | architect, via arena | 1: the strongest reasoning model. 2: a second, different model for diversity |
| `interrogate reviewers` | list | no | interrogate | Reviewer A: the strongest reasoning model. Reviewer B: a second, different model for diversity |
