---
name: setup-gstack
description: Configure which model and effort gstack uses for each model role. Shows the current table, asks which roles to change, and writes only the overrides to the gstack model config. Use for /setup-gstack, "configure gstack models", "gstack effort", resetting a role, or changing gstack's model choices.
---

# Setup gstack

Manage {{models_config}}, the user's override file for gstack's model roles. The roles, the lookup rule and the file format are in [`model-roles.md`](../go-mode/references/model-roles.md). The shipped defaults are in `model-defaults.md` in the same folder. Its intro lists the model and effort values this harness accepts. Editing the override file by hand works too. This skill saves looking up role names.

## Steps

1. **Load.** Read `model-roles.md`, `model-defaults.md` and, if it exists, {{models_config}}. Build the effective table: the defaults, with every role that has override rows taking those rows instead. Note any override row whose role is not in `model-roles.md`, or whose model or effort is not an accepted value.
2. **Show.** Print the effective table with columns Role, Model, Effort and Source (`default` or `override`). A list role shows one row per entry. Below it, list any rows noted in step 1 and say they will be dropped.
3. **Ask.** Ask which roles to change or reset, preferring the harness's structured question tool, if it has one, over free text. Offer "keep as is" too. For each chosen role, ask for:
   - a model and an effort from the accepted values, or `inherit-parent` (runs on the parent's model and effort, so no effort is asked);
   - for a list role, the full list of entries, one per subagent, so the count is the list length;
   - or reset, which drops the role's override rows.
4. **Write.** Write {{models_config}} with a one-line header saying what the file is, then a Role, Model, Effort table holding only the roles whose rows differ from the defaults, in `model-roles.md` order. Drop reset roles, roles set back to their defaults, and the rows step 2 flagged. If no override remains, delete the file. Overwrite the whole file, so a rerun stays idempotent.
5. **Confirm.** Show the new effective table. Say that skills read the file at each spawn, so the change applies to the next subagent with no rebuild or restart.

If the project has no way to drive the real app for proof (a `verify-*` skill or another harness), offer `/create-verification-skill` once. On no, move on.
