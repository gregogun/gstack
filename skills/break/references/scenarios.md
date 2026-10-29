# Scenarios

Adapted from Jakub Krehel's `break` (its scenario axes) and `state-machine`, and Emil Kowalski's `break-ui` (its worst-case catalog).

The menu step 2 of [`../SKILL.md`](../SKILL.md) walks. Each axis carries a **cue**, the property of the target that makes the axis worth running. When the cue matches, the axis stays. When it fails, drop the axis and name the drop. An axis that stays contributes the scenarios below. Add any worse value the target's own data holds, such as the longest option in a real dataset copied into a fixture.

The widths and values here are defaults. Jakub's values win for type, layout, and accessibility, and Emil's win for motion. Project tokens and documented project decisions override both.

## Data axes

### Quantity

**Cue: the target repeats over items.** Lists, tables, grids, tag rows, avatar stacks. A singular target fails the cue.

| Scenario | What it catches |
| --- | --- |
| Zero items | Blank regions, a missing empty state, "0 member" |
| One item | Grids that look broken with one card, "1 of 1", "1 members" |
| The realistic count | The baseline the others are judged against |
| Exactly the page size, and page size plus one | "Showing 40 of 40", an empty page 2 |
| Ten times the realistic count, or 1,000+ rows when unpaginated | Missing scroll or pagination, scroll stutter, sticky elements unsticking, "Showing 40 of 1,284" |
| One item ten times the size of the others | Grid and masonry rows stretched to the tallest item |
| Items with identical names | Lists where the name is the only distinguishing field |
| Twelve tags on one item, or one tag like `customer-feedback-from-enterprise-onboarding` | A wall of wrapped tags with no `+8` overflow, one tag wider than its container |

### Text length

**Cue: the target renders text it does not author.** User input, CMS content, API data, translations. A fixed label the codebase controls fails the cue.

| Scenario | What it catches |
| --- | --- |
| Empty string, `Untitled`, or whitespace only (`"   "`) | Collapsed boxes, zero-height rows, floating labels with nothing under them |
| One letter or one word (`J`, `Jo`) | A name column left mostly empty, tiny click targets when the name is the link, buttons sized to their longest expected label |
| Typical content | The baseline |
| Several sentences, or a 2,000-character pasted description | Wrapping, line-height at many lines, containers that assumed one line, missing clamp or "show more" |
| An unbroken string | No wrap opportunity: `bartholomew.fitzgerald@northwind-industries-holdings.example.com`, `https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved`, `Benachrichtigungseinstellungen`, `IMG_20250914_183022_HDR_portrait_edited_edited.HEIC` |
| A translated label about 30% longer, such as `Paramètres de confidentialité et de sécurité` for "Privacy & security" | Fixed-width buttons and tabs |
| A newline inside a single-line field | A doubled row height, or the line silently dropped |
| A long secondary value, such as `Senior Product Design Engineer, Platform Infrastructure` or `Invitation expired 12 days ago` | A three-line secondary slot, a badge that wraps or squeezes the name column |

### Text shape

**Cue: the text can come from users or locales the team does not write in.** The same sources as text length, minus content the codebase fully controls.

| Scenario | What it catches |
| --- | --- |
| Diacritics and long compounds: `Aleksandra Wiśniewska-Kowalczyk`, `Seán O'Brien-Ó Súilleabháin` | Two-line wraps that break at the hyphen, escaping of the apostrophe |
| Stacked combining marks: `Đặng Thị Ngọc Hân`, a decomposed `é` (`e` plus U+0301), and Thai | Ascenders and descenders clipped by a tight `line-height` with `overflow: hidden`, a mark split from its letter by truncation |
| CJK with no spaces: `王秀英` | "First and last word" initials logic, breaks at any character |
| RTL: `نور الهدى عبد الرحمن` | Punctuation and icons on the wrong side without `dir="auto"` |
| Mixed direction | An LTR product name inside an RTL sentence, and the reverse |
| Emoji alone, mixed into text, and first: `🦊 Fox` | Line-height jumps, off-centre alignment, `.charAt(0)` returning half a surrogate pair |
| A ZWJ sequence: `👩🏽‍💻 Priya` | A `.length` of 7 or more, slicing or truncation splitting the sequence into pieces |
| Lowercase, particles, and suffixes: `dana`, `María José de la Cruz y Fernández`, `Christopher Alexander Montgomery III` | Initials such as `Md` or `CI`, sorting by "last name" |
| Leading, trailing, and repeated spaces: `"  Sam   Lee "` | Initials from empty words, odd gaps |
| Markup-like text: `<script>alert(1)</script>`, `&amp;`, `**bold**` | Escaping at the wrong layer. It must render as literal text |
| Shortest and odd identifiers: `a@b.co`, `first.last+billing-notifications@example.com`, `ops@sub.department.region.example.co.uk`, a UUID, `@a` | Layouts that assumed a long email, `+` rejected or truncated away, domain extraction |
| A file name that differs at the end: `Q3 Board Deck - FINAL (revised) v12 [approved by legal].pdf` | End truncation hiding the version and extension, so files look identical |
| Numbers that align in columns | Proportional figures wobbling in tables and timers |

