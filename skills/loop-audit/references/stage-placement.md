# Stage placement

Place each check on the earliest enforced stage it is fast enough for, starting at pre-commit. The edit loop is where the agent runs checks for itself, and nothing enforces it. Measure the speed with a warm cache on the machine that runs the stage, not from memory. A check can run on more than one stage. CI runs all of them again.

| Stage | Runs | Budget | Put here |
|---|---|---|---|
| Edit loop | after each meaningful edit, by the agent | seconds | type check or test of the touched file, watch mode |
| pre-commit | `git commit`, on staged files only | under 10 s in total | format, lint, and type checks scoped to staged files, secret scan |
| pre-push | `git push` | under 2 min in total | unit tests, full type check, build |
| CI | every push and PR, clean environment | as long as merge can wait | the superset: every check above on a fresh checkout and install, plus integration and end-to-end suites |
| Nightly | on a schedule | no limit | slow checks that catch drift: full cross-browser end-to-end, dependency and license audits, fresh-install from the lockfile, link checks, flaky-test reruns |
| Post-deploy | after each deploy, against the deployed URL | a few minutes | smoke checks of the main user paths, with stop-ship triggers written before the deploy |

Rules:

- When a stage's total runs over its budget, move its slowest check one stage later. Do not drop it.
- CI is the clean-environment superset. A check that runs only in a hook is not enforced, since hooks can be skipped and are not installed on every clone.
- Nightly holds only checks too slow for CI or that catch drift with no code change. Each nightly failure becomes an issue, a PR, or a file an agent reads. A red run nobody sees is a missing loop. [`nightly.yml`](nightly.yml) files an issue and uploads the log.
- A required CI check is named in branch protection. Renaming the job silently drops the requirement, so check branch protection after a rename.

## Hook managers

Use the manager the repo already has. With none, take the one that fits the stack.

| Manager | Fits | Config | Install on clone | Staged files | Stage a hook |
|---|---|---|---|---|---|
| Husky v9 | Node | one shell file per hook in `.husky/` | `"prepare": "husky"` in `package.json` | pair with `lint-staged` in `.husky/pre-commit` | `.husky/pre-push` |
| Lefthook v2 | any stack, one binary | `lefthook.yml` | `lefthook install`, or the npm package's postinstall | `{staged_files}` in `run`, filtered by `glob` | a top-level `pre-push:` key |
| pre-commit | Python or polyglot | `.pre-commit-config.yaml` | `pre-commit install` | passes staged files by default | `stages: [pre-push]` on the hook, and `default_install_hook_types: [pre-commit, pre-push]` so `pre-commit install` installs both |

Lefthook example with staged-file checks on pre-commit and tests on pre-push:

```yaml
pre-commit:
  jobs:
    - name: lint
      run: npx eslint --fix {staged_files}
      glob: "*.{js,ts,jsx,tsx}"
      stage_fixed: true
    - name: format
      run: npx prettier --write {staged_files}
      glob: "*.{js,ts,jsx,tsx,json,md}"
      stage_fixed: true

pre-push:
  jobs:
    - name: test
      run: npm test
```

The jobs run in order, so the two fixers never rewrite the same file at once. `stage_fixed: true` adds the fixed files back to the commit, and works only on pre-commit.

Each manager has its own off switch, listed in [`anti-bypass.md`](anti-bypass.md).
