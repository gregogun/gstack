---
name: control-ui
description: Route browser work by the job. Playwright drives a web UI to prove a change, the chrome-devtools CLI debugs it to find a cause, and a local CDP harness covers Electron, IDEs, and what neither tool reaches. Use for UI verification, screenshots, accessibility snapshots, perf traces, heap snapshots, console or network logs, visual diffs, or reproducing UI bugs.
---

# Control UI

Pick the tool by the verb, then collect evidence with it. **Drive** a page to prove a change works. **Debug** a page to find out why something is wrong. A bug fix does both. Debug to find the cause, then drive to prove the fix.

## Pick the tool

Take the first tool in the row that is available and reaches the surface.

| Verb | First | Next | Last resort |
|---|---|---|---|
| Drive | The repo's Playwright test runner | `@playwright/cli`, when the repo has no Playwright tests | [Generic Web Harness](#generic-web-harness) |
| Debug | The `chrome-devtools` CLI, per [Debug with the chrome-devtools CLI](#debug-with-the-chrome-devtools-cli) | Chrome DevTools MCP, for a tool the CLI lacks or when the CLI can't be installed | [Generic CDP Harness](#generic-cdp-harness) |

Electron apps and IDEs go straight to the Generic CDP Harness for both verbs.

## Debug with the chrome-devtools CLI

1. **Check the install.** Run `chrome-devtools status`. If the command is not found, install it with `npm i -g chrome-devtools-mcp@latest`. If it can't be installed, use the Chrome DevTools MCP server when the harness has it connected. To add the server, register `npx -y chrome-devtools-mcp@latest` as an MCP server in the harness config. With neither, use the Generic CDP Harness.
2. **Read the bundled skill.** The package ships its command reference at `$(npm root -g)/chrome-devtools-mcp/skills/chrome-devtools-cli/SKILL.md`. Read it before the first command. For a leak, also read `memory-leak-debugging/SKILL.md` in the same folder. The MCP server's tools have the same names and arguments as the CLI's commands.
3. **Capture the signal.** Take the tool for the signal. Save each trace and heap snapshot to a file, so a later run can compare against it.

| Signal | Tool |
|---|---|
| Slow load, slow interaction, or visual glitch | `performance_start_trace`, then `performance_analyze_insight` on each LCP, INP, or CLS insight the trace names |
| Memory leak | `take_heapsnapshot` before and after the suspect flow, then `compare_heapsnapshots` |
| Failing call or error | `list_network_requests`, `get_network_request`, and `list_console_messages` |
| A hypothesis about live state | `evaluate_script` on the live page |
| Accessibility, SEO, or best practices | `lighthouse_audit`. It leaves out performance, so measure performance with a trace. |

The CLI runs a background daemon that keeps the browser, its pages, and their cookies between commands. By default the daemon launches its own headless Chrome in a separate profile. `chrome-devtools start <flags>` restarts it with new flags, and `chrome-devtools stop` ends it. The CLI lacks a few of the MCP server's tools, such as `wait_for` and `fill_form`, and `chrome-devtools --help` lists the commands it has.

Trace tools send the page URL to Google's CrUX API for field data. For a private URL, start the daemon with `--performanceCrux=false`.

## What It Is Used For

- Reproducing UI bugs that depend on real browser focus, keyboard input, scrolling, resizing, or rendering.
- Verifying visual or accessibility changes with screenshots and snapshots.
- Checking local web, IDE, or Electron behavior before shipping.
- Capturing console logs, network logs, CPU profiles, traces, or heap snapshots.
- Creating before/after evidence for a project's `verify-*` skill (see **create-verification-skill**).

## Setup Pattern

1. Start the app locally using the repo's documented dev command.
2. Discover existing local harnesses: Playwright tests, Cypress specs, Storybook, browser scripts, Electron launch scripts, or snapshot tools.
3. For a web app, connect to the local URL with the existing browser tooling.
4. For Electron/Chromium, enable a remote debugging port when supported.
5. Select the correct page by stable app markers, not by tab order alone.
6. Prefer accessibility roles, labels, and stable `data-*` selectors over coordinates.

## Generic Web Harness

Use the repo's installed browser tooling when possible. If the repo already has Playwright, a minimal one-off probe looks like:

```javascript
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:<port>");
await page.getByRole("button", { name: /submit/i }).click();
await page.screenshot({ path: "/tmp/ui-harness-after.png", fullPage: true });
await browser.close();
```

Do not add Playwright as a project dependency just for this probe unless the user asks. Prefer existing dev dependencies or external browser tools already available in the environment.

## Generic CDP Harness

This harness is the fallback. Use it for Electron, an IDE, or a debugging task when neither the `chrome-devtools` CLI nor its MCP server is available. For Electron or a Chromium app launched with `--remote-debugging-port=<port>`, connect over CDP:

```javascript
import { chromium } from "playwright";

const browser = await chromium.connectOverCDP("http://127.0.0.1:<debug-port>");
const pages = browser.contexts().flatMap((context) => context.pages());
let page;
for (const candidate of pages) {
  if (await candidate.locator("<app-root-selector>").count()) {
    page = candidate;
    break;
  }
}

if (!page) {
  console.log(await Promise.all(pages.map(async (p) => ({
    title: await p.title(),
    url: p.url(),
  }))));
  throw new Error("No matching app page found");
}

await page.screenshot({ path: "/tmp/ui-harness-cdp.png", fullPage: true });
await browser.close();
```

Replace `<app-root-selector>` with a stable marker from the current repo, such as a root app node, landmark, or product-specific `data-*` attribute.

## Interaction Loop

1. Capture a page snapshot or screenshot before acting.
2. Choose a target from the latest page structure.
3. Perform exactly one structural action: click, type, keypress, drag, scroll, navigate, or resize.
4. Capture a fresh snapshot/screenshot.
5. Verify the expected state change.
6. Save artifacts for before/after comparisons when the user asked for proof.

## CDP Capabilities

These are the fallback for debugging. Reach for raw CDP when the `chrome-devtools` CLI and MCP server can't reach the surface or lack the capability, and higher-level browser APIs are insufficient:

- Performance: CPU profiles, traces, paint flashing, FPS meter, layout shift inspection.
- Memory: heap snapshots and forced GC for leak investigations.
- Network: request blocking, throttling, cache disablement, request/response logs.
- Rendering: viewport changes, color scheme emulation, reduced motion, accessibility checks.
- Debugging: console streaming, exception capture, DOM snapshots.

## Page Selection

When multiple app windows/tabs share a debug port:

- Prefer a positive marker for the surface under test, such as an app root selector.
- Use a negative marker to avoid the wrong surface when necessary.
- If no page matches, list available page titles and URLs instead of guessing.

## Guardrails

- Do not rely on stale element references after navigation or structural changes.
- Avoid coordinate clicks unless a fresh screenshot was captured immediately before the click.
- Keep test data local and disposable.
- Do not store screenshots or heap snapshots from privacy-sensitive workspaces unless the user explicitly agrees.
- Do not hard-code selectors, ports, or script paths from another repository. Discover the current repo's local app markers.
- Clean up dev servers, debug sessions, and temp profiles when done.

### Live session

A bug that needs the user's sign-in runs in the user's own Chrome. Connect to it only after the user hands it over.

1. The user starts the handoff. They open `chrome://inspect/#remote-debugging` in Chrome 144 or later, allow remote debugging, and ask you to take over.
2. Run `chrome-devtools start --autoConnect --performanceCrux=false`, then any command. Chrome asks the user to allow the connection. On the MCP server, pass the same flags in the server's args.
3. Read freely: pages, snapshots, console messages, network requests, and traces.
4. Ask before any action that changes data, such as submitting a form, clicking a control that writes, or an `evaluate_script` that mutates state. These are irreversible writes on go-mode's Always-pause list ([`../go-mode/SKILL.md`](../go-mode/SKILL.md)).
5. Save no heap snapshot, trace, network log, or screenshot to disk unless the user agrees, per the privacy guardrail above. A heap snapshot holds the page's memory, tokens included.
6. Redact auth headers, cookies, and tokens in everything you show, per the Redact section of the **diagnosing-bugs** skill ([`../diagnosing-bugs/SKILL.md`](../diagnosing-bugs/SKILL.md)).
7. When done, run `chrome-devtools stop` and tell the user they can turn remote debugging off.
