# Colors

How color systems are built and checked. This covers ramps, role mapping, token names, notation and measured contrast pairs. Never report a contrast value you did not measure, and never estimate a color you could compute. Notation, a tinted neutral and a gradient's interpolation space are project choices, not findings. A broken role mapping, a failing pair and an out-of-gamut step are findings. Perceived lightness throughout means OKLCH `L`, from `0` to `1`.

Whether a pair is required to pass belongs to [accessibility](accessibility.md). Surfaces, shadows and icon color belong to [surfaces](surfaces.md).

## Match the project's color system

Reuse the project's tokens and notation. A consistent hex system beats hex with `oklch()` scattered through it.

For a new system, `oklch()` is the best default, because its numbers behave the way the ramp rules below describe. Everywhere else, a color library produces the same ramp in the project's own notation.

## A system is ramps, not colors

One neutral ramp, one accent ramp and only the status ramps the product actually renders.

| Ramp | How many | Notes |
| --- | --- | --- |
| Neutral | 1 | Carries 80 to 90% of the interface, meaning backgrounds, borders and body text |
| Accent | 1 | The brand hue. Interactive and selected states |
| Status | 0 to 4 | `danger`, `warning`, `success`, `info`. Add one only when the product shows that state |

A `warning` ramp nothing imports is maintenance for zero pixels. A second accent hue earns its place only when two things must be distinguishable at a glance. Otherwise use more steps of the one accent ramp.

## Every step has a job

A ramp is not a gradient to pick from by eye. Each step exists because a role needs it. Do not generate a step no role consumes.

| Role | Lightness-numbered (`50` to `950`) | Role-numbered (`1` to `12`) |
| --- | --- | --- |
| Page background | `50` | `1` |
| Subtle background | `50` | `2` |
| Component background | `100` | `3` |
| Component hover | `200` | `4` |
| Component active or selected | `200` | `5` |
| Subtle border, separator | `200` | `6` |
| Border, focus ring | `300` | `7` |
| Hovered border | `400` | `8` |
| Solid fill | `600` | `9` |
| Solid fill hover | `700` | `10` |
| Low-contrast text | `700` | `11` |
| High-contrast text | `900` | `12` |

The two conventions differ in kind.

- **Role-numbered steps are defined by role.** Step 9 is the solid fill in every ramp and appearance. The dark scale is a separate ramp reusing the same numbers, so component CSS never changes.
- **Lightness-numbered steps are defined by lightness.** `50` is light and `950` is dark. The mapping holds in light mode and inverts in dark, with the page background at `950` and high-contrast text at `50`. Components either swap step numbers per appearance or read a semantic token that swaps once.

Match whichever the project uses. For a new system prefer role-numbered steps, because a role-defined step survives a theme change that a lightness-defined step does not. Solid fill sits on `600` because white text on most `500` hues fails 4.5:1. Where the table repeats a step, those roles render identically. A design that needs component hover and subtle border to differ needs a 12-step ramp.

## Neutrals

A pure gray ramp is a perfectly good default. It sits under any accent hue without competing and never needs revisiting when the brand color changes.

Tinting the neutral toward the accent hue is a stylistic option, not a correction. OKLCH chroma `0.005` to `0.02` at the accent's hue puts the grays in the accent's family. Warm neutrals read approachable and editorial. Cool ones read technical and precise. Whichever you pick, including none, hold it across the whole ramp. A warm gray border on a cool gray background is visible even when neither color is nameable alone.

Neutrals carry the most roles, so they need the most steps. Never generate fewer neutral steps than accent steps.

## Status colors

Convention constrains status hues before taste does. Red reads as danger, amber as warning, green as success.

- **Keep every status hue at least `15°` of OKLCH hue from the accent.** If the brand is red, danger cannot also be red. Where convention leaves nowhere to move, give the destructive action a distinct treatment, such as an outlined button with an icon, or it reads as the primary action.
- **Status ramps need fewer steps than the accent.** Most render four roles, which are a background, a border, a solid fill and text.

