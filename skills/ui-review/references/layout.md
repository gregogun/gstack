# Layout

Adapted from Jakub Krehel's `better-layout`.

Grouping, alignment, spacing and responsive structure, then a stress test by resizing, translating and mirroring for RTL. Write every fix in the project's styling system. The numbers below apply only where the project has no spacing scale or density system. Otherwise use its tokens. A finding needs a failure you can show, such as a clip, an overlap, a broken mirror or a misread group. A value that differs from these starting points is not one.

Hit areas and focus behavior belong to [accessibility](accessibility.md) and [mobile](mobile.md). Radius, shadows and animation belong to [surfaces](surfaces.md). Line length, text spacing and truncation mechanics belong to [typography](typography.md).

## Group with space, not lines

Reach for each tool only where the one before it can't carry the structure.

1. **Negative space**, the default.
2. **Background shapes**, a card or filled container, where a group must read as one unit such as a selectable row or a draggable card.
3. **Separator lines**, for dense data where space costs too much, such as tables and long settings lists.

The gap between groups is at least 2x the gap within one, so `8px` inside a group means `16px` or more between groups.

```css
/* Good, spacing alone communicates the grouping */
.field-group { display: flex; flex-direction: column; gap: 8px; }
.form { display: flex; flex-direction: column; gap: 24px; }

/* Bad, uniform spacing plus lines to compensate */
.form > * { margin-bottom: 12px; border-bottom: 1px solid var(--separator); }
```

Where a separator is genuinely needed, keep it a low-contrast hairline. Never pair it with a large gap that already did the job.

## Keep controls distinct from content

Give every interactive element a background shape, a border, an underline or a consistent placement zone such as a toolbar. A control styled like the static text beside it does not read as a control.

```html
<!-- Bad, the action looks exactly like the description beside it -->
<p class="muted">Your trial ends soon. Upgrade now</p>

<!-- Good, the underline marks the action -->
<p class="muted">Your trial ends soon.</p>
<button class="link-button">Upgrade now</button>
```

The inverse holds too. A non-clickable badge shaped exactly like the buttons beside it collects dead clicks.

## Align to shared edges

Pick a small set of alignment edges and put everything on them. Use one project spacing step per level of nesting, where `16px` is a useful default.

- Typical stray edges are an icon 2px off the text edge and a card padded unlike its neighbor.
- Deeper nesting repeats the same spacing step rather than inventing a new one.
- Numbers in tables take `text-align: end`. Text takes `text-align: start`.

```css
/* Good, one shared leading edge and one indent step */
.section { padding-inline: 24px; }
.section .child { margin-inline-start: 16px; }

/* Bad, three unrelated leading edges in one column */
.header { padding-inline-start: 20px; }
.list-item { padding-inline-start: 14px; }
.footer { padding-inline-start: 24px; }
```

## Logical properties for anything that mirrors

Write direction-dependent layout as leading and trailing. Reserve physical left and right for physical geometry such as safe-area insets.

| Physical | Logical |
| --- | --- |
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `border-right` | `border-inline-end` |
| `float: left` | `float: inline-start` |
| `border-top-left-radius` | `border-start-start-radius` |

Flex rows and grid columns follow the inline direction, so they mirror under `dir="rtl"` on their own. Physical values inside them do not mirror, and neither do `translateX`, `background-position` or anything hand-positioned with `left` and `right`.

Where arrangement encodes progression, as in star ratings, step indicators and progress bars, the sequence mirrors in RTL. Stars fill from the leading edge, which is the right in RTL. Digit order inside numbers never reverses. See [typography](typography.md).

## Order by importance

The most important content sits near the top and the leading edge. Within a row, identifying content leads and metadata and actions trail. Visual order matches DOM order, so never move content out of source sequence with `order`, `row-reverse` or grid placement.

Never bury the one number the user came for under rows of secondary detail. Move secondary detail into collapsed sections, tabs or detail views.

```html
<!-- Good, primary fact first and detail demoted -->
<div>
  <p class="figure">$4,320.00</p>
  <p class="caption">Available balance</p>
</div>

<!-- Bad, the key fact sits last below the metadata -->
<div>
  <p>Account 4402 · Opened 2019 · Standard tier</p>
  <p>Last statement: June 30</p>
  <p>Balance: $4,320.00</p>
</div>
```

