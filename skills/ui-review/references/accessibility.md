# Accessibility

Adapted from Jakub Krehel's `better-accessibility`.

Semantics, keyboard and focus behavior, accessible names, forms, announcements, motion and zoom, reported against WCAG 2.2. Fixes go in the project's own styling system.

Review in two walks. Keyboard-only, where every flow completes without a mouse. Then screen-reader, where every control announces a name, a role and its state. When unsure, take the platform default over a custom rebuild, and remove ARIA rather than add it.

Contrast measurement and color fixes belong to [colors](colors.md). Text sizing, iOS input zoom and language metadata belong to [typography](typography.md). Spacing between targets and spatial RTL belong to [layout](layout.md). Touch targets on small screens are also in [mobile](mobile.md).

## Criteria, not conventions

A finding cites a WCAG 2.2 Level A or AA criterion by number, or a concrete task an assistive-technology user cannot complete. Everything else is a recommendation and never `HIGH`. That covers AAA criteria, APG conventions, the one-`<h1>` and no-skipped-levels outline, and the 44px and 40px targets. The criterion thresholds below are exact. The larger targets are heuristics, so keep an established, usable density.

## Mode checks

Source reading cannot prove these. Run each against the rendered page and emulate the condition for real, not by reading CSS. Use the **control-ui** skill ([`../../control-ui/SKILL.md`](../../control-ui/SKILL.md)) to drive the page and set the media features.

| Mode | How to emulate | What to confirm |
| --- | --- | --- |
| Reduced motion | Emulate `prefers-reduced-motion: reduce` | Slides, scales, parallax and autoplay are gone or replaced by opacity fades. Spinners and brief functional feedback remain. Every state change still shows through colour, icon or label |
| Dark scheme | Emulate `prefers-color-scheme: dark` | No unthemed surface, text pair or image. Every pair re-measured per [colors](colors.md). No light flash on load |
| Increased contrast | Emulate `prefers-contrast: more` where the project styles it | Borders and text widen their gap in each appearance |
| Narrow width | Set the viewport to 320px wide | No horizontal page scroll, no clipped or overlapping control, no content past an unmarked scroll edge (1.4.10) |
| 200% zoom | Set browser zoom to 200%, or the device scale factor to 2 at 1280px, then check the text-only resize too | All content and functionality survive (1.4.4). Fixed-height boxes do not clip text |
| Keyboard | Tab through every flow from a fresh load | A visible indicator at every stop, a logical order, no trap, Escape closes overlays |

Do not claim a mode as inspected from the stylesheet alone. A mode you could not emulate goes on the Not inspected list with the reason.

## Native elements first

The first rule of ARIA is to use no ARIA when a native element exists. Use `<button>` for actions and `<a href>` for navigation, never `<div onClick>`. A real link must support Cmd, Ctrl and middle-click.

1. If a native element with the semantics and behavior you need exists, use it instead of repurposing another element with ARIA.
2. Don't change native semantics unless you really have to.
3. Every interactive ARIA control must be keyboard-operable. A role is a promise of the full keyboard model, states and behavior.
4. All interactive elements must have an accessible name.

No ARIA is better than bad ARIA. A screen reader trusts your roles, so a wrong one is worse than none.

| Element | Use for | Why |
| --- | --- | --- |
| `<a href>` | Navigation, anything that goes somewhere or changes the URL | Free Cmd, Ctrl and middle-click, copy link, Enter activation |
| `<button>` | Actions such as submit, toggle, open, delete | Free focus, Enter and Space activation, form semantics |
| `<div onClick>` | Nothing | No role, no focus, no keyboard. Screen readers see plain text |

A "button" that navigates is a styled `<a>`, and a "link" that performs an action is a styled `<button>`. Where a native element is truly impossible, the polyfill is `role="button"`, `tabindex="0"` and Enter and Space handlers, which is why the native element is always less code.

## Landmarks, headings and structure