### Missing and null fields

**Cue: a field is optional or nullable, or the contract allows it to be absent.**

| Scenario | What it catches |
| --- | --- |
| An optional field missing | An orphaned placeholder dash or an empty line where the field sat |
| `null`, `undefined`, or `NaN` | The literal word rendered |
| Partial items, some optional fields filled and others not in the same list | Misaligned rows |
| No name, only an email | The fallback for the primary label |
| No avatar, and an avatar URL that returns 404 | The initials fallback, its colour and its size parity, a broken-image icon |

### Numbers

**Cue: the target renders numbers.**

| Scenario | What it catches |
| --- | --- |
| `0` | Zero states, empty progress bars, division by zero in percentages |
| `1` | Plurals: "1 members", "1 days ago" |
| `1284` | A missing thousands separator |
| `1000000` | Count-badge width, and whether a compact form like `1M` fits |
| `12345678.9` as currency | `$12,345,678.90` overflowing a totals column |
| `-42.5` | The sign, red-colour logic, accounting parentheses |
| `0.1 + 0.2` | `0.30000000000000004` rendered raw |
| `142%` and `-3%` | Progress bars and meters past their bounds |
| `1.284` in `de-DE` against `1,284` in `en-US` | Hardcoded separators |
| A value that changes live, `99` to `100` | Width jumps and jitter without `tabular-nums` |

### Time

**Cue: the target renders dates, times, or durations.**

| Scenario | What it catches |
| --- | --- |
| Now | "0 seconds ago" instead of "just now" |
| 12 days, 11 months, and 3 years ago | Relative-time thresholds that never switch to an absolute date |
| A future date | "-3 days ago" |
| `1970-01-01` | A zero timestamp shown as a real date |
| `2025-12-31T23:30:00-08:00` | A different day in UTC and in the user's timezone |
| `1,284 hours` | Durations that never roll up to days |

### Media

**Cue: the target renders images.**

| Scenario | What it catches |
| --- | --- |
| A 4000×200 panorama and a 200×4000 tall image | Distortion without `object-fit: cover`, a card blown out in height |
| A transparent logo, and a dark logo on a dark theme | An invisible image |
| A slow image | Layout shift without fixed dimensions or `aspect-ratio` |

### Loads

**Cue: the target's data arrives asynchronously.** Feed these through the data seam or request interception, per [`fixture.md`](fixture.md).

| Scenario | What it catches |
| --- | --- |
| Slow: held pending, then released under a throttled network | Skeletons that don't match the final layout, layout shift on arrival, spinners with no accessible name |
| Failed: a 500, a network error, a timeout | No error state, or a raw message such as `TypeError: Cannot read properties of undefined` |
| Partial: some requests resolved and others pending, or some items failed | Half-rendered rows, a whole list blocked on its slowest item |
| Stale data refetching | Content flashing back to a skeleton |

## States

**Cue: the target has the state.** The states are the branches the target already has. Read it and its data hooks for each one.

| Kind | States |
| --- | --- |
| Data | Loading, empty, error, partial, one item, a typical set, a set long enough to scroll or paginate, stale data refetching |
| Interaction | Default, hover, focus, pressed, selected, disabled, read-only, invalid, open or expanded, dragging |
| Overflow | Content longer than its box, where the target scrolls, clamps, or collapses to a `+n` |
| Connection | Offline, reconnecting, a pending action when the network drops |
| Access | Permission denied, owner against member, plan tier, a limit reached, a locked feature, the current user in the list |

