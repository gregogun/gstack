# Post-deploy smoke

A deploy can pass every earlier check and still be broken in production: a missing secret, a bad migration, a CDN that serves the old build. The smoke check runs against the deployed URL right after each deploy. Its stop-ship triggers are written before the deploy, so a bad deploy is rolled back by rule and nobody argues for it mid-incident.

Start from [`post-deploy-smoke.yml`](post-deploy-smoke.yml). Replace `scripts/deploy.sh`, `scripts/rollback.sh`, and the smoke command with the project's own. Keep the job structure.

## Stop-ship triggers

Write these into the repo (the deploy runbook or the top of the workflow) before the first deploy, and change them only in a reviewed commit. Any one trigger rolls the deploy back.

1. The smoke job exits non-zero. It runs with `--retries=0`: a smoke failure is never retried into a pass.
2. The smoke job does not finish inside its timeout. A hang counts as a failure.
3. The deploy URL is empty or unreachable. The smoke job reads `needs.deploy.outputs.url` into `BASE_URL`. Its first step fails the run on a blank value, so the suite never falls back to a default base URL, and on a URL that does not answer.
4. A main-path check returns a 5xx, or the page logs a console error. The workflow does not check this. The smoke suite must assert it, on every main path: load the home page, sign in, and the one action users come for.
5. The health endpoint reports a version other than the commit just deployed, so the old build is still serving. The `Check deployed version` step greps the health response for `$GITHUB_SHA`. Replace its `/health` path with the endpoint that reports the running commit.

Add a trigger for each failure that ever reached production. A trigger needs a rule a script can decide, not a judgment call such as "looks slow".

## Rollback by rule

The `rollback` job runs when `smoke` fails and `deploy` succeeded. It redeploys the release the deploy job recorded as `previous` and files an issue labeled `deploy-rollback` that links the run. Nobody has to approve it. A deploy that failed itself has nothing new to roll back, so the job skips.

The rollback script must be idempotent: running it twice leaves the same release live. Prove it once by deploying a planted failure to staging, and confirm the rollback runs and the previous release serves again.

## Pass the deploy URL

A step output is visible only inside its own job. The `deploy` job in [`post-deploy-smoke.yml`](post-deploy-smoke.yml) declares the URL under a job-level `outputs:` key that maps to the `deploy` step output, and the `smoke` job reads it as `needs.deploy.outputs.url` through `needs: deploy`.

Without the `outputs:` block, `needs.deploy.outputs.url` is empty and the smoke test runs against a blank base URL. `actionlint` reports this as `property "url" is not defined in object type {}`. Run `actionlint` on the workflow after any edit.

## Checks

- Action versions: `actions/checkout`, `actions/setup-node`, and `actions/upload-artifact` are at v7 (releases v7.0.1, v7.1.0, v7.0.2 as of this writing). Recheck against the actions' release pages before copying.
- Never run the deploy workflow to test it. Lint it with `actionlint`, and prove the smoke command locally against a staging URL.