- `<header>`, `<nav>`, `<aside>` and `<footer>` map to landmarks screen-reader users jump between.
- Multiple landmarks of one type need distinguishing labels, as in `<nav aria-label="Primary">` and `<nav aria-label="Breadcrumbs">`.
- Headings are structure, not styling. Style a heading level with CSS instead of picking the tag by size.
- `<title>` matches the current context, most specific first, as in `Billing · Settings · Acme` (2.4.2).
- Expose one visible primary `<main>` landmark. When repeated navigation or chrome precedes it, make a "Skip to content" link the first focusable element. Anchored headings get `scroll-margin-block-start`.

## Accessible names

Name precedence is `aria-labelledby`, then `aria-label`, then the native label (`<label>`, text content, `alt`), then `title`.

- Prefer visible text or `aria-labelledby` over `aria-label`, which is invisible, drifts out of sync with the UI and is handled inconsistently by translation tools.
- Icon-only buttons always need a name, such as `<button aria-label="Close">` with the icon `aria-hidden="true"`.
- Label in Name (2.5.3). A button showing "Send" with `aria-label="Submit message"` breaks voice control users who say "click Send". Start the name with the visible text.
- Decorative elements get `aria-hidden="true"`, never on or above a focusable element.

```html
<!-- Good, name from visible text and icon hidden -->
<button><svg aria-hidden="true">…</svg> Delete</button>

<!-- Good, icon-only with an explicit name -->
<button aria-label="Delete"><svg aria-hidden="true">…</svg></button>
```

| ARIA mistake | Why it fails |
| --- | --- |
| `aria-label` on a plain `<div>` or `<span>` | ARIA 1.2 prohibits naming the `generic` role, and most screen readers ignore it |
| `<button role="button">` | Redundant role that adds noise |
| `aria-labelledby` or `aria-describedby` pointing at a missing ID | Silently produces no name or description |
| `role="menu"` on a nav list | `menu` promises app-style arrow-key behavior. Site navigation is `<nav>` with a list |

## Disabled means unavailable

Native `disabled` supplies the platform's complete disabled behavior. It removes the control from the tab order, suppresses activation, applies `:disabled` and excludes form controls from submission. `aria-disabled="true"` only announces the state and changes neither focusability, nor behavior, nor styling.

- Never disable submit to gate validation. Validate on submit instead.
- A natively `disabled` control suppresses pointer events and leaves the tab order, so a tooltip on it never opens for keyboard or touch users. Put the reason in visible text beside the control, or use `aria-disabled="true"`, which keeps it focusable and hoverable.
- Use `aria-disabled="true"` where keeping a control discoverable in the tab order is intentional, or where a custom control cannot use native `disabled`.
- With `aria-disabled="true"`, block pointer and keyboard activation in the handler and prevent form submission. Add explicit styling, including forced-colors support, and explain nearby why the action is unavailable.
- Never set both `disabled` and `aria-disabled` on one element.
- Disabled controls are exempt from contrast minimums.

## Focus rings

Style `:focus-visible`, not bare `:focus`. The browser shows it for keyboard and assistive-tech focus, suppresses it for mouse clicks on buttons and links, and still shows it in text inputs. An `outline: none` with no visible replacement leaves sighted keyboard users with no way to see where they are.

The browser's unmodified indicator adapts to platform and forced-color settings. Adding only `outline-offset` preserves it. A custom `outline: 2px solid` with no color renders `currentColor`, which may fail against the colors the outline crosses. In order of preference.

