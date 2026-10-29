# Mobile

Adapted from Jakub Krehel's `better-accessibility` hit areas, with touch and small-screen rules from `better-typography`, `better-layout` and `better-ui`.

Touch targets, hit areas, gestures, input zoom, viewport units, safe areas and hover on touch. The rules live in their owning domains. This file collects what changes on a phone.

## Target sizes

| Standard | Minimum |
| --- | --- |
| WCAG 2.5.8 (AA) | 24x24px, with exceptions |
| WCAG 2.5.5 (AAA) | 44x44px |
| Apple HIG | 44x44pt |
| Material Design | 48x48dp |

Before reporting an undersized target, check the spacing, equivalent-control, inline, user-agent and essential exceptions.

Under the spacing exception, an undersized target passes when a 24px circle centred on its bounding box intersects no other target and no other undersized target's circle. In the simple case, 20px targets need a 4px gap.

The visible element can stay small. The hit area is what must be big. Anything that looks clickable must be clickable across its whole visual extent.

## Expanding the hit area

Where the visible element is smaller, say a 20x20 checkbox, extend the hit area with a pseudo-element. Put it on a wrapping element or the `<button>`, never on the `<input>`, because form controls do not render `::before` or `::after` reliably.

```css
/* 20px checkbox with a 44px hit area, on the wrapper around the input */
.checkbox-control {
  position: relative;
  width: 20px;
  height: 20px;
}

.checkbox-control::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%; /* physical centring, direction-independent */
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
}
```

Where the element can afford real box size, skip the pseudo-element and let the box be the target.

```css
.icon-button {
  min-width: 44px;
  min-height: 44px;
  display: inline-grid;
  place-items: center;
}
```

## Collision rule

Where the extended hit area overlaps another interactive element, shrink the pseudo-element to the largest size that does not collide.

## Decorative layers

A decorative layer painted over interactive content absorbs every pointer event its box covers. That includes a gradient scrim, a glow, a blurred sheen and a full-bleed `::after`. The control underneath looks live and does nothing, and no hit-area sizing fixes it.

Give each one `pointer-events: none`. A layer that is an element rather than a pseudo-element also gets `aria-hidden="true"`.

```css
.card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
```

Keep pointer events on any layer the user is meant to hit. A modal scrim that dismisses on click is a control, not decoration.

## Gestures and dragging

- Every drag needs a single-pointer alternative under WCAG 2.5.7, such as move-up and move-down buttons on a sortable row, or a menu on a kanban card.
- Every multipoint or path-based gesture, such as a pinch or a swipe, needs a single-pointer alternative under 2.5.1.
- Set `touch-action: none` on a surface implementing its own pan, zoom or drag gestures, so the browser stops claiming them for scrolling and pinch-zoom. Scope it to that surface. At page level it removes scrolling.

## Zoom and viewport

- Never set `maximum-scale=1` or `user-scalable=no` in the viewport meta. Pinch zoom is an accessibility need. See [accessibility](accessibility.md).
- Form inputs under `16px` make iOS zoom the page on focus. Fix the size, not the viewport. See [typography](typography.md).
- Use `100dvh` or `100svh` for full-height layouts. `100vh` runs under the browser toolbar on phones.
- Pad fixed bars and edge-anchored controls with `env(safe-area-inset-*)`, and set `viewport-fit=cover` when drawing under the notch. See [layout](layout.md).
- A bottom-fixed control must stay reachable when the on-screen keyboard opens.
- A horizontal scroller should show a peek of the next item, so the scroll is discoverable. See [layout](layout.md).

## Hover on touch

Hover-only styling goes behind `@media (hover: hover)`. A hover-revealed action needs a visible or tap path on touch. See [surfaces](surfaces.md).

## Severity

An undersized target with no spacing exception, a dead control under a decorative layer, a drag with no single-pointer alternative and a viewport that blocks zoom are `HIGH` when they stop a task. An undersized target that is only tight is `MEDIUM`.

## Verification

Without a browser, read target sizes from the code and look for `pointer-events` on overlays. With one, emulate a 320px touch viewport, measure target boxes, tap each control, and focus each input. Mode emulation is in [accessibility](accessibility.md). Report every check you could not run as `Not verified`.

## Before you finish

| You notice | Correct it |
| --- | --- |
| A target under 24px with no exception | Enlarge the box or expand the hit area |
| A pseudo-element hit area on an `<input>` | Move it to the wrapper |
| An expanded hit area overlapping a neighbour | Shrink it until it clears |
| A glow or scrim over a control with pointer events on | `pointer-events: none` |
| A drag with no button alternative | Add move controls |
| `touch-action: none` on `body` | Scope it to the gesture surface |
| `maximum-scale=1` or `user-scalable=no` | Remove it |
| `100vh` on a full-height mobile layout | `100dvh` |
| A fixed bar with no safe-area padding | `env(safe-area-inset-bottom)` |
