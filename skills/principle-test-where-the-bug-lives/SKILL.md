---
name: principle-test-where-the-bug-lives
description: "Apply when you choose how to test a change. Test at the lowest layer where the bug can occur: unit tests for pure logic, component tests for component behavior, and one real end-to-end test for anything that crosses the browser-server line."
disable-model-invocation: true
---

# Test Where the Bug Lives

Test each behavior at the lowest layer where its bug can occur. A lower layer is faster and points at the fault more exactly. A layer below the bug cannot see it, so a test that mocks the place where the bug lives cannot catch that bug.

Pick the layer per behavior, not per change:

- **Unit.** Pure logic: parsing, validation rules, reducers, formatting, calculations. Call the function with a concrete input and assert the result.
- **Component.** One component's behavior: what it renders, how it responds to input, what it sends out. Mock only the network edge, which the end-to-end test covers for real.
- **Integration.** Server behavior that needs no browser, such as a status code, a cookie's flags, or a rule the server enforces. Send real requests to the running server or call the handler against a real database.
- **End-to-end.** Anything that crosses the browser-server line: auth, sessions, cookies, routing, and redirects. A mock at that line replaces the exact part that breaks. Write one real end-to-end test of the main path, with a real browser against a running server. Move each edge case to the lowest layer where its bug can occur. Keep an edge case end-to-end only when its bug also lives at the line, such as the redirect for a signed-out user.

A React login flow is the common case. The bug lives in the cookie the server sets, the redirect after submit, and the session that must survive a reload. Write one end-to-end test that signs in with valid credentials, lands on the protected page, reloads, and is still signed in. Cover field validation and error display with component tests, and pure validation rules with unit tests. Component tests with a mocked `fetch`, and nothing else, never see the cookie, the redirect, or the session.

Run each layer at its cadence. Run each command in single-run mode, because a watch process never exits:

- **After every save.** Sub-second checks: the type check, lint, and the unit tests of the module you edit.
- **After every meaningful edit.** The tests that cover the files you changed, at every layer.
- **Before you declare done.** The slow suites, the end-to-end tests among them.
- **In CI.** Suites that only CI runs, such as a cross-browser matrix. Leave them to CI and read its result.

In a project with no end-to-end suite, generate one with Playwright Test Agents instead of writing it by hand. A project that already has an end-to-end runner gets its new test in that runner.

1. Run `npx playwright init-agents --loop=<harness>`, with the harness you run in. `npx playwright init-agents --help` lists the choices. It writes the agent definitions, `specs/`, and a seed test. It also replaces `.mcp.json` with a file that holds only its own server, so save the old `.mcp.json` first and merge its servers back after the run.
2. Fill in the seed test. When the project has no seed, `init-agents` writes an empty `seed.spec.ts`. Write the setup that every test needs into it, such as opening the app and signing in.
3. Start a new session so the harness loads the new agents and MCP server.
4. Run the planner, then the generator, then the healer. The planner explores the app from the seed and writes a Markdown plan in `specs/`. The generator turns the plan into tests in `tests/`. The healer runs the failing tests and repairs them.
5. Search the generated tests for `test.fixme`. The healer marks a test that way when it believes the feature is broken. Report each one as a finding, not a pass. The suite is done when every other generated test passes.
6. Review the generated tests against the **test-behavior-not-implementation** principle skill ([`../principle-test-behavior-not-implementation/SKILL.md`](../principle-test-behavior-not-implementation/SKILL.md)).