```css
/* Best, keep the browser ring and give it breathing room */
:focus-visible {
  outline-offset: 2px;
}

/* Custom ring when the design requires one, using the project's verified token */
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

A custom ring needs a project focus token or another explicit color. It must reach 3:1 against every adjacent color it crosses under 1.4.11. That means component fills, page surfaces, images, gradients, and hover and selected states. A `2px` solid perimeter with a 3:1 change of contrast is the 2.4.13 AAA target. Never use `outline: none` without a verified replacement.

In `forced-colors: active`, keep the default color adjustment or name a system color such as `Highlight`. `forced-color-adjust: none` freezes the authored color, so use it only where you have checked the control stays perceivable. Use `:focus-within` when a wrapper should light up while an inner input has focus.

A focused element must never sit fully hidden behind a sticky header, footer or banner (2.4.11). Pad the scroller with `scroll-padding-block-start` by the sticky header's height, and `scroll-padding-block-end` by a sticky footer or cookie banner's height.

## Skip link

Target `<main id="main">` and visually hide the link until focused.

```css
.skip-link {
  position: absolute;
  inset-inline-start: -999px;
}
.skip-link:focus {
  inset-inline-start: 16px;
  inset-block-start: 16px;
}
```

```html
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>…</header>
  <main id="main">…</main>
</body>
```

Give in-page anchor targets `scroll-margin-block-start`, such as `80px` under a sticky header.

## Full keyboard support

Every pointer interaction needs a keyboard path. Follow the ARIA APG patterns. Native elements come with these behaviors. Custom widgets must implement them.

| Widget | Keys |
| --- | --- |
| Dialog | Tab and Shift+Tab cycle inside, wrapping at the ends. Escape closes |
| Tabs | Arrow keys move between tabs, wrapping. Tab exits to the panel. Home and End jump to first and last |
| Menu button | Enter, Space or ArrowDown opens and focuses the first item. ArrowUp opens and focuses the last. Arrows navigate. Escape closes and refocuses the button |
| Disclosure or accordion | Header is a `<button aria-expanded>`. Enter and Space toggle |
| Combobox | ArrowDown opens or moves into the list. Enter accepts. Escape closes and returns to the input. Typing filters |
| Listbox or radio group | Arrow keys move selection. One Tab stop for the whole group |

- Escape dismisses whatever opened last, so tooltip first, then menu, then dialog.
- Tabs choose an activation mode. Automatic, where the panel switches on arrow focus, suits panels that render instantly. Manual, with Enter or Space to activate, suits expensive switching.
- Enter in a single-line text input submits its form natively. In `<textarea>`, Enter inserts a newline, and Cmd or Ctrl+Enter submits only if you implement it.

### tabindex

- `tabindex="0"` adds an element to the natural tab order. Use it only for custom interactive elements that aren't natively focusable.
- `tabindex="-1"` makes an element focusable from script only. Use it for headings you move focus to, modal containers and roving-tabindex members.
- A positive `tabindex` is never right. It hijacks the tab order for the whole page. Fix the DOM order instead.

Composite widgets, meaning tabs, menus, toolbars and radio groups, occupy one Tab stop. The active item has `tabindex="0"`, all others `-1`, and arrow keys move both focus and the `0`. A combobox keeps DOM focus in its input instead. Point `aria-activedescendant` on the input at the `id` of the highlighted option and update it on arrow keys.

## Trap and restore focus

Prefer `<dialog>` opened with `showModal()`, which makes everything behind it inert and closes on Escape.

```js
dialog.showModal();   // on open
dialog.close();       // on close
trigger.focus();      // return focus to the element that opened it
```

A custom overlay that can't use `<dialog>` needs `role="dialog"`, `aria-modal="true"` and an accessible name via `aria-labelledby`. Put `inert` on everything behind it, which removes background content from the tab order and from assistive tech in one move.

```js
// On open
document.getElementById("app-content").inert = true;
(dialog.querySelector("[autofocus]") ??
  dialog.querySelector("button, [href], input, select, textarea"))?.focus();

