---
name: loop-audit
description: "Audit a project's feedback loops (agent rules, static checks, git hooks, end-to-end proof, failure output, CI, nightly, post-deploy smoke), name the weakest one, and build its fix. Use for /loop-audit, \"which checks does this repo have\", or setting up hooks, CI, or nightly checks."
disable-model-invocation: true
---

# Loop audit

A feedback loop is any check that tells an agent its work is wrong before a human has to. List every loop the project has and every loop it lacks, then fix the weakest one. The audit ends in a commit, not a report.

## 1. Find each loop

Walk the loops in this table, in order. For each one, find the real command that runs it: read the config, then run the command and time it. A loop that exists in config but fails, hangs, or never runs counts as missing.

| Loop | Present when | Look in |
|---|---|---|
| Agent rules | An instruction file tells agents how to build, test, and prove a change, and each rule points at what enforces it | `AGENTS.md`, `CLAUDE.md`, `{{project_skills_dir}}/`, the **correct** skill's rule table |
| Static checks | Types, lint, and format run from one command and fail on a bad change | `package.json` scripts, `tsconfig.json`, lint and format configs, `Makefile`, `pyproject.toml` |
| Git hooks | A hook manager installs hooks on a fresh clone and the hooks run the checks placed on that stage | `.husky/`, `lefthook.yml`, `.pre-commit-config.yaml`, `lint-staged` config, `core.hooksPath`, the `prepare` script |
| End-to-end proof | A script drives the real app the way a user does and fails when the behavior breaks | e2e suites, a `verify-*` skill, Playwright or similar config |
| Failure output | A failing run leaves a short readable account (error, location, reproduce command, trace or log path) an agent can act on without help | test reporter config, CI artifacts, failure scripts |
| CI | Every push or PR runs the full set of checks in a clean environment, and a red run blocks merge | `.github/workflows/`, other CI configs, branch protection (`gh api repos/<owner>/<repo>/branches/<branch>/protection`) |
| Nightly | Slow drift checks run on a schedule, and each failure lands as an issue, a PR, or a file an agent reads | scheduled workflows, cron jobs |
| Post-deploy smoke | A check runs against the deployed URL after each deploy, with stop-ship triggers written before the deploy | deploy workflows, release scripts |

Step 1 is done when every row has either a command you ran, with its exit code and duration, or the evidence that it is missing.

## 2. Check the stage of each check

Place every check you found on a stage by its measured speed, per [`references/stage-placement.md`](references/stage-placement.md). A check on the wrong stage is a weak loop even when it passes. A slow check on pre-commit trains agents to skip hooks, and a fast check that runs only in CI makes the agent wait a full CI run for the result.

## 3. Look for quiet bypasses

Run the checklist in [`references/anti-bypass.md`](references/anti-bypass.md) over the guardrail files and their recent history. A bypass turns a present loop into a missing one, so record it in the loop's row.

## 4. Write the audit table

Write one row per loop, all eight rows, in this shape:

| Loop | Stage | Command | Evidence |
|---|---|---|---|
| Static checks | pre-push, CI | `npm run check` (exit 0, 41 s) | `package.json` `check` script |
| Nightly | none | missing, proposed: scheduled workflow from `references/nightly.yml` running `npm run test:e2e` | no `schedule:` trigger in `.github/workflows/` |

The Command cell holds a real command you ran or `missing, proposed: <the concrete command or file to add>`. Never leave a row as "unknown". Under the table, list every misplaced check and every bypass you found.

## 5. Name the weakest loop

Rank the loops from weakest to strongest:

1. Missing, or present but bypassed.
2. Present but never blocks: it runs, and a failure does not stop the commit, push, merge, or deploy.
3. Present but on the wrong stage for its speed.
4. Present, enforced, and placed right.

Within one rank, the weakest loop is the one whose gap let through the most recent failures. Read `git log`, reverts, and recent red CI runs for that evidence. If the history gives no tiebreak, take the loop earliest in the table, since it gives the cheapest feedback. State the weakest loop and the evidence that ranked it.

## 6. Build the fix

Build the fix for the weakest loop in this run, in one commit:

- **Static checks.** If the **project-guardrails** skill is installed (your skill list names it, or `{{project_skills_dir}}/project-guardrails/SKILL.md` or `{{user_skills_dir}}/project-guardrails/SKILL.md` exists), read it and set up the static layer through it. Pass it the audit table and the checks to add, and stop there for that layer. Otherwise add the missing check to the one command that runs the static layer.
- **Git hooks.** Use the hook manager the repo already has, and place each check per [`references/stage-placement.md`](references/stage-placement.md). With no manager, pick the one that matches the stack from that reference.
- **Nightly.** Start from [`references/nightly.yml`](references/nightly.yml) and replace its check command with the project's slow checks.
- **End-to-end proof.** Use the **create-verification-skill** skill ([`../create-verification-skill/SKILL.md`](../create-verification-skill/SKILL.md)).
- **Agent rules.** Use the **correct** skill ([`../correct/SKILL.md`](../correct/SKILL.md)), so each rule points at what enforces it.
- **Any other loop.** Add the smallest config or script that makes the loop present, enforced, and placed right.

Then prove the fix. Plant a failure the loop should catch, run the loop, and confirm it goes red with output that names the failure. Remove the plant, run it again, and confirm it goes green. Record both runs.

The fix is done when the weakest loop's row would now move to rank 4, and both runs are recorded. Fix one loop per run. List the other gaps as proposals for the next run.

**Reply:** the audit table, the misplaced checks and bypasses, the weakest loop with the evidence that ranked it, the fix with its red and green runs, and the next loop to fix.