## One primary action per view

Give each view one primary action. Put secondary actions behind a menu once there are more than 3. Prefer a short view that links deeper over one long view that shows everything at the top level. [Colors](colors.md) owns how color marks the primary action.

## Hint at hidden content

Every piece of off-screen or collapsed content needs a visible cue. Use the project's established cue, let the next item peek `16` to `32px` past the scroll edge, or show a disclosure control.

- **Peeking items.** A row of cards that ends exactly at the container edge looks complete, and nobody scrolls it.
- **Disclosure controls.** A collapsed section gets a chevron or a "Show more" control naming what is hidden, as in "Show 12 more results", not "More".
- **Truncated values.** A truncated value the user needs has a way to the full text. That is an expand control, a link to a detail view, or a tooltip that also opens on keyboard focus. A hover-only `title` attribute does not count, because keyboard and touch users never see it.

The item width sets the peek. Width is `100%` plus the gap minus the peek, since `100%` is the container's content box. Scroll padding keeps snapped items on the content edge.

```css
.scroller {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-inline: 24px;
  scroll-padding-inline: 24px;
  scroll-snap-type: x mandatory;
}
.scroller > * {
  flex: 0 0 calc(100% - 12px); /* content box + 12px gap - 24px peek */
  scroll-snap-align: start;
}
```

## Borderless controls need more clearance

| Between | Starting point |
| --- | --- |
| Adjacent bordered or filled controls, such as buttons and inputs | `12px` |
| Visible glyphs of borderless controls, such as text and icon buttons | `24px`, counting each button's own padding |
| Unrelated control groups | `24px` or more |

Nothing marks where one borderless target ends and the next begins, so the space is the boundary. Compact layouts may use less, as long as hit areas never overlap and the controls stay distinct. Preserve an established, usable density rather than expanding controls to match these values. Space controls so their expanded hit areas never overlap.

```html
<!-- Good, bordered buttons at 12px -->
<div class="row" style="gap: 12px">
  <button class="outlined">Cancel</button>
  <button class="filled">Save</button>
</div>

<!-- Bad, three borderless icon buttons packed at 4px -->
<div class="row" style="gap: 4px">
  <button><svg aria-hidden="true">…</svg></button>
  <button><svg aria-hidden="true">…</svg></button>
  <button><svg aria-hidden="true">…</svg></button>
</div>
```

## Inset buttons from the edges

In content layouts, keep full-width buttons inside the layout margins, starting near `16px` inline on mobile. A button pressed against the viewport looks like system chrome and clips against curved corners and gesture zones. Edge-to-edge actions work when they follow established platform chrome, account for safe areas and stay distinguishable from system UI. The button can still span the full content width inside the margins.

```css
/* Good, inset action bar */
.action-bar {
  padding-inline: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
.action-bar button { width: 100%; }

/* Bad, button glued to three edges, and 100vw adds the scrollbar width */
.action-bar button {
  width: 100vw;
  position: fixed;
  bottom: 0;
}
```

## Content bleeds, controls float

Backgrounds and media extend to the viewport edges. Controls and text stay inside the layout margins and safe areas. `env(safe-area-inset-*)` is non-zero only when the viewport meta includes `viewport-fit=cover`.

```css
/* Good, full-bleed media inside a constrained article */
.article {
  display: grid;
  grid-template-columns: 1fr min(65ch, calc(100% - 48px)) 1fr;
}
.article > * { grid-column: 2; }
.article > .full-bleed { grid-column: 1 / -1; }
```

Safe-area insets are physical, so a floating button pairs each physical side with its own inset and overrides it in RTL.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.fab {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right));
  bottom: calc(16px + env(safe-area-inset-bottom));
}
[dir="rtl"] .fab {
  right: auto;
  left: calc(16px + env(safe-area-inset-left));
}