Where a color carries meaning in finance, status or alerts, verify the meaning holds in every locale shipped. Chinese financial UIs show gains in red and losses in green. Where the product ships to such markets, make gain and loss per-locale tokens.

## Name primitives by hue, semantics by role

Primitives name a value, such as `--blue-600`, and are never applied in a component. Semantic tokens name a job, such as `--color-text-secondary`, point at a primitive and are the only tier components reference. That seam is what lets dark mode, a white-label theme and an increased-contrast variant repoint colors without touching components. A codebase applying `--blue-600` directly in components has no theming seam.

```css
:root {
  /* Tier 1, primitives named by hue and step. Never used directly. */
  --blue-600: #2563eb;
  --neutral-200: #e5e7eb;
  --neutral-700: #374151;

  /* Tier 2, semantics named by role. This is what components use. */
  --color-accent-solid: var(--blue-600);
  --color-border: var(--neutral-200);
  --color-text-secondary: var(--neutral-700);
}
```

Add a component tier, such as `--color-button-danger-bg`, only where a component intentionally diverges from the system. One is a documented exception. Twenty mean the semantic tier is missing roles.

### Role inventory

A system is complete when every role has a token.

| Group | Roles |
| --- | --- |
| Surfaces | page background, surface, raised (menus, popovers), sunken (inputs, wells), overlay scrim |
| Text | primary, secondary, disabled, inverse, on-accent |
| Borders | subtle, default, strong, focus ring, separator |
| Accent | subtle background, border, solid, solid hover, text |
| Status | per status shipped, subtle background, border, solid, text |

Separator and border are separate roles even when they share a value today. A separator divides content. A border encloses a control. They diverge the first time someone restyles inputs.

### Naming grammar

Use one shape. Neutral roles lead with the property, as `--color-{bg|text|border}-{variant}-{state}`. Accent and status roles lead with the role, as `--color-{accent|danger}-{subtle|border|solid|text}-{state}`. Examples are `--color-bg-surface`, `--color-text-secondary`, `--color-border-strong`, `--color-accent-solid-hover`, `--color-danger-subtle` and `--color-accent-text`.

Pick one word per concept and use only that word.

| Concept | Pick one | Never mix in |
| --- | --- | --- |
| Foreground | `text` | `fg`, `foreground`, `content`, `ink` |
| Background | `bg` | `background`, `surface` as a synonym, `fill` |
| Edge | `border` | `stroke`, `outline`, `line` |
| Brand color | `accent` | `primary`, `brand`, `theme` used interchangeably |

Reserve `primary` for one meaning. `--color-text-primary` beside `--color-primary` for the brand is the most common naming collision. Use `accent` for the brand and let `primary` mean the most prominent of its group.

| Name | Problem | Instead |
| --- | --- | --- |
| `--color-blue-button` | Appearance at the semantic tier, which lies once the brand changes | `--color-accent-solid` |
| `--color-sidebar-gray` | Named for where it was first used | `--color-bg-surface` |
| `--color-light-gray` | Lies in dark mode, where it is the dark one | `--neutral-200` as a primitive |
| `--color-text-2` | Numbered semantics carry no meaning | `--color-text-secondary` |
| `--color-gray-hover` | Mixes a hue with a state and belongs to no tier | `--color-bg-surface-hover` |
| `--blue-600` used in a component | Skips the semantic tier | Point a semantic token at it |

A color carrying alpha cannot be contrast-checked against a static background. Use solid tokens for anything with text on it.

## Use a token only in its role

Never borrow a token because its value is right today. A value that works in two roles stops working in both at the next theme change.

```css
/* Bad, separator token repurposed as a text color */
.caption { color: var(--color-border); }

/* Bad, text token repurposed as a background */
.tag { background: var(--color-text-secondary); }
```

If a role has no token, add the token.

## Generate a ramp

### Start from the brand color

A brand color arrives as one value. Two decisions come first.

**Which step does it occupy?** A brand color meant for buttons and links belongs on the solid-fill step, `600` or `9`. Then the primary button renders the actual brand color.

**Is it pinned or snapped?** Pin a contractually fixed brand color. It stays exact, the ramp builds outward from it and that one step spaces slightly unevenly. Otherwise snap it onto the ramp so the spacing stays regular.

