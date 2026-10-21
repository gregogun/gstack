---
name: doctor
description: "Check the gstack install for problems: other skills that take a gstack skill's name, lookalike skills that can run on their own, a stale build, the install scope, and the model config. Offers a fix for each problem and asks before every change. Use for {{doctor_command}}, or when a gstack command runs the wrong skill."
disable-model-invocation: true
---

# Doctor

Run the checks, explain what they found, and fix what the user approves. The script only reads. Every change goes through step 3, one question at a time.

## Steps

1. **Run.** From the project root, run `node {{plugin_root}}/skills/doctor/scripts/doctor.mjs` with these arguments:
   - `--plugin-root` set to {{plugin_root}}
   - `--user-skills` set to `{{user_skills_dir}}`
   - `--project-skills` set to `{{project_skills_dir}}`
   - `--plugin-records` set to {{plugin_records}}
   - `--marketplace-records` set to {{marketplace_records}}
   - `--settings` once for each of {{plugin_settings}}
   - `--models-config` set to {{models_config}}

   It prints a table with Check, Severity, Detail and Fix columns, then a count. It exits 1 when any row is an error. A missing file counts as empty, so pass every argument. Done when the table is printed.
2. **Explain.** Show the table. Below it, give each `error` or `warn` row one plain sentence on what the user will notice, such as which skill a bare command runs. `ok` and `n/a` rows need nothing. "Unknown" means the harness docs don't say which copy runs, and testing hasn't shown it either. Done when every non-ok row has its sentence.
3. **Fix.** Walk the `error` and `warn` rows in table order. For each one, ask whether to apply its fix, preferring the harness's structured question tool, and make only the change the user picks.
   - **User skill clash or lookalike.** Offer remove, rename or leave. A rename changes both the folder name and the `name:` line to a name the user gives, because either one answers to the command. For a symlink, say it is a link and where it points, and offer only to remove the link. Its target stays.
   - **Project copy or project lookalike.** Report it and leave it. A project copy is usually an override on purpose, and the project owns it.
   - **Another plugin's skill.** Report the row's fix and leave the plugin's files as they are.
   - **Stale build.** Offer to run the rebuild command from the row in the folder it names. After it succeeds, tell the user to {{reload_plugins}}.
   - **Install scope.** Report it. Reinstalling is the user's call.
   - **Model config.** Offer [`/setup-gstack`](../setup-gstack/SKILL.md), which rewrites the file.

   Done when every row has been fixed, left or reported.
4. **Recheck.** If step 3 changed anything, run step 1 again and show the new table. Done when every row the user chose to fix reads `ok`.
