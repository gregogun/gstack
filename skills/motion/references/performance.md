# Performance

This reference does one thing. It makes motion land every frame. It does not pick easing or duration, and it does not judge whether the motion should exist. The question is never "does it look right?" but "does each frame finish in time?".

## Posture

Two failure modes, and the first is worse.

1. **"It's smooth on my machine."** A fast laptop hides almost every problem here. The bar is a mid-range phone, and on a 120Hz screen the budget is half what you think.
2. **Sprinkling `will-change` and calling it fixed.** It is the last step, not the first. Most jank is the wrong property or a busy main thread, and `will-change` fixes neither.

## Hard rules

1. **`transform` and `opacity` by default.** Anything else needs a reason. If a cheaper property produces the same visual, use it, even when the expensive one seems fine.
2. **Name the cause before changing code.** Every fix names which cause below it addresses. "Added `will-change`, seems smoother" is not a diagnosis.
3. **Never conclude "it's fine" from a fast machine.** Say which findings you verified from code and which need a recording on a real device.
4. **Never `transition: all`.** List the exact properties. `all` animates whatever changes next, including layout properties nobody meant to animate.
5. **Don't trade correctness for a best-effort optimization.** Hardware acceleration is something the browser may grant. Which properties you animate is something you control. Spend effort on the second.

## Symptom table

Start here. Match what the user sees, then read the matching section.

| Problem | Solution |
|---|---|
| Animation stutters | Animate `transform` and `opacity`, not `width`, `height`, `top`, or `margin` |
| Shadow animation is choppy | `filter: drop-shadow()` |
| Jank only during navigation or loading | Move the animation to CSS or WAAPI so it runs off the main thread |
| Hand-rolled animation drops frames in React | Write to `ref.current.style`, not state |
| Drag gets laggier as the list grows | Stop animating an inherited CSS variable. Set `transform` directly. |
| Blur transition lags, especially in Safari | Keep animated `blur()` under 20px |
| Unexpected properties animate | Replace `transition: all` with explicit properties |
| Long list scrolls slowly | Virtualize, so only what is visible renders |
| Element shifts 1px when motion starts or ends | `will-change: transform`, only once you see it |

## The frame budget

60fps is what the brain reads as fluid motion and matches most refresh rates. It gives the browser 16.7ms (1000/60) per frame. On a 120Hz screen, now most phones and many laptops, it is 8ms. Design against the smaller number.

For scale, a layout recalculation on a complex page can take over 100ms. That is not one missed frame but a dozen.

Two things decide whether you stay inside the budget.

1. **What you animate.** How much work each frame costs.
2. **Where it runs.** Whether that work can be blocked by everything else the page is doing.

## What you animate

To show a visual change, the browser runs up to three steps.

- **Layout.** Calculate the size and position of every element.
- **Paint.** Draw the page into layers.
- **Composite.** Put those layers on screen.

Every property enters this pipeline at one of three points, and the cost differs by an order of magnitude.

| Tier | Properties | Cost |
|---|---|---|
| Composite only | `transform`, `opacity`, and in current Chrome and Firefox also `filter`, `clip-path`, `background-color` | Cheapest. Browsers promote these to their own layer. |
| Paint and composite | `box-shadow`, `border-radius`, `color` | No re-measuring, but a redraw every frame. |
| Layout, paint, and composite | `width`, `height`, `padding`, `margin`, `top`, `left`, `border-width` | Most expensive. One growing element can move everything around it. |

`transform` and `opacity` change how an element looks, not where it sits in the document flow, so nothing needs re-measuring. Anything else in the composite tier needs testing across browsers and devices, since support is uneven.

Swapping down a tier.

