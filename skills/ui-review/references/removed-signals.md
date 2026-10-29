# Removed signals

What to look for on the `-` side of a hunk in a change review, and which domain reference owns the judgement. A signal is a lead, not a finding.

Adapted from Jakub Krehel's `interface-review`.

## Signal table

| Removed from the `-` side | Owner | What to check |
| --- | --- | --- |
| `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-live`, `role=` | [accessibility](accessibility.md) | The control or region lost its accessible name, description or announcement |
| `alt=`, `<label`, `for=`, `htmlFor`, `scope=` | [accessibility](accessibility.md) | An image, field or table cell lost its programmatic association |
| `<button>`, `<a>`, `<nav>`, `<main>`, `<ul>` replaced by `div` or `span` | [accessibility](accessibility.md) | Keyboard and assistive-technology behaviour was traded for styling |
| `:focus-visible`, `:focus`, `outline`, `tabindex` | [accessibility](accessibility.md) | Keyboard users lost the focus indicator, or the element left the tab order |
| `prefers-reduced-motion` | [accessibility](accessibility.md) | Motion now ignores the user's system preference |
| `prefers-contrast` | [colors](colors.md) | Colours now ignore the user's contrast preference |
| A colour token swapped for a literal, or a token swapped for a lighter one | [colors](colors.md) | The rendered contrast pair may now fail, so measure it |
| Logical properties swapped for `left` or `right` | [layout](layout.md) | Direction-aware layout was dropped |
| `env(safe-area-inset-*)`, `scroll-padding`, `min-width: 0`, `minmax(0, 1fr)` | [layout](layout.md) | Content can now sit under a notch or header, or overflow its track |
| `lang=`, `dir=` | [typography](typography.md) | Language metadata or text direction was dropped |
| `text-wrap`, `line-clamp`, `overflow-wrap`, `tabular-nums`, `font-feature-settings` | [typography](typography.md) | Text rendering, wrapping or numeral alignment silently changed |
| An expand control, detail link or focusable tooltip next to truncated text | [typography](typography.md#truncation) | Truncated text lost its way back to the full value |
| `@media (hover: hover)` or `(pointer: fine)` around a hover rule | [surfaces](surfaces.md) | Hover effects now stick on touch after a tap |
| `overscroll-behavior` on a dialog, drawer, menu or panel | [surfaces](surfaces.md) | Scrolling inside the overlay now chains to the page behind it |

## Equivalent replacements

These clear the signal. Drop a removal that one of them explains before routing anything.

- `aria-label` giving way to `aria-labelledby` that points at visible text.
- An explicit `role` dropped because the element became the native equivalent, such as `role="button"` going when a `div` becomes a `<button>`.
- `outline` replaced by a `box-shadow` ring on the same `:focus-visible` selector, with a transparent outline kept for forced-colors mode.
- `tabindex="0"` dropped from an element that is now natively focusable.
- A colour literal replaced by a token with the same value.
- A physical property replaced by its logical counterpart, which is the fix rather than the regression.

## Searching the removed side

Restrict the search to deleted lines so additions do not mask a removal. Pass the exclusion pathspecs from [Excluded paths](scope-resolution.md#excluded-paths) after `--`.

```bash
git diff -U0 "$BASE" <head-ref> -- . <exclusions> \
  | grep -E '^-' | grep -vE '^--- (a/|/dev/null)' \
  | grep -E 'aria-|role=|alt=|htmlFor|for=|scope=|focus|outline|tabindex|prefers-|lang=|dir=|text-wrap|line-clamp|overflow-wrap|tabular-nums|font-feature|inset-|-inline|-block|hover|pointer|overscroll|safe-area'
```

Leave `<head-ref>` off for a target that includes uncommitted work, so the diff runs against the working tree. Swapped colour tokens have no pattern, so read those hunks.

Read the surrounding hunk before deciding. A removed attribute means nothing without the element it came from, and `-U0` hides that context on purpose.

## Routing

A removal is a regression only when nothing in the change replaces it. Check the equivalent replacements first, then route each unmatched removal to its owner. Report only what the owner's rules confirm, and give it the status `Regression`.
