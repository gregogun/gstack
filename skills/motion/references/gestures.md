# Gestures

A gesture-driven value needs a spring, because the user can reverse or interrupt it mid-motion. A fixed-duration tween, a CSS transition, or keyframes can't carry the velocity through that change.

## Springs

Reach for a spring when the motion is any of these.

- A drag interaction with momentum.
- An element that should feel alive.
- A gesture the user can interrupt or reverse.
- Decorative mouse tracking.

Springs settle by physical parameters and have no fixed duration. Write every spring as a duration and a bounce.

```js
{ duration: 0.5, bounce: 0.2 }
```

- Keep bounce within 0.1-0.3.
- Use bounce 0 when no momentum preceded the motion.
- Avoid bounce in most UI. Reserve it for drag-to-dismiss and playful interactions.

### Interruption

A spring keeps its velocity when interrupted. CSS animations and keyframes restart from zero. Click an expanded item and press Escape quickly, and a spring reverses smoothly from its current position. That is why a gesture settles with a spring.

### Tying visuals to the mouse

Tying a visual change directly to mouse position feels artificial because it lacks motion. Interpolate the value with a spring so it has momentum instead of updating immediately.

This works only because the effect is decorative. If it were a functional graph in a banking app, no animation would be better. Know when decoration helps and when it hinders.

### No library

With no motion library in the repo, write the spring by hand and say so. Store the position and velocity, step them toward the target each frame, and write the result to the element's `transform`. Never write them to state, per [`performance.md`](performance.md).

## Dismiss on velocity, not only distance

Don't require dragging past a threshold. Calculate velocity as distance over elapsed time. If it exceeds about 0.11, dismiss regardless of distance. A quick flick should be enough.

```js
const timeTaken = Date.now() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;

if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
  dismiss();
}
```

## Details that separate a good drag from a bad one

- **Pointer capture.** Once the drag starts, capture all pointer events so the drag continues when the pointer leaves the element's bounds.
- **Multi-touch protection.** Ignore additional touch points after the drag begins. Without this, switching fingers mid-drag makes the element jump to the new position.

  ```js
  function onPress() {
    if (isDragging) return;
    // Start drag...
  }
  ```

- **Damping past boundaries.** Dragging beyond a natural edge, such as a drawer pulled up when already at the top, moves the element less the further it goes. Real things slow before they stop.
- **Friction, not a wall.** Allow the over-drag with rising resistance rather than refusing it. It feels more natural than hitting an invisible wall.
- **Symmetric paths.** A toast that slides in from the bottom leaves through the bottom. Symmetric paths are what make swipe-to-dismiss feel obvious.

## Write the transform on the element

Set `transform` on the dragged element directly. Driving it through a CSS variable on a parent recalculates styles for every child, and a drawer with many items gets laggy.

```js
// Bad, triggers recalculation on all children
element.style.setProperty('--swipe-amount', `${distance}px`);

// Good, only affects this element
element.style.transform = `translateY(${distance}px)`;
```

Look for state updates inside `pointermove` handlers too. Write to `element.style`, not state.

## Hover and touch

Touch devices fire hover on tap, which gives false positives. Gate hover motion.

```css
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

`:active` press feedback needs no gate, since a press is real on touch. Keep it within `scale(0.95)` to `scale(0.98)`, usually `scale(0.97)` at 160ms with `--ease-out`.

## Before and after slider

Overlay two images and clip the top one with `clip-path: inset(0 50% 0 0)`. Adjust the right inset from the drag position. It needs no extra DOM elements and is fully hardware-accelerated.

## Reduced motion

Keep the gesture and drop the flourish. Reduced motion means gentler, not zero. Keep opacity and color feedback and remove the movement the gesture added on top, such as the overshoot and the bounce.

## Test on a real device

Touch interactions (drawers, swipe gestures) need physical devices. Connect a phone over USB, open the local dev server by its IP address, and use remote devtools. A simulator is an alternative, but real hardware is better for gesture testing. Step the settle frame by frame in the DevTools Animations panel to catch timing gaps between coordinated properties.
