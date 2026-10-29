# Recipes

Adapted from Emil Kowalski's `animate` recipes.

Start from the recipe that matches the request and adapt it. Don't rebuild from scratch. Curves are the `--ease-out`, `--ease-in-out`, and `--ease-drawer` tokens in the Values section of [`../SKILL.md`](../SKILL.md). A repo's own tokens override them.

Open and closed state below is a class or attribute the repo's component already toggles. Use the repo's own primitive for the component itself, per the tool ladder.

---

## Button press

Any pressable element. Instant feedback that the interface heard the user.

```css
.button {
  transition: transform 160ms var(--ease-out);
}

.button:active {
  transform: scale(0.97);
}
```

`scale()` scales children too. The label and icons come along, which is what makes it read as a physical press.

No hover gating is needed here, since `:active` is a real press on touch. Gate any `:hover` styling separately.

---

## Dropdown, popover, menu, select

Scales out of its trigger, not out of thin air.

```css
.popover {
  transform-origin: var(--transform-origin); /* set from the trigger's position */
  transition:
    opacity 200ms var(--ease-out),
    transform 200ms var(--ease-out);

  @starting-style {
    opacity: 0;
    transform: scale(0.95);
  }
}

.popover[data-closing] {
  opacity: 0;
  transform: scale(0.95);
}
```

The `transform-origin` is the whole point. The panel should look like it came out of the thing you clicked.

---

## Tooltip

Same shape as a popover, faster, plus the detail most implementations miss.

```css
.tooltip {
  transform-origin: var(--transform-origin);
  transition:
    transform 125ms var(--ease-out),
    opacity 125ms var(--ease-out);

  @starting-style {
    opacity: 0;
    transform: scale(0.97);
  }
}

.tooltip[data-closing] {
  opacity: 0;
  transform: scale(0.97);
}

/* Once one tooltip is open, neighbours open instantly */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

The initial delay prevents accidental activation. After that, skipping both the delay and the animation makes the whole toolbar feel faster.

---

## Modal

The one popover that stays centered.

```css
.modal {
  transform-origin: center; /* exempt, not anchored to a trigger */
  transition:
    opacity 250ms var(--ease-out),
    transform 250ms var(--ease-out);

  @starting-style {
    opacity: 0;
    transform: scale(0.96);
  }
}

.modal[data-closing] {
  opacity: 0;
  transform: scale(0.96);
}

.backdrop {
  transition: opacity 250ms var(--ease-out);
}
```

Animate the backdrop's opacity alongside it so they read as one surface.

---

## Drawer and sheet

```css
.drawer {
  transform: translateY(0);
  transition: transform 500ms var(--ease-drawer);
}

.drawer[data-closed] {
  transform: translateY(100%);
}
```

Hide the drawer with `translateY(100%)` first, then animate it in.

Add drag and it becomes a gesture problem. See [`gestures.md`](gestures.md).

---

## Toast

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 400ms ease,
    transform 400ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

- The curve is `ease` rather than `ease-out`, and slightly slower than typical UI. A toast reads as elegant partly because its motion is tuned to the component's personality rather than to the generic UI budget.
- If `@starting-style` isn't available, fall back to a mount flag.

```jsx
useEffect(() => { setMounted(true); }, []);
// <div data-mounted={mounted}>
```

When toasts stack and the list reflows, the opacity change has to work against the height change. There is no formula for that pair. Adjust until it feels right, then check it again the next day.

---

## Accordion and collapse

```css
.content {
  overflow: hidden;
  transition:
    height 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}
```

Keep it short. This is one of the few animations that costs layout on every frame, so a long duration is expensive as well as sluggish. Measure the content height in JS, or use a primitive that supplies it, rather than animating to `auto`.

---

## Stagger a group entrance

For a list or grid the user sees occasionally. Not for a list they scroll past all day.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 300ms var(--ease-out) forwards;
}

.item:nth-child(2) { animation-delay: 50ms; }
.item:nth-child(3) { animation-delay: 100ms; }
.item:nth-child(4) { animation-delay: 150ms; }

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Stagger is decorative. It must never block interaction while it plays. The 50ms step sits inside the 30-80ms range.

---

## Hold to confirm

For destructive actions where a plain click is too easy to fire by accident.

```css
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms var(--ease-out); /* release: snappy */
}

.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear;             /* press: slow and deliberate */
}

.button:active {
  transform: scale(0.97);
}
```

`linear` is correct here. The fill is a progress indicator, and progress shouldn't ease.

---

## Tab indicator with a color transition

Timing individual color transitions across a tab list never quite lands. Clip instead.

Duplicate the tab list. Style the copy as the active state, with a different background and text color. Clip the copy so only the active tab shows, and animate the clip on change.

```css
.tabs-active-copy {
  clip-path: inset(0 60% 0 20%); /* driven by the active tab's position */
  transition: clip-path 250ms var(--ease-in-out);
}
```

The text and background change together, in sync, because they're one element being revealed rather than two colors being interpolated.

---

## Scroll reveal

Marketing surfaces only. Don't do this to functional UI a user visits daily.

```css
.reveal {
  clip-path: inset(0 0 100% 0);
  transition: clip-path 600ms var(--ease-in-out);
}

.reveal[data-visible] {
  clip-path: inset(0 0 0 0);
}
```

Trigger it with an `IntersectionObserver` using `rootMargin: '-100px'`, and fire it once. Re-animating on every scroll-by is an interface fighting its reader.

---

## Drag to dismiss

This is the gesture recipe. The full model, with thresholds, damping, and the settle spring, is in [`gestures.md`](gestures.md).

---

## Masking a crossfade that won't settle

When two states overlap visibly during a transition and no amount of easing or duration tuning fixes it, blur the seam.

```css
.content {
  transition:
    filter 200ms ease,
    opacity 200ms ease;
}

.content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

Without blur the eye reads two distinct objects swapping. Blur blends them into one perceived transformation. Keep it under 20px. Heavy blur is expensive, especially in Safari.

---

## Programmatic, without a library

When the motion needs JS control but not a dependency, WAAPI gives CSS-grade performance.

```js
element.animate(
  [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
  { duration: 1000, fill: 'forwards', easing: 'cubic-bezier(0.77, 0, 0.175, 1)' }
);
```

It can run off the main thread, it is interruptible, and it has no bundle cost.

---

## Small fixes

| Problem | Solution |
|---|---|
| Button feels unresponsive | `transform: scale(0.97)` on `:active` |
| Dropdown feels sluggish | `ease-out` under 300ms, never `ease-in` |
| Popover grows from the wrong spot | `transform-origin` at the trigger. Modals stay centered. |
| Transition still feels off | `filter: blur(2px)` during the transition |
| Numbers jitter when they change | `font-variant-numeric: tabular-nums` |