- **A state the code cannot reach is not a state.** Never add a branch to render one. When the design shows a state the code lacks, list it in the report as missing.
- **A condition production can reach is a scenario even without a branch.** A list the API can return empty is an `empty` scenario whether or not the target handles it. What renders is the finding.
- **Name states the way the product talks**, such as `empty`, `enterprise`, or `member-no-access`.
- **Combine kinds only where the code branches on the combination**, such as `member-empty`. Never take the cross product.
- **Every state gets a scenario.** Interaction states are driven with real input in step 4. Data, connection, and access states are fed by the fixture.

### Transitions

List each move the target can make between states. Each gets a scenario. Put the target in the first state, drive it to the second, and watch the change happen. Look for layout shift, focus lost to `<body>`, a scroll jump, a flash of the wrong state, and a state that sticks.

| Transition | What it catches |
| --- | --- |
| Loading to loaded | Layout shift, a skeleton shaped unlike the content |
| Loading to error | The error pushing content, a message nobody announces |
| Error to retry to loaded | Focus lost from the retry control, a double submit |
| Empty to one | The empty state lingering after the first item arrives |
| Loaded to refetching | Content replaced by a skeleton instead of kept in place |
| Enabled to disabled while focused | Focus dropped to `<body>` |
| Selected to removed | Where selection and focus land next |
| Online to offline mid-action | A silently lost action, a spinner that never ends |
| Hover to pressed to released, and the pointer leaving while pressed | A stuck pressed state |
| Open to closed by Escape | Focus not returned to the trigger |

## Environment

Run each environment that applies against the worst-case dataset, the typical dataset, and each interaction state. The other scenarios don't need every environment.

### Container widths

**Cue: always.** The target doesn't choose its container. Each width is a fixed container on the fixture page, never a resized viewport.

| Scenario | What it catches |
| --- | --- |
| A 320px container | Clipping, horizontal scroll, controls escaping the box |
| A 280px sidebar column | Full-width components reused in a narrow column |
| The production width | The baseline |
| Squeezed by a flex or grid sibling | Min-content blowout, a target that refuses to shrink |
| The full width of a 2560px viewport | Unbounded line length, stretched controls, content pinned to opposite edges |

### Viewport widths

**Cue: the app has media queries, or the target sits in a responsive layout.** Resize the viewport through the control-ui tool. Run 320px, each project breakpoint and 1px either side of it, the widest layout the app supports, and 2560px.

Containers and viewports catch different bugs. A container catches the target overflowing its own box. A viewport catches media-query and layout bugs. A component can sit in a narrow container on a wide screen, so also run the 320px container at a 2560px viewport.

### Zoom at 200%

**Cue: always.** Text grows and fixed boxes don't. Run both kinds of zoom:

- **Page zoom.** Set the viewport to half its width with a device scale factor of 2. A 1280px window at 200% renders as 640 CSS pixels. This catches reflow and media-query bugs.
- **Text zoom.** Set the root font size to 200%, as a large-text setting does. This catches fixed heights that clip growing text, when the project sizes text in `rem` or `em`.

### Dark mode

**Cue: the project ships a dark theme.** Emulate `prefers-color-scheme: dark` through the control-ui tool, or use the app's own theme switch. Re-declaring tokens under a class on the fixture observes a different target. It catches hardcoded colours, invisible borders and logos, and focus rings that vanish.

### RTL

**Cue: the project ships an RTL locale, or renders user text that can be RTL.** Use the app's locale switch, or set `dir="rtl"` on the document root. It catches unmirrored icons and chevrons, physical padding and margins, and trailing actions in the wrong order.

### Reduced motion

**Cue: the target animates.** Emulate `prefers-reduced-motion: reduce` and drive every transition. Every state is still reached and visible, and nothing sticks at an animation's hidden start state.

### Keyboard only

**Cue: the target is interactive.** Put the pointer away. Tab and Shift+Tab through the target, and operate each control with the keys its role expects: Enter, Space, Escape, and the arrows. Every action is reachable, focus is visible at every stop, focus order matches the visual order (mirrored in RTL), nothing traps focus, and an action that appears only on hover is still reachable.

### Touch

**Cue: the target has hover-only affordances or small targets.** Emulate a touch device through the control-ui tool. A ••• menu that appears only on hover is unreachable, and a target under 24×24 CSS pixels is hard to hit.