A brand color that fails contrast behind white text is still the brand color, just not the solid-fill step. Put it where it lands and use a darker step for interactive fills. Never quietly darken the brand. For example `#3b82f6` lands on `500` and fills use `600`, because white on `#3b82f6` measures 3.68:1.

### What a correct ramp looks like

- **Lightness changes steadily, measured in OKLCH `L`.** HSL lightness is not perceptual, and evenly spaced HSL values bunch at one end.
- **Hue is constant end to end.** A wandering hue reads as two colors blended.
- **Vividness peaks in the middle and falls off at both ends.** The lightest and darkest steps are nearly neutral. Full vividness at the extremes gives a `50` that glows and a `950` like ink spilled on the brand.
- **Steps are finer at the light end.** Keep `50` to `200` about `0.04` to `0.05` apart in OKLCH `L` and mid-ramp steps about `0.07` to `0.10`.
- **No two adjacent steps are indistinguishable.** Steps less than `0.03` apart in OKLCH `L` mean the ramp has more steps than decisions. Drop one.
- **Both ends stop short of pure black and white.**

Never compute these by hand or by eye. A color library such as `culori`, `colorjs.io` or `chroma.js` converts between notations, measures perceived lightness and interpolates perceptually. Do the math in a perceptual space and emit the project's notation.

```js
import { formatHex, interpolate, samples } from 'culori'

const ramp = interpolate(['#eff6ff', '#3b82f6', '#172554'], 'oklab')
const steps = samples(11).map((t) => formatHex(ramp(t)))
```

That is a starting point. Linear sampling spaces lightness evenly within each segment, so check the output against the properties above and tighten `50` to `200` by hand. The output format is the project's choice. A ramp's interpolation space is not, because sRGB interpolation produces muddy mid-steps.

For comparison, a ramp with the finer light end.

```css
:root {
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-200: #bfdbfe;
  --blue-300: #93c5fd;
  --blue-400: #60a5fa;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;
  --blue-800: #1e40af;
  --blue-900: #1e3a8a;
  --blue-950: #172554;
}
```

### Several hues at once

With an accent plus status ramps, the ramps must agree step for step.

- **Match perceived lightness exactly.** Same step, same brightness, across every hue.
- **Match vividness relatively.** Hues do not share a maximum vividness. Set each ramp to the same proportion of what its own hue reaches. Yellows and cyans peak much lower than reds and blues, so copying one chroma number makes the warning color look weak beside the danger one.

### Dark mode

A dark palette is not the light one reversed. Swap the semantic roles first, then tune.

```css
:root {
  --color-bg-page: var(--neutral-50);
  --color-text-primary: var(--neutral-950);
}
.dark {
  --color-bg-page: var(--neutral-950);
  --color-text-primary: var(--neutral-50);
}
```

Three things need hand-tuning after the swap.

- **Vividness comes down.** A color that reads as confident on white reads as neon on near-black. Take the accent a step or two less vivid.
- **The dark end needs more separation.** Steps distinguishable as pale backgrounds collapse into each other as dark surfaces.
- **Contrast does not survive the mirror.** Recheck every pair in both appearances.

Use one switching mechanism throughout.

- `prefers-color-scheme` alone is correct with no theme toggle.
- A `.dark` class is required as soon as users can override the system setting. The media query then sets only the initial value.
- `light-dark()` collapses both values into one declaration. It needs `color-scheme: light dark` and reads that property rather than a class, so a class-based toggle must set `color-scheme` too.

```css
:root {
  color-scheme: light dark;
  --color-bg: light-dark(#ffffff, #172554);
}
```

A media query setting some tokens and a class setting others gives a half-themed interface the moment a user overrides their system preference.

## One color, one meaning

Use a color for one purpose across the whole interface, treating anything within `15°` of OKLCH hue as the same color. Users read a near-miss in hue as a slightly different shade, not as a different color.

