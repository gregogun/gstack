# Typography

Adapted from Jakub Krehel's `better-typography`.

How text renders, from the type scale and spacing to font loading, wrapping, truncation and punctuation. Fixes go in the project's own styling system. The words belong to copy review, semantic heading structure to [accessibility](accessibility.md) and spatial RTL layout to [layout](layout.md). Measure contrast with [colors](colors.md). Whether it passes is accessibility's call.

## Measured, not preferred

Some values are exact. Unitless line-height, weight `400` or heavier below `18px`, a 60 to 75 character measure, `16px` inputs on iOS and `tabular-nums` on changing values are findings when missed.

Letter-spacing, pairing and scale ratios are heuristics. Report them only where they break the project's own scale. Never propose a new typeface unless the task asks for a type change.

## Fewer fonts, sizes and weights

Rarely use more than three fonts. Marketing pages can carry more than apps. Weight and size carry hierarchy, so each extra one dilutes it. Pair for contrast. A serif headline over a sans body reads as deliberate. Two near-identical sans-serifs read as a mistake.

Below `18px`, use weight `400` or heavier. Weights `100` to `300` belong at `28px` and up, checked against the background even there.

## Load the faces the design uses

Browsers synthesize a weight or style the family doesn't ship, which distorts the face. Load every face the design uses. Disable synthesis only after verifying the fallback stack, and only the unwanted mode.

`font-synthesis: none` disables weight, style, small-cap and position synthesis together. Scope it to an isolated treatment you have verified across the fallback stack.

```css
.brand-wordmark {
  font-synthesis: none;
}
```

To disable one mode, use its longhand. They are `font-synthesis-weight`, `font-synthesis-style`, `font-synthesis-small-caps` and `font-synthesis-position`.

## Properties over raw tags

When a CSS property exists, use it. Use `font-weight: 650`, not `font-variation-settings: "wght" 650`. Use `font-variant-numeric: tabular-nums`, not `font-feature-settings: "tnum" 1`. Properties keep working when a non-variable fallback renders. `font-variation-settings` silently does nothing there, while `font-weight` still picks the nearest face.

Leave `font-optical-sizing` at its default `auto`. Hard-code `"opsz"` only when the design deliberately decouples optical size from font size. Reserve raw tags for custom axes like `"GRAD" 80` and features with no property, like `"ss01" 1`.

```css
/* Good, common axes use the properties */
.heading { font-weight: 650; }

/* Good, custom axis with no property of its own */
.heading-grade { font-variation-settings: "GRAD" 80; }

/* Bad, weight via raw tag breaks on fallback fonts */
.heading { font-variation-settings: "wght" 650; }

/* Good, common features use the properties */
.price { font-variant-numeric: tabular-nums; }
.id { font-variant-numeric: slashed-zero; }

/* Good, niche feature with no property of its own */
.logo { font-feature-settings: "ss01" 1; }
```

### Static versus variable

A static font is one weight and one style per file. A variable font holds a whole range in one file, so any value in it works, such as `font-weight: 589`. A variable font is not automatically better. At one or two weights, static files can be smaller. At several weights, optical sizes or custom axes, a variable font usually wins.

### Axes

A font supports only the axes its designer included.

| Axis | Tag | Controls |
| --- | --- | --- |
| Weight | `wght` | Stroke thickness, like `font-weight` |
| Optical size | `opsz` | Details and spacing tuned for the display size |
| Width | `wdth` | Glyph width |
| Slant | `slnt` | Slant angle |
| Custom | e.g. `GRAD` | Whatever the designer built |

Many families still ship optical sizes as separate `Text` and `Display` files instead of an `opsz` axis.

### OpenType features

Features work the same on static and variable fonts. A font ships only the features its designer included.

| Tag | Feature |
| --- | --- |
| `tnum` | Tabular numbers, every digit the same width |
| `zero` | Slashed zero, `0` distinct from `O` |
| `liga` | Ligatures, joining pairs like "fi" into one shape |
| `ss01` to `ss20` | Stylistic sets, numbered slots |
| `cv01` to `cv99` | Character variants, numbered slots |

What each slot does differs font to font, so check the font's docs. Real small capitals come from `font-variant-caps`. Real superscripts and subscripts come from `font-variant-position`. Both need the glyphs in the font.

## Choosing a typeface

Only when a type change is asked for.

