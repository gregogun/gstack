# Surfaces

Adapted from Jakub Krehel's `better-ui` surfaces recipes and the hover and overlay rules of `better-interface`.

Concentric radius, optical alignment, shadow rings, image outlines, hover on touch and scroll containment. Fixes use plain CSS and the project's own tokens.

## Concentric border radius

```
outerRadius = innerRadius + padding + borderWidth
```

An inner element with the same radius as its padded parent leaves a fat wedge at each corner. Flag a nested rounded pair whose radii do not follow the formula.

```css
/* Good: concentric radii */
.card {
  border-radius: 20px; /* 12 + 8 */
  padding: 8px;
}
.card-inner {
  border-radius: 12px;
}

/* Bad: same radius on both */
.card {
  border-radius: 12px;
  padding: 8px;
}
.card-inner {
  border-radius: 12px;
}
```

When padding is larger than the outer radius, the formula stops mattering and the inner radius can stay. Project radius tokens win. Pick the nearest token that satisfies the formula.

## Optical alignment

### Buttons with text and an icon

Start the icon side at `2px` less padding than the text side, then judge by eye.

```css
/* Good: less padding on the trailing icon side */
.button-with-icon {
  padding-inline-start: 16px;
  padding-inline-end: 14px;
}

/* Bad: equal padding pushes the icon visually outward */
.button-with-icon {
  padding-inline: 16px;
}
```

### Play button triangles

A triangle's geometric centre sits left of its visual centre, so shift it toward its point.

```css
.play-button svg {
  transform: translateX(2px); /* physical on purpose, playback icons never mirror */
}
```

### Asymmetric icons

Stars, arrows and carets carry uneven visual weight. Fix the `viewBox` or path in the SVG, so the component needs no extra offset. Where the asset cannot change, nudge its wrapper by `1px`.

## Shadow rings

A ring built from `box-shadow` replaces a solid border. It blends with the surface behind it and animates cheaply.

### Light mode

Three layers. The first acts as a 1px ring, the second adds lift and the third ambient depth.

```css
:root {
  --shadow-border:
    0px 0px 0px 1px oklch(0 0 0 / 0.06),
    0px 1px 2px -1px oklch(0 0 0 / 0.06),
    0px 2px 4px 0px oklch(0 0 0 / 0.04);
  --shadow-border-hover:
    0px 0px 0px 1px oklch(0 0 0 / 0.08),
    0px 1px 2px -1px oklch(0 0 0 / 0.08),
    0px 2px 4px 0px oklch(0 0 0 / 0.06);
}
```

### Dark mode

Depth shadows vanish on dark backgrounds, so dark mode keeps one white ring. Redefine the tokens under the project's dark selector.

```css
--shadow-border: 0 0 0 1px oklch(1 0 0 / 0.08);
--shadow-border-hover: 0 0 0 1px oklch(1 0 0 / 0.13);
```

### Usage

```css
.card {
  border: 1px solid transparent; /* forced-colors mode drops box-shadow and paints this border */
  box-shadow: var(--shadow-border);
  transition-property: box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

.card:hover {
  box-shadow: var(--shadow-border-hover);
}
```

The transparent border keeps the box the same size as the border it replaces. A shadow ring with no transparent border vanishes in forced-colors mode, so flag it.

## Image outlines

A thin outline separates an image from a background of similar tone.

```css
:root {
  --image-outline: oklch(0 0 0 / 0.1);
}
/* Redefine under the project's dark selector */
--image-outline: oklch(1 0 0 / 0.1);

.content-image {
  outline: 1px solid var(--image-outline);
  outline-offset: -1px;
}
```

Use pure black or white at low alpha. Never a palette grey or a near-black such as `#111827`, which tints the image edge. Use `outline` rather than `border` because it never changes the image's size. At `outline-offset: -1px` it sits just inside the edge and follows the corner radius.

## Hover effects only on hover-capable pointers

Put hover-only styling behind `@media (hover: hover)`. On touch, `:hover` latches after a tap and reads as a stuck selected state. Where a control draws its own pressed state, set `-webkit-tap-highlight-color: transparent` so the default grey flash does not double it.

```css
@media (hover: hover) {
  .row:hover {
    background-color: var(--surface-hover);
  }
}
```

A hover reveal of an action must have a non-hover path as well. See [accessibility](accessibility.md).

## Contain scroll inside overlays

Give scrollable dialogs, drawers, menus and side panels `overscroll-behavior: contain`, so scrolling past their end never scrolls the page behind.

## Severity

A hover state stuck on touch is `HIGH`, because it breaks an interaction. Wrong radii, a missing image outline, a ring with no transparent border and optical misalignment are `LOW` unless the project's tokens or design rules make them systemic. Then rank by reach.

## Verification

Without a browser, read the radius, padding and shadow values from the code and apply the formula. With one, emulate a touch pointer and tap each hover target, check forced-colors mode for rings, and scroll to the end of each overlay. Report every check you could not run as `Not verified`.

## Before you finish

| You notice | Correct it |
| --- | --- |
| Nested rounded boxes with the same radius | Outer radius = inner radius + padding + border |
| Equal padding on a button with an icon | Take `2px` off the icon side |
| A play triangle centred geometrically | `translateX(2px)` toward its point |
| A `box-shadow` ring with no transparent border | Add `border: 1px solid transparent` |
| A light-mode shadow stack reused in dark mode | One `oklch(1 0 0 / 0.08)` ring |
| An image outline in a palette grey | `oklch(0 0 0 / 0.1)` or `oklch(1 0 0 / 0.1)` |
| A border on an image that shifts its size | `outline` with `outline-offset: -1px` |
| `:hover` rules outside `@media (hover: hover)` | Wrap them in the query |
| A scrollable overlay without `overscroll-behavior` | `overscroll-behavior: contain` |