| Instead of | Animate |
|---|---|
| `width`, `height`, or `padding` to grow or shrink | `scale()` |
| `top`, `left`, or `margin` to move | `translate()` (percentages are relative to the element's own size) |
| `display` or `visibility` swaps | `opacity` |
| `box-shadow` | `filter: drop-shadow(...)` |

The last one is the one people miss. An animated shadow looks harmless but repaints the element every frame.

Two things follow.

- **Layout animations don't always drop frames.** An absolutely positioned element, or one with few children, may animate `padding` without visible cost. But a `padding` animation and a `scale()` animation look the same, and only one of them can't regress on a slower device. Pick the one with no downside.
- **Layout properties also move the wrong things.** Animating a sidebar's `margin-left` pushes the content beside it on every frame, and `translateX` doesn't. For a dashboard next to an opening sidebar, that is the whole page re-laid-out 60 times a second.

## Where it runs

JavaScript always runs on the main thread. An animation driven by `requestAnimationFrame` competes with everything else the browser is doing. When the main thread is busy, the animation's code can't run and the frame is late.

| Driver | Thread |
|---|---|
| JS with `requestAnimationFrame` | Main thread, always |
| Web Animations API (`element.animate()`) | Can be hardware-accelerated |
| CSS transitions and keyframes | Can be hardware-accelerated |

Hardware acceleration means the animation runs off the main thread, so it stays smooth no matter what JavaScript is doing. "JS" and "main thread" are not synonyms. Code that hands off to WAAPI can be accelerated, and a `requestAnimationFrame` loop can't.

Reliably accelerated are `transform` and `opacity`. Gaining support are `filter`, `clip-path`, and `background-color`.

Watch for motion that runs while the page is doing heavy work. Page transitions, tab indicators during navigation, and anything that fires alongside data fetching or hydration all qualify. A dashboard that animated its active tab indicator with a JS layout animation dropped frames because the browser was loading the next page at that moment. Moving it to a CSS animation fixed it.

Acceleration is progressive enhancement. Browsers silently decline it under conditions that change between versions. Chrome, for example, historically didn't accelerate percentage-based transforms. That is not a reason to stop using `translateY(100%)`. Percentages are the right call for elements of unknown size, and correctness beats a best-effort optimization.

A JS animation library that sets shorthand transform values through CSS variables is not accelerated, because animated CSS variables aren't. If the repo uses one, check whether it can write a full `transform` string, and switch to that form when the animation has to survive a busy main thread.

## React, don't animate through state

Animation libraries animate outside React's render cycle, so they are fine. The trap is a hand-rolled animation that calls `setState` every frame. The component re-renders every 16.7ms, and the render alone blows the budget.

```jsx
// Drops frames, one re-render per frame
setY(nextY);

// Smooth, no re-render
ref.current.style.transform = `translateY(${nextY}px)`;
```

Look for state updates inside `requestAnimationFrame`, `pointermove`, `scroll`, or drag handlers.

## Two traps that look correct

Both of these use `transform` and still drop frames.

**Inherited CSS variables.** A drawer's drag got laggy once it held more than about 20 items, with no re-renders involved. The drag distance was written to a CSS variable that `translateY()` read.

```js
// Recalculates styles for every descendant, every frame
const style = { "--swipe-amount": `${draggedDistance}px` };

// Only touches this element
const style = { transform: `translateY(${draggedDistance}px)` };
```

CSS variables inherit, so changing one on a parent triggers style recalculation for every child. The more content, the slower each frame. Suspect this whenever a `transform` animation degrades as content grows.

**Blur.** `filter: blur()` gets expensive fast, especially in Safari. Keep animated blur under 20px. 2px to 5px is enough to soften a crossfade.

## `will-change`

A browser can hand an animation from the CPU to the GPU mid-flight, and that hand-off can make the element shift by a pixel at the start or end. `will-change` promotes the element up front so no hand-off happens.

```css
.drawer {
  will-change: transform;
}
```

Add it only once you see the shift or measured dropped frames. Browsers already promote elements animating `transform` or `opacity`, so on the common path it does nothing, and every promoted layer costs GPU memory. Put it on the element that animates, never on `*` or large containers.

It earns its place on an expensive paint, like a large blurred or filtered element. Promote it and keep the layer small, since a small layer is cheaper to composite than a full-screen one.

## Should you avoid JS animation?

No. Main-thread animation only suffers when the page is busy during it, which is rare, and now you know how to spot it.

JS animation gives things CSS can't, such as real springs, layout animations, exit animations for unmounted components, and momentum gestures. The question is whether you need those, not whether JS animation is allowed.

The working split is CSS for simple motion and anything that plays while the page is busy, and JS for complex, interruptible, gesture-driven motion.

## Workflow

### Phase 1, find what animates

List every animation in scope with its driver and properties.

| Element | Driver | Properties | Plays during |
|---|---|---|---|
| Tab indicator | JS layout animation | layout | route change |
| Drawer | CSS transition | `transform` | user drag |
| Card hover | CSS transition | `all` | hover |

Expand `transition: all` and library shorthands into what they actually animate.

### Phase 2, diagnose

Work down this list. It is ordered by how often each one is the cause.

1. **Which properties animate?** Anything other than `transform` and `opacity` is the first suspect. Layout properties come first, then `box-shadow` and `border-radius`, which don't look like layout and are easy to miss.
2. **Does the jank coincide with the page being busy?** Navigation, fetching, hydration, a long task. Move the animation to CSS or WAAPI.
3. **Is React re-rendering per frame?** State updates in rAF, pointer, or scroll handlers.
4. **Does it get worse as content grows?** An inherited CSS variable, or too many nodes animating at once.
5. **Is a CSS variable animated at all?** Directly, or through a library's shorthand props.
6. **Any animated `blur()` above 20px?**
7. **Still shifting or stuttering?** Now add `will-change: transform` to the animating element.

Confirm with a recording, not by feel. Use the DevTools Performance panel for dropped frames and long tasks, and the Animations panel to slow motion down. Profile on a real mid-range phone over remote debugging. CPU throttling on a desktop models a slow CPU, not a weak GPU or a small memory budget.

### Phase 3, report

For each finding, use the block in the perf mode of [`../SKILL.md`](../SKILL.md). Order findings by cost, layout before paint and busy main thread before idle. Then stop and apply fixes when asked.