| Category | Traits | Use for |
| --- | --- | --- |
| Serif | Small strokes at letter ends guide the eye along a line | Long passages, editorial reading |
| Sans-serif | Clean, even shapes that stay crisp at small sizes | Default for most interfaces |
| Monospace | Every glyph the same width | Code and fixed-width identifiers. Numeric columns use `tabular-nums` instead |
| Display | Drawn for large headlines | Marketing headlines, hero text |
| Script | Mimics handwriting | Rare, decorative moments |

"Display" in a font's name does not make it a display font. Some families ship a `Display` cut for large sizes and a `Text` cut for small ones. Use the cut that matches the size.

`system-ui, sans-serif` gives each operating system's own interface face. A commercial face is a brand decision and still needs a fallback stack, such as `"Helvetica Now", "Helvetica Neue", Arial, sans-serif`.

| Format | Notes |
| --- | --- |
| `.woff2` | Brotli compression, broadly supported. Use this on the web |
| `.woff` | Older compression. Fallback only for very old browsers |
| `.ttf` and `.otf` | No built-in compression, so larger files. Only when there is no other option |

Two fonts at the same `font-size` can look like different sizes, because x-height, cap height and ascender length differ. A large x-height looks bigger.

## Use a type scale with semantic names

Define a small set of sizes and deviate from it as little as possible. Pair each size with its line-height and weight, so a role is one decision instead of three. On a team, name sizes by use, such as `text-body-sm`, so the rules survive other people.

A starting point for a product interface.

```css
:root {
  --text-caption: 0.8125rem;
  --text-body: 1rem;
  --text-heading: 1.125rem;
  --text-title: 1.5rem;
  --text-display: 2.25rem;
}
```

| Role | Size | Line-height | Weight |
| --- | --- | --- | --- |
| Display | `2.25rem` (36px) | `1.1` | `600` |
| Title | `1.5rem` (24px) | `1.2` | `600` |
| Heading | `1.125rem` (18px) | `1.3` | `600` |
| Body | `1rem` (16px) | `1.5` | `400` |
| Caption | `0.8125rem` (13px) | `1.4` | `400` |

Emphasis within a role is one weight step up (`400` to `500`), not a size change.

| Unit | Behavior |
| --- | --- |
| `px` | Fixed |
| `em` | Scales with the current font size |
| `rem` | Scales with the root font size |
| `%` on `font-size` | Relative to the parent's font size, like `em` |

## Heading sizes descend with level

Map heading levels to descending steps of the scale, so a subordinate heading never overpowers its parent. Deep levels may share a size where the scale runs out of steps, as long as weight or letter-spacing keeps them distinct. A heading is never smaller than body text unless it is a deliberate overline.

```css
h1 { font-size: var(--text-display); }
h2 { font-size: var(--text-title); }
h3 { font-size: var(--text-heading); }
```

## Line-height by role

Display text `1.1`, headings `1.2` to `1.3`, body copy `1.5` to `1.6`. Use unitless values so line-height scales with the font size. A fixed `24px` does not.

Tight line-height is for short text. Anything that wraps to three or more lines needs at least `1.4`, even in a height-constrained row.

```css
/* Bad, card description at heading leading */
.card-description { line-height: 1.1; }

/* Good, it wraps to 3 lines, so it reads as body text */
.card-description { line-height: 1.4; }
```

## Letter-spacing by size

Headings at `24px` and up take `-0.01em` to `-0.02em`. Uppercase labels at `14px` or smaller take `0.05em`. Body copy stays at `0`. Use `em` so tracking scales with the size.

Kerning is built into the font and on by default. `font-kerning: none` is never a fix.

## Cap the measure

Cap long-form text at 60 to 75 characters per line. Any unit works, as long as a cap exists and the line length lands in range. `65ch` measures characters directly, one `ch` being the width of the `0` in the current font. At a `16px` body size the range lands roughly between `560px` and `680px`, depending on the font. Recheck the cap if the body font size changes.

## Wrap deliberately

- `text-wrap: balance` evens out headings and short descriptions. Never on paragraphs, and Chromium ignores it past six lines.
- `text-wrap: pretty` keeps a lone word off the last line. Safe on any paragraph, long-form included.
- `overflow-wrap: break-word` where a long word, link or ID could escape the container.
- `white-space: nowrap` on labels and badges where a line break looks broken.
- `hyphens: auto` hyphenates by the element's `lang`.

Keep interface text at `text-align: start`. `justify` belongs only in specific editorial layouts.

## Tabular numbers on changing values

Apply `font-variant-numeric: tabular-nums` to timers, counters, prices and numeric table columns, so every digit keeps one width and nothing shifts. Leave figures in prose proportional.

