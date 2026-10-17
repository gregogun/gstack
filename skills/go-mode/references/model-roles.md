# Model roles

Every subagent gstack spawns runs under a model role. This file lists the roles and holds the one rule for picking a spawn's model and effort. Skills link here instead of repeating it.

## Picking a spawn's model and effort

1. **Find the role.** The skill or playbook names it. A spawn that names no role takes the role whose description fits its job: `swarm workers` for searching, reading, parsing and mechanical edits, `judgment and prose` for judgment, review and writing. When a skill asks for a model other than the one that did the work, pick an entry of `arena cross-judge pool` that differs from it.
2. **Look up the role in {{models_config}}.** If that file is missing or has no rows for the role, use the role's rows in `model-defaults.md`, next to this file. Those are the defaults shipped for this harness. If `model-defaults.md` is missing too, use the available model that best fits the role's description, leave the effort unset, and say which.
3. **Pass both the model and the effort on the spawn.** Don't change them to suit the job. Difficulty is handled by the role you pick (the hardest changes go to `hardest tasks`), and keeping the configured model keeps a diverse panel diverse.
4. **`inherit-parent` means leave both unset,** so the subagent runs on the parent's model and effort. It is a valid choice, never a rejected model.
5. **If a spawn rejects a model or effort,** spawn it again with both unset, so it runs on the parent, and say so. Don't block the work on it.

A list role has one row per entry, in order, and the skill spawns one subagent per entry unless it says otherwise. `arena cross-judge pool` is a pool: Arena picks one entry from it.

## Config files

Both files are a Markdown table with the columns Role, Model and Effort, one row per entry. A list role takes several rows with the same role name.

- `model-defaults.md` ships with gstack and covers every role.
- {{models_config}} is the user's override file, outside the plugin. It holds only the roles the user changed. Any row for a role replaces all of that role's default rows, so a list role is overridden as a whole. Deleting a role's rows resets it to the default. A row for a role not listed below is ignored. Say so when you see one.

Skills read the files at each spawn, so an edit applies to the next spawn without a rebuild or reinstall. `/setup-gstack` edits the override file, and editing it by hand works too.

## Roles

| Role | Entries | Used by | Description |
|---|---|---|---|
| `feature, refactoring` | one | feature and refactoring playbooks | a fast code model |
| `bug-fix` | one | bug-fix playbook | a fast code model |
| `perf-issue` | one | perf-issue playbook | a fast code model |
| `hillclimb` | one | hillclimb playbook | a fast code model |
| `hardest tasks` | one | go-mode code delegates for the hardest changes | the strongest reasoning model |
| `judgment and prose` | one | go-mode prose and judgment delegates | the strongest reasoning model |
| `how explorer` | one | how | a fast code model |
| `how explainer` | one | how | the strongest reasoning model |
| `why investigators` | one | why | a fast code model |
| `why synthesizer` | one | why | the strongest reasoning model |
| `reflect tooling` | one | reflect | a fast code model, from a different family than the judgment role where possible |
| `reflect judgment, divergent, synthesizer` | one | reflect | the strongest reasoning model |
| `swarm workers` | one | swarm, and go-mode verification | a fast code model |
| `arena runners` | list | arena | 1: the strongest reasoning model. 2: a second, different model for diversity |
| `arena cross-judge pool` | list | arena | the same two, preferring a family other than the parent's |
| `architect runners` | list | architect, via arena | 1: the strongest reasoning model. 2: a second, different model for diversity |
| `interrogate reviewers` | list | interrogate | Reviewer A: the strongest reasoning model. Reviewer B: a second, different model for diversity |