```css
/* Bad, the accent means both link and decorative heading */
a { color: #3b82f6; }
.section-title { color: #4f8ef7; }

/* Good, interactive elements own the accent and headings stay neutral */
a { color: var(--color-accent-text); }
.section-title { color: var(--color-text-primary); }
```

The rule runs both ways. A color must not be absent where its meaning occurs. If the accent means interactive, an interactive element rendered neutral is just as misleading. Never let color be the only carrier of meaning. Pair it with an icon or a label, a requirement [accessibility](accessibility.md) owns.

## Fill exactly one action per view

When filled color encodes primary emphasis, one primary action gets it and peers stay neutral. Put the color on the background, not the label. A filled button reads as primary across the room. Accent-colored text on a neutral button reads as a link.

```html
<!-- Good, one filled primary action and neutral secondaries -->
<button class="primary">Save</button>
<button class="quiet">Cancel</button>

<!-- Bad, every action filled, so nothing is primary -->
<button class="primary">Save</button>
<button class="primary">Duplicate</button>
<button class="primary">Export</button>
```

Selected states may use the accent on the glyph and label. An active tab or a checked segment is state, not emphasis. Keep an established hierarchy that already signals emphasis another way. Several colored backgrounds are fine when they encode distinct states or categories rather than competing as peers.

## Notation

| Notation | Good for | Weakness |
| --- | --- | --- |
| Hex | Universal support, compact, what design tools hand you | Opaque, no channel is readable by hand |
| `rgb()` | Same reach as hex, readable alpha | Channels do not match what a designer thinks about |
| `hsl()` | Channels look like design controls | Its lightness is not perceptual and its hue drifts |
| `oklch()` | Perceptually uniform lightness, stable hue, predictable ramps | Baseline 2023, so very old browser matrices need a fallback |

Notation is not a defect. A project on hex is not doing it wrong.

```css
oklch(L C H)          /* lightness 0–1, chroma 0–~0.4, hue 0–360 */
oklch(L C H / alpha)  /* alpha uses a slash, never a comma */
```

Convert only when asked, when an agreed migration is in scope, or when the project is standardizing and this value is the straggler. Bulk conversion is a migration, not cleanup. When conversion is in scope, change the values and nothing else. Leave CSS keywords (`currentColor`, `inherit`, `transparent`), gradient interpolation methods, colors in third-party configs and comments alone.

### Gamut

Every sRGB color exists in Display P3, but not the reverse. The extra room is only at high chroma and varies by hue. At OKLCH `L` `0.65`, green gains about `0.07` of chroma while blue gains about `0.015`.

A color more vivid than its display can render gets gamut-mapped, which mostly means clipped. It flattens neighbouring steps into one rendered color. The fix is to reduce vividness while holding hue and lightness. Generate ramps against sRGB unless the product is display-restricted, and add P3 as an enhancement. The sRGB value comes first, so an sRGB screen shows a color you chose rather than one the browser clipped.

```css
.success {
  background: #11ad32; /* oklch(0.65 0.2 145), inside sRGB */
}
@media (color-gamut: p3) {
  .success { background: oklch(0.65 0.27 145); }
}
```

For browser matrices predating `oklch()` support, layer with `@supports (color: oklch(0 0 0))`. Check the project's actual browser matrix first. On a modern baseline it is dead weight.

`color-mix()` derives one color from another, and relative color syntax adjusts one channel. Both are fine for states, but keep generated values out of the token layer, since a mixed color cannot be inspected in a design tool. `light-dark()` puts both appearances in one declaration. All three resolve at render time, so compute the resolved value or measure the rendered result before reporting contrast.

## Gradients

The interpolation space is a look, not a correctness setting.

```css
/* sRGB, the default. Midpoint darkens and mutes. */
background: linear-gradient(#3b82f6, #ec4899);

/* oklab, even brightness across the transition. The best default. */
background: linear-gradient(in oklab, #3b82f6, #ec4899);

/* oklch, travels around the hue wheel and stays vivid. */
background: linear-gradient(in oklch, #3b82f6, #ec4899);
```

`oklab` and sRGB are rectangular, interpolating in a straight line. `oklch` is polar, interpolating the hue angle, so it arcs through every hue between the stops. That keeps it saturated and can produce hues nobody asked for.