## Truncation

For one line, set `overflow: hidden`, `text-overflow: ellipsis` and `white-space: nowrap`. For several lines, set `display: -webkit-box`, `-webkit-box-orient: vertical`, `-webkit-line-clamp: 3` and `overflow: hidden`.

A truncated value needs a way back to the full text. [Layout](layout.md) owns that rule, and an unreachable full value is a `HIGH` escalation trigger in [severity](severity.md).

## Natural case, typographic punctuation

Store text in natural case and set case with `text-transform`, so a redesign never means rewriting copy.

Rendered text uses typographic characters, never their keyboard stand-ins. Code keeps straight quotes.

| Instead of | Use |
| --- | --- |
| Straight quotes | Curly quotes that curve around the text |
| Hyphen in ranges | En dash, as in `2010–2020` |
| Two hyphens for an aside | Em dash character |
| Three periods | The single ellipsis character |
| Regular space in `10 km` | `&nbsp;` so the value never breaks apart |
| Uncontrolled word breaks | `&shy;` to mark where a word may break, or `hyphens: auto` with the correct `lang` |

## Underlines

Take them from the font's own metrics, or tune by hand. Color is the only part of a real underline that animates reliably. Any other underline animation needs a separate element.

```css
a {
  text-underline-position: from-font;
  text-decoration-thickness: from-font;
}

/* Dotted underline hints at extra information, such as an abbreviation */
abbr {
  text-decoration: underline dotted;
}

/* Or tune manually */
a {
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: var(--link-underline);
  transition: text-decoration-color 200ms ease-out;
}
```

`text-decoration-skip-ink: none` is never a fix. Set `text-underline-offset` or `from-font` instead.

## Inputs at 16px on mobile

iOS Safari zooms the whole page when an input's text is smaller than `16px`. Two fixes hold `16px` and look different, so ask which one the design wants.

- **Size up on mobile.** The input renders at `16px` on small screens and drops to the design size from a breakpoint up. Nothing to compensate, but the mobile input no longer matches the desktop one.
- **Scale down.** Keep `font-size: 16px` and render the intended size with `transform: scale()`. It looks identical at every viewport and takes more code.

For the scale-down fix, widen the element by the inverse of the scale so it still fills its container once shrunk. Divide `line-height` by the same factor. Pin the text to the start edge with `transform-origin: left`, or `right` under RTL. Above the breakpoint, drop the transform and set the real size.

```css
/* 13px rendered from a 16px font-size, so 13 / 16 = 0.8125 */
.field {
  display: flex;
  align-items: center;
  height: 40px;
  padding-inline: 10px;
  overflow: hidden;
  border-radius: 10px;
  background: var(--field-bg);
}
.field:focus-within {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.field input {
  flex-shrink: 0;
  width: calc(100% / 0.8125);
  height: 100%;
  background: transparent;
  outline: none;
  font-size: 16px;
  line-height: calc(1.125 / 0.8125);
  transform: scale(0.8125);
  transform-origin: left;
}
[dir="rtl"] .field input { transform-origin: right; }
@media (min-width: 640px) {
  .field input { width: 100%; transform: none; font-size: 13px; }
}
```

The transform shrinks the whole box, not only the glyphs. Let a wrapper draw the field's surface and keep the input transparent. A background, border or ring on the scaled element shrinks with the text and misses the intended hit area. The wrapper also clips the oversized layout box and draws an unscaled focus outline. Verify the focus color's contrast against the surrounding surface.

Style the hint with `::placeholder` and the insertion bar with `caret-color`. A fully custom caret is hard to build and rarely worth it.

## Size floors

Start long-form body text at `16px`, the browser default. Move off it only for a reason you can name, such as a typeface that runs small, a narrow measure or a dense professional tool.

UI text can go smaller. Start inputs and menus at `14px` and captions at `13px`, and rarely go below `12px`. Set `font-size` in `rem` so the reader's browser font size still applies.

## Font smoothing on the root

Apply `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` once on the root, never per component.

## Language and bidi behavior

Set `lang` so browsers and assistive technology pick the right quotes, hyphenation and pronunciation. Set `dir` on the document and wherever direction changes. Wrap a mixed-direction value in `<bdi>` and never reorder digits by hand.

- **Long paragraphs align by their own language.** A one or two line snippet follows the surrounding UI's direction. A paragraph of three or more lines aligns to its own script, so an English paragraph stays start-aligned LTR inside an RTL interface. `text-align: start` with the correct `lang` and `dir` on the paragraph handles this.
- **Digits keep their order.** A phone number reads identically in RTL, because the Unicode bidi algorithm keeps digit runs left to right. `<bdi>` repairs a value whose order adjacent RTL text disturbs.

