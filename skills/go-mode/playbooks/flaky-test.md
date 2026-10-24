### Flaky test

**You own the flake until it is fixed or quarantined with an issue.** Delegate the fix to a subagent on the `bug-fix` model role, and stay in the lead. Set each subagent's model and effort per the Subagents section.

Retries are a ceiling, not a fix. Keep every retry count where you found it: the config's `retries`, `test.describe.configure`, and the `--retries` flag. A flake that passes on retry still has its cause.

1. Count failures. Run the test ten times with the project's Playwright test runner:

   ```sh
   npx playwright test <file>:<line> --repeat-each=10 --retries=0 --trace=on
   ```

   `--retries=0` makes each repeat count once, since a retry turns a failure into a "flaky" pass. `--trace=on` keeps a passing trace to compare against. Read the failed count from the summary and route:
   - **0 of 10.** The test fails only in CI. Rerun the count under CI's conditions: its `CI` env var, worker count, browser project, base URL, and the same test files and `--shard` as the CI job that failed. Once it goes red, route by the new count. If it stays green after you match every condition, stop and report that it does not reproduce, with CI's trace or logs.
   - **1 to 3 of 10.** A real flake. Go to step 2.
   - **4 or more of 10.** The test is broken, not flaky. Stop here and switch to the **Bug fix** playbook (`bug-fix.md`).
2. Classify the flake before you change code. Open a failed repeat's trace with `npx playwright show-trace test-results/<test-dir>/trace.zip`, and open a passing repeat's trace beside it. Find the first action where the two differ. Put the flake in one bucket and cite the trace evidence:
   - **Timing race.** An action or assertion ran before the app was ready: a click before a response landed, a one-shot read such as `expect(await locator.textContent())` instead of a web-first `await expect(locator).toHaveText()`, or a `waitForTimeout`. The failed trace often shows one action that took far longer than the rest.
   - **Leaked state.** The test fails only after other tests run in its worker: shared accounts, database rows, storage, or module-level variables. Confirm it by running the test alone, then its whole file with `--workers=1`.
   - **Ambiguous locator.** A strict-mode violation, or the locator resolved to a different element than in the passing trace.
   - **Config or auth mismatch.** Expired or missing storage state, or a base URL, env var, or project that differs from where the test passes.

   A flake with no bucket and no trace evidence is not classified yet. Run more repeats until two traces differ, then classify.
3. Fix the cause the bucket names, per the **fix-root-causes** principle skill. Wait on the specific condition, isolate state per test, pin the locator by role, label, or test id, or align the config. A `waitForTimeout` or a raised retry count hides the flake and does not ship.
4. Verify by repeating the run that went red, now with `--repeat-each=30`. Keep its conditions: the CI settings from step 1, or the whole file with `--workers=1` for leaked state. Thirty clean repeats is the bar, because a test that fails one run in ten still passes ten in a row about a third of the time.
5. Quarantine only when the fix cannot land in this task. Open an issue for the flake first, and put its URL in the annotation:

   ```ts
   test.fixme('checkout applies the coupon', {
     annotation: { type: 'issue', description: 'https://github.com/<owner>/<repo>/issues/<n>' },
   }, async ({ page }) => {
     // test body unchanged
   });
   ```

   Use `test.fixme()` for a test that fails only some runs. It does not run the test, so the linked issue owns turning it back on. `test.fail()` with the same annotation fits only a test that fails every run, and Playwright reports it as unexpected once it passes, so the run fails until someone removes the quarantine. When it fails every run only under one condition, call `test.fail(<condition>, '<issue URL>')` inside the body instead, so the other environments stay green. On a test that fails only some runs, `test.fail()` fails the run each time the test passes.
6. Run **Opening a PR**.

**Reply:** paste the step 1 count verbatim, and the step 4 count when you fixed the flake. Name the bucket with its trace evidence, the fix, and the quarantine issue link if you quarantined.
