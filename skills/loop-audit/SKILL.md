---
name: loop-audit
description: "Audit a project's feedback loops (agent rules, static checks, git hooks, end-to-end proof, failure output, CI, nightly, post-deploy smoke), name the weakest one, and build its fix. Use for /loop-audit, \"which checks does this repo have\", or setting up hooks, CI, or nightly checks."
disable-model-invocation: true
---

# Loop audit

A feedback loop is any check that tells an agent its work is wrong before a human has to. List every loop the project has and every loop it lacks, then fix the weakest one. The audit ends in a change, not a report.

## 1. Find each loop

Walk the loops in this table. For each one, find the real command that runs it in the config, then run it and time it. Run only local, read-only checks. For a deploy, release, or publish step, read the config and its recent runs (`gh run list --workflow <file> --limit 3`) and never run it.

A loop counts as missing when it never runs, or when it cannot run: a tool error, a bad config, a hang, or a red result on a clean checkout of the default branch for a reason other than a bug in the code. A loop that goes red on a real bug is working.

| Loop | Present when | Look in |
|---|---|---|
| Agent rules | An instruction file tells agents how to build, test, and prove a change, and each rule points at what enforces it | `AGENTS.md`, `CLAUDE.md`, `{{project_skills_dir}}/`, the **correct** skill's rule table |
| Static checks | Types, lint, and format run from one command and fail on a bad change | `package.json` scripts, `tsconfig.json`, lint and format configs, `Makefile`, `pyproject.toml` |
| Git hooks | The install command a fresh clone runs installs the hooks, and the hooks run the checks placed on their stage. Check by cloning to a scratch directory and running that install command | `.husky/`, `lefthook.yml`, `.pre-commit-config.yaml`, `lint-staged` config, `core.hooksPath`, the `prepare` script |
| End-to-end proof | A script drives the real app the way a user does and fails when the behavior breaks | e2e suites, a `verify-*` skill, Playwright or similar config |
| Failure output | A failing run leaves a short readable account (error, location, reproduce command, trace or log path) an agent can act on without help | test reporter config, CI artifacts, failure scripts |
| CI | Every push or PR runs the full set of checks in a clean environment, and a red run blocks merge | `.github/workflows/`, other CI configs, branch rules (`gh api repos/<owner>/<repo>/rules/branches/<branch>`, then `gh api repos/<owner>/<repo>/branches/<branch>/protection`, where a 404 means no classic protection, not no rules) |
| Nightly | Slow drift checks run on a schedule, and each failure lands as an issue, a PR, or a file an agent reads | scheduled workflows, cron jobs |
| Post-deploy smoke | A check runs against the deployed URL after each deploy, with stop-ship triggers written before the deploy | deploy workflows, release scripts |

Step 1 is done when every row has a command you ran with its exit code and duration, a workflow file with its latest runs, or the evidence that the loop is missing.

## 2. Check the stage of each check

Place every check you found on a stage by its measured speed, per [`references/stage-placement.md`](references/stage-placement.md). A check on the wrong stage is a weak loop even when it passes. A slow check on pre-commit trains agents to skip hooks, and a fast check that runs only in CI makes the agent wait a full CI run for the result.

Step 2 is done when every check has a stage and every misplaced check is listed with its measured time.

## 3. Look for quiet bypasses

Run the checklist in [`references/anti-bypass.md`](references/anti-bypass.md) over the guardrail files and their recent history. A bypass turns a present loop into a missing one.

Step 3 is done when you have read the recent diff of every guardrail file the checklist names.

## 4. Write the audit table

Write one row per loop, all eight rows, in this shape:

| Loop | Stage | Command | Evidence |
|---|---|---|---|
| Static checks | pre-push, CI | `npm run check` (exit 0, 41 s) | `package.json` `check` script |
| Nightly | none | missing, proposed: scheduled workflow from `references/nightly.yml` running `npm run test:e2e` | no `schedule:` trigger in `.github/workflows/` |

Every Command cell holds a real command you ran, a workflow with its latest runs, or `missing, proposed: <the concrete command or file to add>`. Put each bypass in its loop's Evidence cell. Under the table, list every misplaced check and every bypass.

## 5. Name the weakest loop

Rank the loops from weakest to strongest:

1. Missing, or present but bypassed.
2. Present but never blocks: it runs, and a failure does not stop the commit, push, merge, or deploy.
3. Present but on the wrong stage for its speed.
4. Present, enforced, and placed right.

Within one rank, the weakest loop is the one whose gap let through the most recent failures. Read `git log`, reverts, and recent red CI runs, and map each failure to the earliest loop that would have caught it. A type or lint error fixed after merge maps to static checks. A break that passed local checks and failed in CI maps to git hooks. A behavior break no test caught maps to end-to-end proof. A failure found in production maps to post-deploy smoke.

If the history gives no tiebreak, take the first tied loop in this order: static checks, CI, git hooks, end-to-end proof, failure output, nightly, post-deploy smoke, agent rules. Each loop in that order needs the ones before it. Agent rules come last because nothing fails when an agent skips one.

State the weakest loop and the evidence that ranked it.

## 6. Build the fix

Build the fix for the weakest loop on a branch, not on the default branch:

- **Static checks.** If the **project-guardrails** skill is installed (your skill list names it, or `{{project_skills_dir}}/project-guardrails/SKILL.md` or `{{user_skills_dir}}/project-guardrails/SKILL.md` exists), read it and set up the static checks through it, with the audit table as input. This applies to any fix that needs a new static check, such as a hook that runs a lint the repo lacks. Without that skill, add the check to the one command that runs the static layer.
- **Git hooks.** Use the hook manager the repo already has, and place each check per [`references/stage-placement.md`](references/stage-placement.md). With no manager, pick the one that matches the stack from that reference.
- **Nightly.** Start from [`references/nightly.yml`](references/nightly.yml). Replace its setup, install, and check steps with the project's stack and slow checks. Keep its upload and issue steps.
- **End-to-end proof.** Use the **create-verification-skill** skill ([`../create-verification-skill/SKILL.md`](../create-verification-skill/SKILL.md)).
- **Agent rules.** Use the **correct** skill ([`../correct/SKILL.md`](../correct/SKILL.md)), so each rule points at what enforces it.
- **Any other loop.** Add the smallest config or script that makes the loop present, enforced, and placed right.

The fix edits guardrail files, so state the reason for each edit in the commit message and the reply.

Then prove the fix. Plant a failure the loop should catch, run the loop, and confirm it goes red with output that names the failure. Remove the plant, run it again, and confirm it goes green. For a loop that runs remotely, run its check command red and green locally. Then prove the wiring on a pushed branch or PR when the loop triggers there, as CI does. A scheduled workflow can be dispatched only from the default branch, so prove its trigger after merge with `gh workflow run`. Close any issue the proof files.

The fix is done when the weakest loop's row would now move to rank 4, and both runs are recorded. Fix one loop per run. List the other gaps as proposals for the next run.

**Reply:** the audit table, the misplaced checks and bypasses, the weakest loop with the evidence that ranked it, the fix with its red and green runs and the reason for each guardrail edit, and the next loop to fix.
