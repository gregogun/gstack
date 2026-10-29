# Motion

Whether an element moves, then how. Frequency, purpose, easing, duration, springs, origin, interruptibility, compositor cost and cohesion. Reduced-motion rules belong to [accessibility](accessibility.md), and hover gating to [surfaces](surfaces.md). Fixes use plain CSS or WAAPI and the project's own tokens.

## Frequency

How often the user sees the motion decides whether it exists.

| Frequency | Decision |
|---|---|
| 100+ times a day (keyboard shortcuts, command palette toggle, core navigation) | No animation. Ever. |
| Tens of times a day (hover effects, list navigation, frequent toggles) | Remove, or reduce to near-imperceptible |
| Occasional (modals, drawers, toasts, settings) | Standard animation |
| Rare or first-time (onboarding, empty states, success, celebration) | The delight budget lives here |

A keyboard-initiated action is a disqualifier, not a judgment call. Raycast has no open or close animation, and that is correct for something opened hundreds of times a day.

Flag animation on keyboard-initiated actions, command palettes with open or close transitions, and decorative motion on list items or hover states hit constantly. The fix is usually to delete the animation.

## Purpose

Every animation names its purpose in one of these words, or it is a finding.

1. **Feedback.** The interface heard the user (press scale, hold-to-confirm fill).
2. **Spatial consistency.** Where something came from or went (a toast enters and exits the same edge, a panel grows from its trigger).
3. **State indication.** A state change made legible (a morphing button, an expanding accordion).
4. **Preventing a jarring change.** A bridge for content that would otherwise teleport, appear, or vanish.
5. **Explanation.** Motion that shows how a feature works. Marketing and onboarding only.
6. **Delight.** Only at the rare or first-time tier.

Data the user is reading or acting on (charts, tables, numbers) does not move for style. A decorative mouse-tracking effect fits a marketing page, not a graph in a banking app.

## Values

These are the default spec. Project motion tokens and documented motion decisions override them. Copy them exactly, and never approximate one from memory.