// On close
document.getElementById("app-content").inert = false;
trigger.focus();
```

- On open, focus the first focusable element. For destructive confirmations, focus the least destructive action instead.
- On close, return focus to the trigger, or to the nearest logical container if the trigger is gone.

Client-side route changes reset nothing and announce nothing. Update `document.title`, then move focus to the new view's `<h1>` (given `tabindex="-1"`) or to `<main>`. Restore scroll position on history traversal, and scroll to top on a new navigation.

## Minimum hit area

| Standard | Minimum |
| --- | --- |
| WCAG 2.5.8 (AA) | 24x24px, with exceptions |
| WCAG 2.5.5 (AAA) | 44x44px |
| Apple HIG | 44x44pt |
| Material Design | 48x48dp |

Aim for 44x44px on touch and 40x40px on desktop where density permits. Before reporting an undersized target, check the spacing, equivalent-control, inline, user-agent and essential exceptions. Under the spacing exception, an undersized target passes when a 24px circle centered on its bounding box intersects no other target and no other undersized target's circle. In the simple case, 20px targets need a 4px gap.

The visible element can stay small. The hit area is what must be big. Anything that looks clickable must be clickable across its whole visual extent. The expansion recipes, the collision rule and the decorative-layer rule are in [mobile](mobile.md).

Every drag interaction needs a single-pointer alternative (2.5.7), such as move-up and move-down buttons on a sortable row or a menu on a kanban card. Every multipoint or path-based gesture, such as a pinch or a swipe, needs a single-pointer alternative (2.5.1).

## Label and type every control

Every control needs a programmatic label, either `<label for>` pointing at the input's `id` or a wrapping `<label>`. A placeholder disappears the moment the user types and usually fails contrast, so it never stands in for a label. Label and control share one hit target, with no dead zone between a checkbox and its text.

```html
<!-- Good, explicit association -->
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email" />

<!-- Good, wrapping label shares one hit target -->
<label><input type="checkbox" /> Send me updates</label>
```

Mark required fields with native `required` plus a visible indicator explained once per form. Never block paste, because users paste passwords and one-time codes.

A valid `autocomplete` token on fields about the user is a requirement (1.3.5). Pair it with a descriptive `name` attribute, a real `<form>` and no fake inputs, so password managers and 2FA autofill work. Prefix with a section where relevant, as in `autocomplete="shipping street-address"`.

| Field | `autocomplete` |
| --- | --- |
| Name | `name`, or `given-name` and `family-name` |
| Email | `email` |
| Phone | `tel` |
| Address | `street-address`, `address-line1`, `postal-code`, `country` |
| Card | `cc-number`, `cc-exp`, `cc-csc`, `cc-name` |
| Login | `username`, `current-password` |
| Signup or reset | `username`, `new-password` |
| 2FA code | `one-time-code` |

Correct `type` and `inputmode` pick the right mobile keyboard.

| Input | Use |
| --- | --- |
| Email, URL, phone | `type="email"`, `type="url"`, `type="tel"` |
| OTP, PIN, card number | `type="text" inputmode="numeric"`, which keeps text semantics and has no spinner |
| Money, decimals | `type="text" inputmode="decimal"` |
| True numeric quantity | `type="number"` |

Disable spellcheck on emails, codes and usernames with `spellcheck="false"`.

## Errors that announce

Validate on submit, never by disabling submit until the form is valid.

```html
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email"
  aria-invalid="true" aria-describedby="email-error" />
