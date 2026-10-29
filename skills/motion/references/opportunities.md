# Opportunities

Places that don't animate but should. `find` sweeps this list, then runs every candidate through the gate in [`../SKILL.md`](../SKILL.md).

**Feedback gaps**
- A pressable element with no `:active` state takes `transform: scale(0.97)` with `transition: transform 160ms var(--ease-out)`, kept within 0.95 to 0.98.
- A destructive action confirmed with a plain click, where a hold-to-confirm fill would prevent slips, takes a `clip-path: inset(0 100% 0 0)` overlay at 2s `linear` on press and 200ms `--ease-out` on release.

**Teleporting state**
- Content that swaps, appears, or vanishes instantly (conditional renders, route content, expanding sections) takes an entrance from `scale(0.95)` to `scale(0.97)` plus `opacity: 0` with `--ease-out`, never `scale(0)`. Use `@starting-style` for entry without JS.
- An accordion or collapse that snaps open takes a height plus opacity transition.
- List items added or removed with no bridge, in a list that isn't high-frequency, take enter and exit transitions. Use CSS transitions, not keyframes, so rapid triggers retarget.

**Missing spatial story**
- A panel, popover, or menu that appears with no connection to its trigger scales in with `transform-origin` at the trigger. Modals are exempt and stay centered.
- A dismissable surface (toast, sheet) that exits a different way than it entered takes a symmetric path, using `translateY(100%)` percentages rather than pixel offsets.

**Group entrances**
- A grid or list on a page users see occasionally that pops in all at once takes a 30-80ms stagger. It never blocks interaction.

**Gesture seams**
- A draggable or swipeable element that snaps with no physics takes a spring `{duration: 0.5, bounce: 0.2}` with bounce kept within 0.1-0.3, velocity-based dismissal at `Math.abs(distance) / elapsedMs > 0.11`, and rubber-banding at boundaries instead of hard stops.

**The delight budget**
- A rare, high-emotion moment rendered flat (first run, empty state, success, celebration). These are the only places bounce, a generous stagger, or a longer beat belong.

Sweeps: conditional renders with no transition (`{isOpen &&`, `display: none` toggles), click handlers on elements with no `:active` or transition styles, `details` and accordion markup, drag handlers, `.map(` renders of entering lists, and empty-state and success components.

Report at most a handful, each grounded in a seam you observed, never a wishlist.