## Trim text boxes in tight containers

In buttons and badges, the space a font reserves above and below its letters makes text sit low. `text-box` trims it as a progressive enhancement. It takes the edges to trim (`trim-both`, `trim-start`, `trim-end`) and where to trim.

| Keyword | Trims at |
| --- | --- |
| `cap` | The cap height (top) |
| `alphabetic` | The baseline (bottom) |
| `text` | The font's own text edge, keeping room for descenders |

```css
.badge { text-box: trim-both cap alphabetic; }
.heading { text-box: trim-start cap; }
.label { text-box: trim-end alphabetic; }
```

It is supported in Chromium 133+ and Safari 18.2+, not yet Firefox. Unsupported browsers keep the default leading.

## Decorative text in CSS, not images

Build drop caps, gradient text, outlines and text shadows in CSS so the text stays selectable and searchable.

| Property | Effect |
| --- | --- |
| `::first-letter` | Drop cap, widely supported |
| `::first-line` | Styles only the first line |
| `initial-letter` | Sizes the drop cap. Safari needs `-webkit-initial-letter`, no Firefox yet |
| `background-clip: text` | Clips a background or gradient to the letter shapes |
| `-webkit-text-stroke` | Outlines the letters, and works across modern browsers despite the prefix |
| `text-shadow` | Like `box-shadow` but follows the character shapes |

If `-webkit-text-stroke` draws lines inside the letters, the font has overlapping contours. Variable fonts often keep them unmerged, so use the static cut for stroked text.

## Keep useful text selectable

Keep text selectable by default. `::selection` can carry brand into the reading experience, as long as the selected combination stays legible. `::target-text` styles the phrase a shared link scrolls to. The Custom Highlight API styles ranges you pick yourself, like search matches, without extra markup.

`user-select: none` belongs on a draggable or gesture-driven surface where accidental selection interferes. Never across the interface, and never because a button label can be highlighted.

## Severity

`HIGH` makes text unreadable, truncates content with no way back to it, or clips text at 320px width or 200% zoom. The last two are escalation triggers in [severity](severity.md). `MEDIUM` breaks the type system or the visual heading hierarchy. `LOW` is isolated polish.

## Verification

Without a browser, check declared size and weight per heading level, descending within each semantic section. Check declared line-height, units and measure. Check truncation rules against realistic string lengths.

With a browser, compare computed values, then resize the viewport with real content to catch wrapping, lone last-line words and truncation. Report every check you could not run as `Not verified`.

## Before you finish

| Pattern | Fix |
| --- | --- |
| `font-weight` value with no matching weight in the loaded `@font-face` files | Load that face or use a weight the family ships |
| `font-synthesis: none` on body or interface text | Remove it, then set only the unwanted longhand after checking the fallback stack |
| `font-variation-settings: "wght"` or `"opsz"` | `font-weight`, and drop `"opsz"` so `font-optical-sizing: auto` applies |
| `font-feature-settings: "tnum"` or `"zero"` | `font-variant-numeric: tabular-nums` or `slashed-zero` |
| `line-height` in `px` or `rem` | A unitless value |
| A tight line-height on a description, card body or anything that can wrap | `1.4` or more |
| `letter-spacing` in `px` | The same value in `em` |
| Body `font-size` in `px` | `rem` |
| Weight `100` to `300` on text under `18px` | `400` or heavier |
| `text-wrap: balance` on a paragraph | `text-wrap: pretty` |
| `text-align: justify` in application UI | `text-align: start` |
| `-webkit-line-clamp` without `display: -webkit-box` | Add `display: -webkit-box` and `-webkit-box-orient: vertical` |
| A timer, counter, price or numeric column without `tabular-nums` | `font-variant-numeric: tabular-nums` |
| `...`, `--` or a hyphenated range in rendered strings | `…`, an em dash or an en dash |
| `text-decoration-skip-ink: none` | Remove it, then set `text-underline-offset` or `from-font` |
| `<input>` at `14px` with no mobile override | One of the fixes under Inputs at 16px on mobile |
| `-webkit-font-smoothing` inside a component | Move it to the root |
| Mixed-direction value such as a name, number or URL without `<bdi>` or `dir` | Wrap it in `<bdi>` |
| `user-select: none` on a layout root or text container | Remove it, and keep it only on a drag or gesture surface |