<p id="email-error">Enter a valid email address.</p>
```

- `aria-invalid="true"` goes on the failing field and is removed once fixed.
- `aria-describedby` links the field to its inline error so screen readers announce it with the field.
- Errors render inline beside their fields, with an icon or text. Never a red border alone, which is a color-only cue.
- On submit, focus the first invalid field.
- Accept free text and validate after. Never block typing or filter characters as the user types. Trim values before validating, because autocomplete and text expansion add trailing spaces.

### Submit behavior

- Keep submit enabled until the request starts. While it runs, show a spinner beside the original label, so "Save" with a spinner rather than a bare spinner. The label tells assistive tech which button is busy.
- Mark the pending button `aria-disabled="true"` and ignore repeat clicks in the handler. Native `disabled` on the focused button drops focus to `<body>`.
- Announce results. Success goes through a polite live region. On failure, focus the first invalid field, which is itself the announcement. Reserve `role="alert"` for form-level errors not tied to a field.
- Warn on unsaved changes before navigation. A re-render or hydration must never reset a field's typed value or move focus out of it.

## Pair color with a second cue

Status needs a redundant cue such as an icon, text or an underline alongside the color (1.4.1).

This file decides which contrast requirement applies.

| Criterion | Applies to | Minimum |
| --- | --- | --- |
| 1.4.3 AA | Text | 4.5:1 |
| 1.4.3 AA | Large text, at least `24px` or `18.67px` bold | 3:1 |
| 1.4.11 AA | UI component boundaries, states and meaningful graphics | 3:1 |

Inactive controls and logos are exempt. Measure the rendered pair with [colors](colors.md). When it fails, report the pair and the criterion it misses, and leave the colors alone unless asked.

## Honor prefers-reduced-motion

Wrap animations in `@media (prefers-reduced-motion: no-preference)`, so users who asked for reduced motion get the static version without an override per animation.

```css
.card {
  /* static styles */
}
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 200ms ease-out; }
}
```

Reduced motion targets vestibular triggers, not feedback.

| Disable entirely | Replace | Keep |
| --- | --- | --- |
| Parallax scrolling | Slide, scale and zoom transitions with an opacity cross-fade | Loading spinners and progress |
| Autoplaying video, GIFs, looping decoration | Smooth scrolling with an instant jump | Instant state changes such as hover color and focus ring |
| Spinning, large-scale movement across the screen | Auto-rotating carousels with a paused start | Brief functional feedback such as a button press |

## Nothing the user needs runs on a timer

- **Visible controls on anything that moves on its own** (2.2.2). Anything moving, blinking or updating on its own for more than 5 seconds needs a visible pause or stop control, muted looping hero videos included.
- **Explicit dismissal over timers.** Auto-dismissal suits low-stakes confirmations only. A toast carrying an action, an error or information the user may need stays until dismissed.
- **Pause on attention.** Where a toast must time out, give it at least 5 seconds and pause the timer while it is hovered or focused.
- **Never put critical information only in a timed element.** A vanished toast holding the only link to an undo action is data loss on a schedule.

## Announce dynamic content

Work down this list and stop at the first match.

1. **Focus moves there anyway**, as with an opened modal or the first invalid field. The focus move is the announcement.
2. **Tied to a specific control**, such as a field error or character count. Use `aria-describedby` on the control.
3. **Non-urgent and not tied to a control**, such as a toast, "Saved", a result count or a loading state. Use a polite live region, `role="status"`.
4. **Urgent and not tied to a control**, such as a form-level failure or session expiry. Use `role="alert"`.

| Mechanism | Politeness | Use for |
| --- | --- | --- |
| `role="status"`, which is `aria-live="polite"` plus `aria-atomic="true"` | Waits for a pause | Toasts, "Saved", result counts, loading updates |
| `role="alert"`, which is `aria-live="assertive"` plus `aria-atomic="true"` | Interrupts immediately | Errors and urgent problems only |

- For repeated polite updates, keep a stable empty region in the DOM before changing its text. Inserting a new polite region with its content is announced inconsistently.
- Dynamically inserted `role="alert"` content is usually announced, but behavior varies. Test the target browser and screen-reader combinations.
- Default to polite. `assertive` interrupts whatever the user was reading.
- Keep messages short and self-contained, since `aria-atomic="true"` re-reads the whole region on change.
- Never move focus to a toast. Announce it and leave focus where the user is working.

For loading states, set `aria-busy="true"` on the updating region, announce "Loading…" politely, then announce the outcome, as in "Loaded, 12 results".

`aria-hidden="true"` removes an element and its whole subtree from assistive tech. Use it for decorative icons and content duplicated for visual effect. Never put it on or above a focusable element, which creates stops you can Tab to that do not exist for a screen reader.

### Visually hidden content

This hides content visually while keeping it in the accessibility tree.

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

Use `1px` boxes, not `0`, because some screen readers skip zero-sized elements. `white-space: nowrap` stops words being read as one run-together string. Never use `display: none` or `visibility: hidden`, which remove the content from assistive tech entirely. Use it for context sighted users get visually, such as `<span class="sr-only">Opens in new tab</span>`.

## Alt text by purpose

Choose by purpose, not by what the image looks like.

| Purpose | Alt | Example |
| --- | --- | --- |
| Decorative, or redundant with adjacent text | `alt=""`, empty but present | Logo next to the company name in text |
| Informative | Describe the meaning it adds | `alt="Ticket QR code"` |
| Functional, where the image is the link or button | Describe the action or destination | Search icon is `alt="Search"`, not `alt="magnifying glass"` |
| Image of text | The exact text, or better, use real text | `alt="50% off everything"` |
| Complex, such as a chart or diagram | Short summary in `alt`, full data as a table or text nearby | `alt="Revenue by quarter, described below"` |

A missing `alt` is worse than an empty one, because screen readers fall back to reading the file name.

- Decorative SVG gets `aria-hidden="true"` and needs no title.
- Meaningful inline SVG gets `role="img"` plus `aria-label`, or a `<title>` as the first child referenced by `aria-labelledby`.
- For simple cases, `<img src="icon.svg" alt="…">` is the most reliable delivery.

Prerecorded video needs captions (1.2.2) and prerecorded audio needs a transcript (1.2.1). Never autoplay with sound (1.4.2), and always render controls.

## Survive zoom and text resize

Text must survive 200% resize (1.4.4), and the page must reflow at 320px width without horizontal scrolling (1.4.10). At 400% zoom on a 1280px viewport, which equals a 320px one, the page must work with vertical scrolling alone. Genuinely 2D content such as tables, maps and code blocks scrolls inside its own container.

Text containers take `min-height`, not `height`. [Layout](layout.md) owns the rest of that fix. Never set `maximum-scale=1` or `user-scalable=no` in the viewport meta. Fix iOS input zoom with the `16px` rule in [typography](typography.md).

Write media queries in `rem` or `em` where the codebase allows. At a larger browser font size such a query switches to the narrow layout when the text needs it, and a `px` query does not.

## Severity

`HIGH` prevents a task, hides content from assistive technology or creates a systemic failure. `MEDIUM` makes an interaction meaningfully harder. `LOW` is isolated polish.

This domain's share of the escalation triggers in [severity](severity.md) is `HIGH` on sight. That is a missing accessible name, a missing focus indicator and a pointer path with no keyboard path. It is also motion ignoring reduced motion, loss at 320px or 200%, and meaning carried by color alone.

## Verification

Without a browser, check accessible names on every interactive element, keyboard handlers on non-native controls, focus styles, `prefers-reduced-motion` guards and form labels bound to their inputs. With one, run the mode checks above, read computed names and roles from the accessibility tree, confirm a visible focus indicator at every stop and run an automated audit. Report every check you could not run as `Not verified`.

## Before you finish

| Pattern | Fix |
| --- | --- |
| `outline: none` with no `focus-visible` replacement nearby | Restore the browser ring or add a verified custom one |
| `<div onClick` or `<span onClick` | Use `<button>`, or `<a href>` when it navigates |
| `role="button"` or `role="tab"` with no key handler | Use the native element, or implement the APG key map |
| A positive `tabindex` | Fix the DOM order and use `0` |
| A submit button disabled until the form is valid | Keep it enabled and validate on submit |
| A status region mounted together with its text | Render the empty region first and update its text |
| `aria-live="assertive"` on a success toast | `role="status"` |
| `<img` with no `alt` attribute | `alt=""` if decorative, otherwise describe the purpose |
| `aria-label` whose text omits the visible label | Start the name with the visible text |
| `aria-hidden` on an ancestor of a button, link or input | Remove it, or make the subtree inert |
| `maximum-scale=1` or `user-scalable=no` | Remove it |
| A tooltip on a natively `disabled` control | Text beside it, or `aria-disabled` so it stays focusable |
| A drag handler with no button alternative | Add a single-pointer path to the same result |
