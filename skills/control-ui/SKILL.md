---
name: control-ui
description: Route browser work by the job. Playwright drives a web UI, the chrome-devtools CLI debugs it, and a local CDP harness covers Electron, IDEs, and fallbacks. Use for UI verification, screenshots, perf traces, heap snapshots, console or network logs, or reproducing UI bugs.
---

# Control UI

Pick the tool by the verb, then collect evidence with it. **Drive** a page to prove a change works. **Debug** a page to find out why something is wrong. A bug fix does both. Debug to find the cause, then drive to prove the fix.

## Pick the tool

Take the first tool in the row that is available and reaches the surface.

| Verb | First | Next | Last resort |
|---|---|---|---|
| Drive | The repo's own test runner or harness, such as Playwright, Cypress, or an Electron launch script | `@playwright/cli`, when the repo has none | [Generic Web Harness](#generic-web-harness) |
| Debug | The `chrome-devtools` CLI, per [Debug with the chrome-devtools CLI](#debug-with-the-chrome-devtools-cli) | Chrome DevTools MCP, for a tool the CLI lacks or when the CLI can't be installed | [Generic CDP Harness](#generic-cdp-harness) |

Electron apps and IDEs with no harness of their own go to the Generic CDP Harness for both verbs. A bug that needs the user's sign-in goes to [Live session](#live-session).

## Debug with the chrome-devtools CLI

1. **Check the install.** Run `chrome-devtools status`. If its `args` line shows `--autoConnect`, the daemon is a leftover live session, so run `chrome-devtools stop` before you go on. If the command is not found, ask the user to allow `npm i -g chrome-devtools-mcp@latest`, which installs it globally. If they decline or the install fails, use the Chrome DevTools MCP server when the harness has it connected. With neither, use the Generic CDP Harness, and offer to add `npx -y chrome-devtools-mcp@latest` to the harness's MCP config for the next session.
2. **Read the bundled skill.** The package ships its command reference at `$(npm root -g)/chrome-devtools-mcp/skills/chrome-devtools-cli/SKILL.md`. Read it before the first command. For a leak, also read `memory-leak-debugging/SKILL.md` in the same folder. The MCP server's tools have the same names as the CLI's commands. The CLI takes required arguments by position and optional ones as flags. The MCP server turns on the heap tools other than `take_heapsnapshot` only with `--memoryDebugging=true` in its args.
3. **Capture the signal.** Run the tool in the row for the signal, and save each trace and heap snapshot to a file, so a later run can compare against it. In a live session, ask before you save anything, per [Live session](#live-session). The step is done when the output names the cause or the saved files exist.

| Signal | Tool |
|---|---|
| Slow load | `performance_start_trace` with `reload` and `autoStop`, then `performance_analyze_insight` on each insight the trace summary lists |
| Slow interaction or visual glitch | `performance_start_trace`, do the interaction, `performance_stop_trace`, then `performance_analyze_insight` on each insight the summary lists |
| Memory leak | `take_heapsnapshot` before and after the suspect flow, then `compare_heapsnapshots` |
| Failing call or error | `list_network_requests`, `get_network_request`, and `list_console_messages` |
| A hypothesis about live state | `evaluate_script` on the live page |
| Accessibility, SEO, or best practices | `lighthouse_audit`. It leaves out performance, so measure performance with a trace. |

The CLI runs a background daemon that keeps the browser, its pages, and their cookies between commands. By default the daemon launches its own headless Chrome in a separate profile. `chrome-devtools start <flags>` restarts it with new flags, and `chrome-devtools stop` ends it. The CLI lacks a few of the MCP server's tools, such as `wait_for` and `fill_form`, and `chrome-devtools --help` lists the commands it has.

Trace tools send the page URL to Google's CrUX API for field data. Unless the URL is public, start the daemon with `--performanceCrux=false`.

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

## Motion and Modes

Motion and viewing modes are claims about feel, so check them on the running page.

- **Record before you call motion smooth.** Capture a Performance trace and read it for dropped frames and long tasks. A fast laptop hides almost every problem, so don't call motion smooth from watching it.
- **Slow it down to see it.** Play the animation at 10% in the Animations panel, or step it frame by frame. Easing, origin, and overlap errors show only when the motion is slowed.
- **Know what throttling models.** CPU throttling on a desktop models a slow CPU. It doesn't model a weak GPU or a small memory budget. For gestures and compositing, profile a real mid-range phone over remote debugging, and say which findings still need that device.
- **Check modes when the change touches them.** Run reduced motion when it touches motion, dark scheme when it touches colour tokens, and narrow width and 200% zoom when it touches layout or type. Emulate the real media feature (`prefers-reduced-motion`, `prefers-color-scheme`) or set the real zoom. Re-declaring tokens under a class tests a different page.

## Guardrails

- Never kill a browser you did not start. A `pkill` pattern that matches `chrome` also kills an MCP server's browser and every session attached to it. Quit the process you launched by its pid.
- Do not rely on stale element references after navigation or structural changes.
- Avoid coordinate clicks unless a fresh screenshot was captured immediately before the click.
- Keep test data local and disposable.
- Do not store screenshots or heap snapshots from privacy-sensitive workspaces unless the user explicitly agrees.
- Do not hard-code selectors, ports, or script paths from another repository. Discover the current repo's local app markers.
- Clean up dev servers, debug sessions, and temp profiles when done.

### Live session

A bug that needs the user's sign-in runs in the user's own Chrome. Connect to it only after the user hands it over.

1. The user starts the handoff. They open `chrome://inspect/#remote-debugging` in Chrome 144 or later, allow remote debugging, name the tab to debug, and ask you to take over.
2. Run `chrome-devtools start --autoConnect --performanceCrux=false --usageStatistics=false`, then any command. Chrome asks the user to allow the connection. On the MCP server, or if `start` rejects a flag, pass the same flags in the MCP server's args for this session only.
3. Select the tab the user named. Ask before you read any other tab.
4. In that tab, read what comes back to you without a file: the page snapshot, console messages, and network requests.
5. Ask before any action that changes data or the tab, such as submitting a form, clicking a control that writes, an `evaluate_script` that mutates state, a navigation, a reload, a trace with `reload`, or a `lighthouse_audit` in its default navigation mode. Pass `dialogAction` and `handleBeforeUnload` as `dismiss`, since both default to accept. Ask even under a full-autonomy grant, as go-mode does for its Always-pause list ([`../go-mode/SKILL.md`](../go-mode/SKILL.md)).
6. Save no heap snapshot, trace, Lighthouse report, network log, or screenshot to disk unless the user agrees, per the privacy guardrail above. `take_heapsnapshot` and `lighthouse_audit` always write a file, so ask before you run them. A heap snapshot holds the page's memory, tokens included.
7. Redact auth headers, cookies, and tokens in everything you show, per the Redact section of the **diagnosing-bugs** skill ([`../diagnosing-bugs/SKILL.md`](../diagnosing-bugs/SKILL.md)).
8. When done, run `chrome-devtools stop`, remove `--autoConnect` from any MCP server args you set, and tell the user they can turn remote debugging off.
