---
name: report
description: "Send a short status report on the current work to the user's phone through Telegram, or print it. Use for /report, \"send me an update\", or to set up the Telegram bot the report goes through."
disable-model-invocation: true
---

# Report

A report is what the user reads on their phone with no other context. Write each line so it stands alone: the outcome, what blocks it, and the next action.

## Steps

1. **Write the report.** Write it as JSON to `runs/<YYYY-MM-DDTHHmm>-<slug>/report.json` under the gstack state folder, which is `%LOCALAPPDATA%\gstack` on Windows (`$LOCALAPPDATA/gstack` from Git Bash) and `~/.gstack` elsewhere. Create the folders if needed. The file stays as the record of what was sent, including when delivery fails.

   ```json
   {
     "title": "Nightly dependency upgrade",
     "status": "blocked",
     "summary": "Upgraded 4 of 5 packages. Tests pass on all four.",
     "completed": ["react 19.2", "vite 7.1"],
     "blockers": ["eslint 10 drops the flat-config shim our config uses"],
     "next": ["Pin eslint 9, or migrate the config. Your call."],
     "links": [{ "label": "PR", "url": "https://github.com/owner/repo/pull/12" }]
   }
   ```

   `title` and `status` are required. `status` is one of `done`, `running`, `blocked` or `failed`. The rest are optional, and empty lists are left out of the message. Any other field is rejected. Every claim carries its evidence, as in "tests pass on all four", not "should work". Link only a PR, branch or file you produced or read. Done when the file exists and every list item is one sentence.
2. **Send it.** Run `node {{plugin_root}}/skills/report/scripts/report.mjs <path-to-report.json>`. It sends through the adapter named by `--adapter`, else `GSTACK_REPORT_ADAPTER`, else `telegram`. `--adapter stdout` prints the message without sending it. Done when the command exits 0.

   | Exit | Meaning | Do |
   | --- | --- | --- |
   | 2 | The report or the arguments are invalid. stderr names each problem. | Fix the JSON and rerun. |
   | 3 | The Telegram credentials are not set. | Run Setup with the user. |
   | 4 | Telegram refused the message or could not be reached. | Tell the user the error and the report's path. Never resend in a loop, because a send that timed out may still have arrived. |
   | other | The script crashed. | Show the user stderr and the report's path. |

## Setup

Run this once per machine, when the user asks or when Send exits 3. The user does each step, because the token is theirs.

1. In Telegram, message `@BotFather`, send `/newbot`, and copy the token it returns.
2. Send any message to the new bot. Then open `https://api.telegram.org/bot<token>/getUpdates` in a browser, find the update that holds that message, and copy its `message.chat.id`. Clear that page from the browser history afterwards, because the URL holds the token.
3. Store both as user environment variables, never in a repo.
   - Windows, in PowerShell: `[Environment]::SetEnvironmentVariable('TELEGRAM_BOT_TOKEN', (Read-Host 'Token'), 'User')`, then the same for `TELEGRAM_CHAT_ID`. `Read-Host` keeps the token out of the shell history, which `setx` on the command line does not. A Task Scheduler task sees both when it runs as this user.
   - macOS and Linux: export both in the shell profile. A launchd job does not read the profile, so set them in the job's `EnvironmentVariables` too.
   - Then restart Claude Code and the terminal or IDE it runs in. A variable reaches only processes started after it was set.
4. Check it. Done when `--adapter stdout` prints a sample report and the same file without the flag arrives on the phone.
