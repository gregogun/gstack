---
name: dossier
description: "Turn a failed Playwright run into one Markdown file per failure, each with the error, a screenshot link, a trace command and a shell-safe command that reruns that test alone. Then read the trace before changing code. Use for /dossier, \"why did the e2e tests fail\", or to set up a hook that writes dossiers after every failed test command."
disable-model-invocation: true
---

# Dossier

A dossier is one failure's evidence in one file. Read it, then the trace, and only then touch code.

## Steps

1. **Check the config.** The script reads Playwright's JSON report. In `playwright.config.*`, confirm these settings, and offer to add any that are missing:
   - `reporter` includes `['json', { outputFile: 'playwright-report/report.json' }]`
   - `use.trace` is `'retain-on-failure'`
   - `use.screenshot` is `'only-on-failure'`

   Done when the config has all three, or the user declined.
2. **Run.** From the Playwright project root, after a failed run, run `node {{plugin_root}}/skills/dossier/scripts/dossier.mjs`. Pass `--report <file>` if the report lives elsewhere and `--out <dir>` to change the default `playwright-report/dossier`. It prints one dossier path per line and exits 0. A rerun replaces the old dossiers. Exit 2 means the report was missing or not JSON. Done when the paths are printed. If none are printed, the run had no failures.
3. **Read.** Read every dossier. Each has the status, project, location, every error message, links to the screenshot and trace, and a Reproduce command. A dossier titled "The run failed before or outside any test" means a spec file failed to load or a global hook threw. Fix that first, because no test ran. Done when you can name the failing assertion or error for each dossier.
4. **Trace.** For each test failure that has a trace, open it with the dossier's `npx playwright show-trace` command before changing code. Find the action that took far longer than the ones around it, or the last action before the error. At that action, check the DOM snapshot, then the network tab, then the console. Done when you can name the action where the test and the app diverged and what the page showed there.
5. **Rerun one.** Run the dossier's Reproduce command from the directory it names. It selects that test alone. The words are single-quoted for a POSIX shell, so titles holding `$`, backticks or quotes reach Playwright unchanged. On Windows, run it from Git Bash or WSL. Done when it fails the same way, or passes and you report the failure as flaky.

Then fix the cause through the **diagnosing-bugs** skill ([`../diagnosing-bugs/SKILL.md`](../diagnosing-bugs/SKILL.md)), using the Reproduce command as its loop.

## Hook

Set this up only when the user asks for dossiers after every failed run. In Claude Code, a `PostToolUseFailure` hook runs after any Bash command that fails. The script then writes dossiers only when the report changed during that command, so a failed lint or build adds nothing. When it writes them, it returns the list as `additionalContext`, and the agent sees it on its next turn.

1. Copy `{{plugin_root}}/skills/dossier/scripts/dossier.mjs` to `.claude/hooks/dossier.mjs` in the project. The plugin's folder changes with each update, so the project needs its own copy.
2. Ask before editing settings. Add this to `.claude/settings.json`, or to `.claude/settings.local.json` for this user only:

   ```json
   {
     "hooks": {
       "PostToolUseFailure": [
         {
           "matcher": "Bash",
           "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/dossier.mjs\" --hook" }]
         }
       ]
     }
   }
   ```

   The hook resolves `--report` and `--out` against the command's working directory. If Playwright runs from a subfolder, add `--report <subfolder>/playwright-report/report.json --out <subfolder>/playwright-report/dossier`.

Done when a deliberately failing test run puts the dossier list in context.
