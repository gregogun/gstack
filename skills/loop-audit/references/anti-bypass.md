# Anti-bypass checklist

A guardrail is bypassed when a change makes a check pass without making the code pass it. Most bypasses are quiet. They edit the guardrail files instead of the code.

## Guardrail files

These files hold the loops. Flag a change to any of them whose commit states no reason, or whose PR has no approving review (`gh pr view <n> --json reviews`).

- Hook configs: `.husky/`, `lefthook.yml` and `lefthook-local.yml`, `.pre-commit-config.yaml`, the `lint-staged` config, the `prepare` script, `core.hooksPath`.
- CI and deploy workflows: `.github/workflows/`, other CI configs, branch protection.
- Static check configs: lint, format, and type configs, such as `eslint.config.*`, `.prettierrc*`, `tsconfig*.json`, `ruff.toml`, `pyproject.toml` tool sections.
- Test configs: runner config, coverage thresholds, retry counts, snapshot and visual baselines.
- Agent rules: `AGENTS.md`, `CLAUDE.md`, harness hook settings.

List recent changes to them:

```sh
git log --since=90.days -p -- .husky lefthook.yml .pre-commit-config.yaml .github/workflows package.json 'eslint.config.*' 'tsconfig*.json'
```

Add the repo's other guardrail paths to the command, and widen the window if the repo is quiet. Check each diff against the list below. History cannot see gitignored local configs such as `lefthook-local.yml` or `~/.config/husky/init.sh`, so read those files directly.

## What to flag

| Bypass | How it shows in a diff |
|---|---|
| Narrowed glob | A hook, lint, or test glob or `files` pattern matches fewer files, such as `src/**/*.ts` becoming `src/core/**/*.ts`, or a new `exclude`, `ignores`, or `.eslintignore` entry |
| Removed or renamed check | A hook job, CI job, or script disappears or changes name. A renamed CI job drops out of branch protection's required checks |
| Step moved to a later stage | A check moves from pre-commit to pre-push, from a hook to CI, or from CI to nightly, without a measured speed that requires it |
| Failure no longer blocks | `continue-on-error: true`, `\|\| true`, `set +e`, `--passWithNoTests`, `--max-warnings` raised, a lint rule from `error` to `warn` |
| Weaker threshold | A lower coverage threshold, a higher retry count, a looser timeout, a looser type flag such as `strict: false` or `skipLibCheck` added |
| Skipped test | `.skip`, `.only`, `xit`, `test.fixme`, a `@skip` marker, or a quarantine without a linked issue |
| Inline suppression | A new `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `# noqa`, or `# type: ignore` without a reason on the line |
| Regenerated baseline | A snapshot or visual baseline updated in a commit with no intended change to that UI or output |

## Hook skips

These skip hooks. Flag any of them in agent instructions, package scripts, and shell aliases. `HUSKY=0` or `LEFTHOOK=0` on a CI install step is expected, since CI runs the checks itself. A commit made with a skip leaves no trace in history, so CI must rerun the hook checks on every change.

| Skip | Effect |
|---|---|
| `git commit --no-verify`, `git commit -n`, a cluster such as `-nm` or `-anm`, an abbreviation such as `--no-veri` | Skips the pre-commit and commit-msg hooks |
| `git push --no-verify` | Skips the pre-push hook |
| `git merge --no-verify` | Skips the pre-merge-commit and commit-msg hooks |
| `git -c core.hooksPath=<dir>`, or a changed `core.hooksPath` | Runs hooks from another directory, or none |
| `HUSKY=0`, or `export HUSKY=0` in `~/.config/husky/init.sh` | Skips Husky hooks, for one command or on the whole machine |
| `LEFTHOOK=0`, `LEFTHOOK=false` | Skips Lefthook |
| `LEFTHOOK_EXCLUDE=<tags or names>` | Skips those Lefthook jobs |
| `SKIP=<hook ids>` | Skips those pre-commit framework hooks |

`-n` is a hook skip only on `git commit`. On `git log -n 5` or `grep -n`, it means something else.
