# Playwright for web verification

Playwright drives the browser to prove a change. Chrome DevTools is for debugging: performance traces, heap snapshots, and network or console inspection while you look for a cause. A proof comes from a Playwright run, never from a DevTools session.

## Pick the driver

- **The project's Playwright test runner** runs the proof. Use the repo's own config and script, for example `npx playwright test tests/login.spec.ts`. The spec, its report, and its trace are the evidence.
- **`@playwright/cli`** is the interactive loop when you work in a shell. Install it with `npm install -g @playwright/cli@latest`. Run `playwright-cli open <url>`, read `playwright-cli snapshot` for element refs, then act on a ref with `playwright-cli click e15`. To step through a test, start it paused in the background with `PLAYWRIGHT_HTML_OPEN=never npx playwright test <spec> --debug=cli`. Then attach with `playwright-cli attach <session>`, using the session name the run prints. After you attach, `snapshot`, `console error`, `step-over`, and `resume` work on the paused test.
- **Playwright MCP** (`@playwright/mcp`) is the fallback when the host has no shell loop.

An exploration in `playwright-cli` finds the steps. Write them into a spec and run the spec for the proof.

## Locators

Use the first locator that fits, in this order:

1. `getByRole` with the accessible name, for example `getByRole('button', { name: 'Sign in' })`.
2. `getByLabel` for form controls.
3. `getByPlaceholder`, when an input has no label.
4. `getByText` for non-interactive content.
5. `getByAltText` and `getByTitle`.
6. `getByTestId`, when no user-facing handle is stable.

CSS and XPath selectors depend on DOM structure and break when the markup changes. A locator that matches several elements is a bug in the test. Narrow it with a parent locator or a more exact name, not with `.first()`.

## Waits

Wait on the state the user sees. Actions auto-wait for the element to be actionable, and web-first assertions such as `await expect(locator).toBeVisible()` and `await expect(page).toHaveURL(/dashboard/)` retry until they pass or time out.

These waits are banned in a proof:

- `page.waitForTimeout(ms)`. The docs say tests that wait for time are inherently flaky.
- `waitUntil: 'networkidle'`. The docs mark it discouraged for testing.
- `page.waitForNavigation()`. It is deprecated and racy. Use `page.waitForURL()`.

## Auth with storage state

Log in once in a setup project and reuse the saved state.

```ts
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_USER!);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```

```ts
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
```

Add `playwright/.auth` to `.gitignore`, because the file holds session cookies. A test that must start signed out sets `test.use({ storageState: { cookies: [], origins: [] } })`. A proof of the login flow itself drives the real form and does not reuse saved state.

## HAR recording

A HAR file replays recorded network traffic. Use it only where a production boundary already isolates the external system, such as a third-party API. Record with `update: true`, then replay with `update: false`.

```ts
await page.routeFromHAR('./hars/payments.har', { url: '**/api/payments/**', update: true });
```

From the shell, `npx playwright open --save-har=payments.har --save-har-glob="**/api/payments/**" <url>` records the same file. Never replay the app's own backend in a proof. That hides the browser-server line the proof exists to cross.

## Steps

Wrap each user action in `test.step` so the report and the trace read as the journey.

```ts
await test.step('add item to cart', async () => {
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('status')).toHaveText('1 item in cart');
});
```

`test.step` returns the callback's value. Pass `{ box: true }` to report an error at the step's call site instead of inside the step.

## Console errors

Collect console errors and uncaught page errors for the whole test, and fail on any new one.

```ts
const errors: string[] = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(err.message));
// ...drive the journey...
expect(errors).toEqual([]);
```

A known error that predates the change goes in a named allowlist with a linked issue, not in a broader filter.

## Accessibility

Scan each changed route with `@axe-core/playwright`.

```ts
import AxeBuilder from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();
await testInfo.attach('axe-results', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
expect(results.violations).toEqual([]);
```

`results.incomplete` lists the nodes axe could not decide, which axe calls "needs review". Report each one to the human with its rule ID and target. An incomplete result neither passes nor fails the proof. `.exclude()` turns off every rule for the excluded element and its descendants, so exclude only a known issue that has a linked ticket.

## Visual baselines

`await expect(page).toHaveScreenshot('checkout.png')` compares against a committed baseline. Run `npx playwright test --update-snapshots` only for an intentional UI change, and commit the new baseline in the same commit as that change. A screenshot diff on a change that should not move pixels is a failure to explain, not a baseline to regenerate.

## Sources

- Locators: <https://playwright.dev/docs/locators>
- Auto-waiting: <https://playwright.dev/docs/actionability>
- Banned waits: <https://playwright.dev/docs/api/class-page>
- Storage-state auth: <https://playwright.dev/docs/auth>
- HAR: <https://playwright.dev/docs/mock>
- `test.step`: <https://playwright.dev/docs/api/class-test#test-step>
- Accessibility: <https://playwright.dev/docs/accessibility-testing>, axe result types: <https://github.com/dequelabs/axe-core/blob/develop/doc/API.md>
- `@playwright/cli`: <https://playwright.dev/docs/getting-started-cli>
- `--debug=cli`: <https://playwright.dev/agent-cli/commands/test-debugging>