Easing curves, added as tokens that extend the project's naming:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* strong ease-out for UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* strong ease-in-out for on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* iOS-like drawer curve, from Ionic */
```

For a curve not listed, take one from [easing.dev](https://easing.dev/) or [easings.co](https://easings.co/) rather than hand-rolling it.

| Element | Duration |
|---|---|
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-500ms |
| Marketing, explanatory | Can be longer |

Small UI stays under 300ms. A 180ms dropdown feels faster than a 400ms one, and `ease-out` at 200ms feels faster than `ease-in` at 200ms.

| Situation | Ship | Never |
|---|---|---|
| Entering or exiting | `--ease-out` | `ease-in` on any UI element. Built-in `ease-out` on a deliberate animation. |
| Moving or morphing on screen | `--ease-in-out` | |
| Drawer or sheet | `--ease-drawer` | |
| Hover or color change | `ease` | |
| Constant motion (marquee, progress) | `linear` | `linear` on a UI entrance |
| Entrance from small | `scale(0.9)` to `scale(0.97)` plus `opacity: 0` | `scale(0)` |
| Popover, dropdown, menu, tooltip | `transform-origin` at the trigger | `transform-origin: center`. Modals are exempt and stay centered. |
| Press feedback | `:active { transform: scale(0.97) }` with `transition: transform 160ms var(--ease-out)`, kept within 0.95-0.98 | A pressable element with no press state |
| Rapidly triggered or reversible (toasts, toggles, expand and collapse) | CSS transitions, which retarget from the current value | `@keyframes`, which restart from zero |
| Gesture-driven motion | Spring `{duration: 0.5, bounce: 0.2}`, bounce kept within 0.1-0.3, and bounce 0 when no momentum preceded it | A fixed-duration tween, a CSS transition, or keyframes |
| Group entrance | 30-80ms stagger per item, never blocking input | Everything entering at once |
| Crossfade that shows two overlapping states | `filter: blur(2px)` during the transition | |
| Animated blur | Under 20px | |
| Properties | `transform` and `opacity`. `clip-path` too. `height` only for accordions. | `transition: all`. Animated `width`, `height`, `margin`, `padding`, `top`, or `left`. |
| A child's transform during a drag or animation | `transform` set on the element itself | An animated CSS variable on a parent |
| Moving an element by its own size | `translate()` percentages, as in `translateY(100%)` | Hardcoded pixel offsets |
| Hover motion | Inside `@media (hover: hover) and (pointer: fine)` | Ungated `:hover` motion, since touch fires hover on tap |
| Reduced motion | Gentler, not zero. Keep opacity and color, drop movement. | No handling. Removing all feedback. |
| Deliberate phase and system response | Slow where the user decides (hold-to-confirm 2s `linear`), fast where the system responds (release 200ms `--ease-out`) | Symmetric timing on a press-and-release or hold |
| Tooltip after the first in a group | Instant, with no delay and no animation | The delay and animation on every tooltip in a toolbar |

Every cell in the Never column is a finding.

## Easing and duration

Easing decision order:

- Entering or exiting takes `ease-out`, which starts fast and feels responsive.
- Moving or morphing on screen takes `ease-in-out`.
- Hover or color change takes `ease`.
- Constant motion (marquee, progress) takes `linear`.
- Anything else defaults to `ease-out`.

`ease-in` on UI is always a finding. It starts slow and delays the exact moment the user is watching. Built-in CSS easings are too weak for deliberate motion, so a fix introduces the custom curves above as tokens in the project's naming.

Flag `ease-in` anywhere, bare `ease` or `linear` on entrances, durations over 300ms on UI elements with no stated reason, and a tooltip delay plus animation on every tooltip in a toolbar.

## Physicality and origin

- Never `scale(0)`. Nothing in the real world appears from nothing.
- Popovers, dropdowns, and tooltips scale from their trigger. Use the origin variable the project's popover primitive supplies, or set one from the trigger's position. `transform-origin: center` on a modal is correct. Do not report it.

Flag `scale(0)`, pure-fade entrances with no initial transform, `transform-origin: center` or no origin on trigger-anchored elements, and pressable elements with no press feedback.

## Interruptibility

CSS transitions retarget from the current value mid-animation. Keyframes restart from zero. Anything triggered rapidly or reversed mid-motion (stacking toasts, toggles, drags, expand and collapse) uses transitions or springs.

- Entry without JS uses `@starting-style`. The legacy fallback is a mounted attribute set after first render.
- Gesture-driven motion uses springs, which carry velocity when interrupted.
- Timing is asymmetric. Deliberate phases (press, hold, destructive confirm) animate slower, and the system's response snaps.

Flag `@keyframes` on toasts, toggles, or other rapidly triggered UI, gesture handlers that tween with fixed-duration keyframes, drags that dismiss on distance alone instead of also on velocity (`Math.abs(distance) / elapsedMs > 0.11`), and hard stops at drag boundaries where friction should rise.

## Compositor cost

- Animate `transform` and `opacity`. `width`, `height`, `margin`, `padding`, `top`, and `left` trigger layout, paint, and composite.
- `transition: all` animates unintended properties off the compositor. It is always a finding.
- A library's per-axis shorthand props (separate x, y, and scale values) are often built on CSS variables and run on the main thread, dropping frames under load. The fix is the full `transform` string.
- Never drive a child's transform through a CSS variable on the parent. Changing the variable recalculates styles for every child.
- CSS and WAAPI run off the main thread and beat `requestAnimationFrame` code under load. Use CSS for predetermined motion, and JS or springs for dynamic and gesture-driven motion.
- Keep a transitioned `filter: blur()` under 20px. Heavy blur is expensive, worst in Safari.

Flag `transition: all`, animated layout properties, per-axis shorthand props on busy pages, `style.setProperty('--x', ...)` driving child transforms, and `requestAnimationFrame` loops doing what CSS could.

## Cohesion

- Motion matches the rest of the project. One springy, bouncing component among crisp ones is a finding, phrased as a deviation from the project's own motion, not a taste.
- Curves and durations live as shared tokens. Five hand-typed cubic-beziers that almost match is a consolidation finding.
- A group that enters all at once where a 30-80ms stagger belongs. Stagger is decoration and never blocks interaction.
- A crossfade that visibly shows two overlapping states can be masked with `filter: blur(2px)` during the transition.

Before judging cohesion, note how the existing motion behaves (crisp and short, or springy) and where it lives: token files (`--ease-*`, `--duration-*`), keyframe definitions, inline transition props and gesture handlers. Sweeps that find most of it: grep for `transition`, `animation`, `@keyframes`, `ease-in`, `scale(0)`, `prefers-reduced-motion`, `transform-origin`, `.animate(`, `requestAnimationFrame`, and the component names of any motion library the project uses.

## Severity

Animation on a keyboard or 100+ a day action, `ease-in` or `scale(0)` on UI, and a layout-property animation with an easy compositor fix are `HIGH`. So are dropped frames on a primary interaction. A wrong origin, non-interruptible rapid UI, and a duration out of its row are `MEDIUM`. Stagger, blur-masked crossfades, and token consolidation are `LOW`. A long duration on a marketing page can be fine.

## Verification

Motion can be correct in code and still feel wrong. When feel can't be judged from code (a crossfade, a spring's bounce, opacity against height in an entering list), mark the finding `Not verified` and name a feel check.

- Run the UI, trigger the interaction, and name what to confirm, such as "the dropdown scales from its trigger, not from center" or "spamming the toggle never restarts the animation from zero".
- Set playback to 10% in the DevTools Animations panel, or step it frame by frame, and confirm the detail you named.
- Record a Performance trace through **control-ui** ([`../../control-ui/SKILL.md`](../../control-ui/SKILL.md)) before you call motion smooth. A fast laptop hides almost every dropped frame.
- Test gestures on a real device.

## Before you finish

| You notice | Correct it |
| --- | --- |
| A finding with no Values row or rule behind it | Drop it or cite the rule |
| A modal's `transform-origin: center` reported | Drop it. Modals are exempt. |
| A cohesion finding phrased as preference | Rephrase it as a deviation from the project's own motion, or drop it |
| A fix that tunes an animation on a high-frequency action | Delete the animation instead |
| A fix that invents a parallel set of curves | Extend the project's tokens |
| Smoothness claimed from watching it | Record a trace, or mark it `Not verified` |