The gray dead zone is a rectangular-space problem. Two hues on opposite sides of the wheel sit either side of the neutral axis, so the middle goes lifeless. Switch to a polar space, or add a third stop between the two. In a polar space, `in oklch shorter hue` takes the short way round and `in oklch longer hue` sweeps most of the spectrum.

A gradient spanning a hero with little contrast between its stops bands visibly on 8-bit displays. Widen the contrast, shrink the area or overlay a subtle noise texture.

Keep text off gradients where you can. Contrast varies continuously across one. Measure the worst region rather than the average, or put a scrim behind it.

## Contrast

Contrast is measured between a foreground color (text, an icon or a UI element) and the background it actually renders against, usually the nearest ancestor that paints one. Identify that background first. Measuring against the page background when the element sits on a card gives the wrong answer.

[Accessibility](accessibility.md) decides which requirement applies to a pair. The thresholds below are what a measured pair is reported against. Where neither that file nor the project names a standard, report the WCAG 2 result and add the APCA value.

### WCAG 2

| Content type | AA | AAA |
| --- | --- | --- |
| Text | 4.5:1 | 7:1 |
| Large text, at least `24px` or `18.67px` bold | 3:1 | 4.5:1 |
| UI components and graphical objects | 3:1 | n/a |

Disabled or inactive controls and logos are exempt.

### APCA

Lc is APCA's measure of perceived contrast. These levels simplify its full font-size and weight lookup table.

| Content type | Minimum |
| --- | --- |
| Body text, columns or blocks of text | Lc 75, preferred Lc 90 |
| Non-body text such as labels and headlines | Lc 60 |
| Large text, at least `36px` regular or `24px` bold | Lc 45 |
| Fine-detail or outline icons | Lc 45 |
| Solid icons and UI components | Lc 30 |
| Non-text that only has to be discernible, such as dividers | Lc 15 |

Disabled and placeholder text are not covered by a requirement. Aim for Lc 30 so they stay legible. Lc is signed. Positive means dark text on a light background and negative means light on dark. Compare the absolute value against the threshold.

### Fix a failing pair only on request

When a pair fails, report the pair, its measured value and the threshold it misses, then leave the colors alone. They are a design decision. Change them only when asked, and remeasure after.

Change lightness first. It is the channel contrast responds to. Move the foreground away from the background in perceived lightness, holding hue and saturation. Keeping hue fixed is what stops a contrast fix becoming a palette change.

```css
/* Failing, text too close to its background in lightness (Lc about 50) */
color: #7d93b0;
background: #eef2f7;

/* Fixed, darker text and the same hue (Lc about 88) */
color: #2b3a4f;
background: #eef2f7;
```

- **Mid-lightness backgrounds cap what is achievable.** On a background near OKLCH `L` `0.75`, even pure black text reaches only about Lc 60. Body text needs a background near one extreme, so the mid-range background is what has to change.
- **Pushing lightness can push the color out of gamut.** Reduce saturation as needed to keep it renderable.

### Pick text polarity from the background

Compare black and white using the project's required metric. APCA and WCAG 2 can favor different text colors on the same background. WCAG 2's neutral crossover is near 56% OKLCH lightness. At `oklch(65% 0 0)`, black measures about `6.49:1` and white `3.23:1`, so only black passes AA for normal text. For colored backgrounds, measure the actual pair.

### What to check

- **Every pair, in every appearance.** APCA scores mirrored pairs differently, so a pair passing in light can fail in dark.
- **Translucent surfaces.** A color on a `backdrop-filter` header or an overlay shifts with whatever scrolls behind it. Test against the lightest and darkest content it can sit over, or make the surface opaque enough.
- **Computed colors.** Measure the rendered result of `color-mix()`, relative color syntax and opacity, not the declaration.
- **Text over images.** There is no single background color. Measure the worst region, or guarantee one with a scrim.

### Light, dark and increased contrast

When the product ships a dark appearance, every custom color needs a dark variant. Users who enable increased contrast expect visibly stronger differentiation in each appearance.

