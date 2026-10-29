# The fixture

The fixture is a page or story that renders the real target once per scenario, with each scenario's data and state under your control. It is the surface step 4 drives and the page the user reads alongside the report. It is temporary, and step 7 removes it.

## Where it lives

Take the first that fits:

1. **The project's story tool**, such as Storybook, when the target already has stories. One story per scenario, named by its scenario id.
2. **A scratch route in the app**, following its routing convention, with `break` in the path, such as `/__break/member-row`. The route inherits the app's layout, fonts, global styles, and providers. Keep the route, its fixtures, and any switcher in one folder.
3. **No app.** A single self-contained HTML file with the target and every dataset inline.

Gate the route or story to development builds, so a stray merge cannot ship it. Production code never imports from the fixture, and the fixture never wires to live data or production state.

Where the framework splits server from client components, make the fixture page client code (`"use client"` in Next). Otherwise fixture data can vanish crossing that boundary and the page renders empty.

## What the fixture adds

Labels, container widths, fixture data, and the scenario param. Nothing else. No fonts, styles, themes, token swaps, or probes of its own, since a target observed under any of those is a different target. Dark mode, zoom, reduced motion, and the other environments come from browser emulation in step 4, never from the page.

## Layout

- **No param.** Every scenario stacks in one column. Each sits in a wrapper with `data-scenario="<id>"` and a short label above it naming the id and the value it feeds. This view is the one the user scrolls through.
- **`?__scenario=<id>`.** That scenario alone, at its container width. Viewport, zoom, theme, motion, and keyboard checks run here, and so does each regression test. The double underscore keeps the param clear of any the app's layout reads.
- **Container widths are scenarios.** Render the typical and the worst-case datasets once per container width in [`scenarios.md`](scenarios.md), with ids like `worst-320` and `worst-squeezed`. Every other scenario renders at the production width.
- **A switcher is optional.** Add one only when the user will flip scenarios by hand. Use the floating switcher from the **prototype** skill ([`../../prototype/references/ui.md`](../../prototype/references/ui.md)), keyed on `__scenario`.

## Feed data at the boundary

Supply each scenario's data where the target receives it in production. In order of preference:

1. Props, when the target takes its data as props.
2. The app's own data seam, such as a seeded query cache, a mock provider, or the project's request mocks.
3. Request interception from the control-ui tool, such as Playwright's `page.route` or CDP request blocking and throttling. Slow, failed, and partial loads usually need this.

A fixture threaded through props five levels down tests a path production never takes. When the only way in is editing the target, say so in the report and use interception. A new seam is a change to the target, so it waits for the report like any fix.

## Fixture data

- **Shaped like the demo data.** Same type, same file conventions, kept next to it.
- **One worst-case dataset, many failures.** It hits every row in `scenarios.md` that applies to the target, spread across items the way real data mixes them. Item 1 has the long name, item 2 the unbroken email, item 3 the one-letter name. The first items matter most, because they are the ones on screen.
- **Separate fixtures for counts.** Empty, one, and huge each get their own fixture, since they don't fit inside one dataset.
- **Real-shaped values.** Names, timestamps, amounts, and the item counts users have. Three rows of "Test item" make every state look fine.
- **Safe domains.** Use `example.com`, `example.org`, or `.test` for emails and URLs, so no fixture points at a real inbox or site.
- **Loading holds still.** Loading and pending scenarios stay pending until the scenario changes. Never resolve them on a timer.

## Confirm it renders

Load every scenario once. Each shows its fixture data. A blank region or real data means the plumbing is broken, not the target. The usual causes are a server boundary dropping the fixture, a cache refetching over the seed, and live sync replacing it. Fix the plumbing before you observe anything.