/* A sticky header never covers an anchor target or a focused element */
html { scroll-padding-block-start: var(--header-height); }
```

Content scrolls beneath sticky chrome. Set `scroll-padding-block-start` to the sticky header's height, so anchored targets and focused elements never land under it.

## Hold structure until it breaks

Breakpoints come from the content, not device presets. Break where the layout stops fitting, not at `768px` because a preset says so. That is where the sidebar squeezes content below its minimum measure, or a card grid drops below a usable column width. Prefer container queries for component-level adaptation, and test the smallest and largest supported sizes first.

```css
/* Good, component adapts to its container */
.card-list { container-type: inline-size; }
@container (width < 400px) {
  .card { grid-template-columns: 1fr; }
}

/* Bad, a viewport media query breaks the card inside a narrow sidebar */
@media (max-width: 768px) {
  .card { grid-template-columns: 1fr; }
}
```

A query styles only descendants of the container, never the container itself. `container-type: inline-size` adds size containment, so the container no longer takes its width from its content. A shrink-to-fit container such as a flex item with no width, an inline-block or an absolutely positioned box collapses to zero. Give it a definite width.

## Plan for growth and clipping

Translated strings grow, and short ones grow proportionally more, so a one-word button label is the riskiest thing on the screen. Size text containers with `max-width` and `min-height`, never a fixed width or height, and let rows wrap. Test with pseudo-localization and one long-string locale such as German.

```css
/* Good, the label defines the size and the row wraps */
.button { padding-inline: 16px; max-width: 100%; }
.button-row { display: flex; flex-wrap: wrap; gap: 12px; }

/* Bad, German will overflow or truncate */
.button { width: 96px; overflow: hidden; }
```

A grid track or flex child refuses to shrink below its content's minimum width, so long words and wide tables push the layout past the viewport. Use `grid-template-columns: minmax(0, 1fr)` and `min-width: 0` on flex children.

Fixed-height containers clip text at 200% zoom and in long locales. Use `min-height` where a floor is needed. Where a box must cap its height, pair `max-height` with `overflow-y: auto`.

Never park a critical action where resizing, zoom or scrolling clips it. Typical clip-prone spots are the bottom edge of a resizable pane, the bottom of a modal taller than the viewport and anything the on-screen keyboard covers.

- Size full-height panes with `100dvh`, not `100vh`, which ignores mobile browser toolbars.
- Give a modal `max-height: 100dvh`, a scrolling body and an action row outside the scroll area.
- Keep primary actions in stable chrome, such as a sticky footer with safe-area padding or the top of the view.

## Severity

`HIGH` blocks content or an action at a supported viewport. Clipping or overlap at 320px width or 200% zoom is always `HIGH`, as is truncated content with no way to the full value. So is content past a scroll edge or behind a disclosure with no visible cue. `MEDIUM` harms hierarchy, reading order or adaptability. `LOW` is isolated alignment or spacing polish.

## Verification

Without a browser, check logical properties in place of physical ones, container and media queries against the supported viewport list, and DOM order against visual order. With one, check every supported width, 320px, 200% zoom and the RTL mirror. Report every check you could not run as `Not verified`.

## Before you finish

| Detection pattern | Fix |
| --- | --- |
| `grid-template-columns: … 1fr` or a flex child holding long text or a wide table, overflowing its track | `minmax(0, 1fr)` on the track, `min-width: 0` on the flex child |
| `width: 100vw` | `width: 100%`. `100vw` includes the scrollbar and scrolls horizontally on desktop |
| `height: 100vh` on a full-height mobile pane | `100dvh`, so the browser toolbar and keyboard never cover the bottom |
| `height:` with a fixed length on a box holding text | `min-height`, or `max-height` with `overflow-y: auto` |
| `@media (max-width: …)` inside a reusable component | `@container` on the component's parent |
| `container-type: inline-size` on a flex item, inline-block or absolute element with no width | Give it a definite width |
| `env(safe-area-inset-*)` with no `viewport-fit=cover` in the viewport meta | Add it, or the insets resolve to `0` |
| `inset-inline-*` combined with `safe-area-inset-left` or `-right` | Physical `left` or `right` with the matching inset, plus a `[dir="rtl"]` override |
| `float: left` on mirrored UI | `float: inline-start` |
| `translateX` or `background-position: left` on mirrored UI | A `[dir="rtl"]` override, since neither has a logical form |
| Sticky header with no `scroll-padding-block-start` | Set it to the header height |