```css
:root { --color-accent-solid: var(--blue-600); }

@media (prefers-contrast: more) {
  :root { --color-accent-solid: var(--blue-900); }
}
@media (prefers-color-scheme: dark) {
  :root { --color-accent-solid: var(--blue-400); }
}
@media (prefers-color-scheme: dark) and (prefers-contrast: more) {
  :root { --color-accent-solid: var(--blue-200); }
}
```

A single `prefers-contrast` block shared by both appearances darkens the color on a dark background too, lowering contrast there. The increased-contrast variant widens the gap to its background by at least `0.15` of OKLCH `L` over the default. Remeasure it, aiming for Lc 90 on body text.

## Auditing an existing palette

Most codebases hold several times more colors than the design has decisions.

1. **Collect every literal.** Search for hex, `rgb(`, `hsl(`, `oklch(` and the project's color helpers. Include SVG `fill` and `stroke`, chart configs and email templates.
2. **Sort by perceived lightness within each hue family.** Duplicates surface as near-identical neighbors.
3. **Collapse near-duplicates.** Two colors within `0.02` of each other in OKLab ΔE are one color that drifted. Keep the one used most. Never average them.
4. **Assign each survivor a role** from the role inventory. A color matching no role is a missing token or a mistake. Say which.
5. **Count what is left.** More ramps than a system needs means the palette outgrew its structure.

Report the inventory before changing anything. Consolidating a palette changes rendered output on screens nobody asked you to touch, so it stays a proposal until the user accepts it.

## Severity

`HIGH` makes content unreadable or assigns a misleading semantic color. `MEDIUM` is a noticeable theme, token or gamut failure. `LOW` is isolated polish.

Three symptoms are `HIGH` on sight whatever the surface, matching the escalation triggers in [severity](severity.md). They are body or control text whose rendered pair fails its required ratio, state or meaning carried by color alone, and a semantic color used against its meaning.

## Verification

Without a browser, check token values, the gamut of every declared color, both theme blocks present, and contrast computed from the declared token pair. With one, check the background actually rendered behind the text, including opacity and any image beneath it, measured in light and dark. Report every check you could not run as `Not verified`.

## Before you finish

| Pattern | Fix |
| --- | --- |
| A hex, `rgb(` or `oklch(` literal in a component file where a token exists | Reuse or add the role token, in the project's notation |
| One `oklch(` value in a codebase otherwise written in hex | Write it in the established notation unless a migration is in scope |
| A primitive such as `var(--blue-600)` in a component file | Point a semantic token at the primitive and use that |
| A semantic name containing a hue or a component | Rename it for its role, as in `--color-accent-solid` |
| `--color-primary` and `--color-text-primary` both defined | Rename the brand token `accent` |
| A `border` or `separator` token inside `color:`, or a `text` token inside `background:` | Add a token for the missing role |
| `hsl(` ramp values that differ only in lightness | Rebuild with a constant perceived hue |
| `50` to `200` stepping as far apart in OKLCH `L` as mid-ramp steps | Tighten the light end to about `0.04` to `0.05` |
| One chroma number copied across every hue's ramp | Use the same proportion of each hue's own maximum |
| A status hue within `15°` of the accent hue | Move it at least `15°` away, or give the destructive action a distinct treatment |
| Dark tokens equal to the light ramp in reverse order | Lower the accent's chroma, widen the dark end and remeasure every pair |
| Color tokens set under both `prefers-color-scheme` and a `.dark` class | Pick one switching mechanism |
| A contrast fix that changes hue and leaves lightness | Change lightness |
| `prefers-contrast: more` overriding a color for both appearances in one block | Give each appearance its own increased-contrast value |
| Text on a color with alpha, such as `rgba(` or `color-mix(` with `transparent` | Measure the rendered result, or use a solid token |
| White text on a `500` fill | Measure it. White on most `500` hues fails 4.5:1, so move the fill to `600` |
| `oklch()` chroma beyond sRGB with no sRGB value declared before it | Declare the sRGB value first, then the vivid one inside `@media (color-gamut: p3)` |
