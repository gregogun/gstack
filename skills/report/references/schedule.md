# Scheduling an unattended run

A scheduled run starts `claude -p` at a set time each day, in a set folder, with a set prompt. When the agent finishes it writes a report, and the runner sends that report through the report adapter. If the agent crashes, hits its time limit, or writes a report that fails validation, or the folder is gone, the runner sends a `failed` report of its own. The runner sends nothing when Telegram stays unreachable, the credentials are wrong, or the task file cannot be read. Its log records why.

The script is `{{plugin_root}}/skills/report/scripts/schedule.mjs`. Windows uses Task Scheduler and macOS uses launchd. On Linux, `add` saves the task, exits 2, and prints the crontab line to add.

## Steps

1. **Agree on the job with the user.** You need four values, and each one is the user's call.
   - A name: lowercase letters, digits and hyphens.
   - A daily time in 24-hour `HH:MM`.
   - The folder to run in.
   - The prompt. Write it to stand alone, because the agent starts with no memory of this chat. The runner adds its own instructions about the report, so the prompt covers only the work.

   Also agree what the agent may do. In print mode, any tool that needs permission is denied. Pass the user's choice after `--`, as in `-- --permission-mode acceptEdits` or `-- --allowedTools "Bash(npm test)"`. Never pick `bypassPermissions` for the user. Done when the user has confirmed all four values and the permission flags.
2. **Check the report path.** Send one report by hand first, so the scheduled send is known to work. The Setup in [SKILL.md](../SKILL.md) covers this. Done when a report arrives on the phone.
3. **Add the job.**

   ```sh
   node {{plugin_root}}/skills/report/scripts/schedule.mjs add <name> --at 03:00 --cwd <folder> --prompt "<prompt>" [--timeout 120] -- <claude flags>
   ```

   `--timeout` is in minutes and defaults to 120. When the limit is reached, the runner kills claude and every process it started. `add` records the following in `<state>/tasks/<name>.json`:
   - the absolute paths of `claude` and `node`
   - the current `PATH`
   - the Telegram variables

   A scheduled job sees none of the shell's environment, so it relies on that record. The task file holds the bot token, so on macOS `add` makes it readable by its owner only. The runner removes the Telegram variables from the agent's environment. The agent reads untrusted content and never needs them. `add` also copies the scripts to `<state>/bin`, because the plugin folder moves with each update. Adding a job under a name that exists replaces it. The first run is the next time `--at` comes round. Done when the command exits 0 and prints the job.
4. **Test the job.** Run `node {{plugin_root}}/skills/report/scripts/schedule.mjs run <name>` once, with the user's agreement, because it does the real work. Done when the report arrives.

## Later

- `schedule.mjs list` prints each job's name, time and folder. `schedule.mjs remove <name>` deletes the OS job and its task file.
- Run `add` again after changing the token, the chat id, or how `claude` is installed. The task file keeps the old values until then.
- Each run gets its own folder under `<state>/runs`. It holds `claude.json` (claude's output), `claude.log` (its stderr) and `report.json`. A report that failed validation is kept there as `report.invalid.json`.
- The runner logs each start and each send, with the adapter's error, to `<state>/logs/<name>.log`.

| `run` exit | Meaning |
| --- | --- |
| 0 | The agent's report was sent. |
| 1 | The agent wrote no usable report, and the runner's `failed` report was sent. |
| 2 | `GSTACK_REPORT_ADAPTER` in the task file names no adapter. The agent's report stays in its run folder. |
| 3 | The Telegram credentials in the task file are missing. Run Setup, then `add` again. |
| 4 | Telegram refused the message or could not be reached. A send that never connected was tried 5 times, 30 seconds apart. |
| 5 | `report.mjs` crashed. The log holds its stderr. |

## Platform notes

- **Windows.** The task is `gstack\<name>` in Task Scheduler. It runs only while the user is logged on, wakes the machine to run, runs on battery, and catches up after a missed start. While it runs, a console window shows. If `claude` is the npm `.cmd` shim, the flags after `--` cannot contain any of `" % ^ & | < > !`, because cmd.exe would read them.
- **macOS.** The job is `com.gstack.<name>`, defined in `~/Library/LaunchAgents/com.gstack.<name>.plist`. launchd runs a job missed during sleep at the next wake, and skips one missed while the machine was off.
