# Failure signatures

Consult this in step 6 of [`../SKILL.md`](../SKILL.md), after the report. Each row starts from what a screenshot shows. The cause in the middle column is the usual one. Confirm it on the live page before fixing, since the same symptom has other causes. The domain rules behind each fix live in the **ui-review** skill's references.

| What you see | Usual cause | Fix |
| --- | --- | --- |
| An avatar or icon squished into an oval or pill | A flex child shrinking | `flex-shrink: 0` on the avatar, the icon, and any fixed-size box |
| Text overflows its box instead of wrapping or truncating | A flex or grid child with `min-width: auto` | `min-width: 0` on the text column, `minmax(0, 1fr)` in grid |
| An email or URL runs past the edge | No break opportunity in the string | `overflow-wrap: anywhere` on that element |
| A trailing action (a ••• menu, a button) pushed off the row or clipped | The middle content took all the space | `min-width: 0` on the middle, `flex-shrink: 0` on the action |
| A badge wraps onto two lines | The badge is allowed to shrink | `white-space: nowrap; flex-shrink: 0` on the badge, and decide what yields instead |
| An avatar centred against a three-line name looks adrift | `align-items: center` on rows of varying height | `align-items: flex-start` once text can wrap |
| The last row cut off mid-glyph at a hard edge | A fixed-height container with no scroll affordance | A visible scrollbar or a fade mask, and an `overflow` value chosen on purpose |
| A long word breaks mid-word in a heading | `word-break: break-all` | `overflow-wrap: anywhere`, which breaks only when it has to |
| Wrong initials: `J` for "Jo", `CI` for "Christopher Alexander Montgomery III", `�` for an emoji-first name | `.split(' ')[0][0]`-style code | Initials from grapheme clusters with `Intl.Segmenter`, first and last word, and a fallback icon |
| An orphaned placeholder dash or empty line where an optional field sat | A placeholder rendered for a missing field | Omit the line, or reserve its height on purpose |
| "1 members", "0 member" | A hardcoded plural | `Intl.PluralRules`, or a separate string per count |
| Numbers jitter as they update, or columns misalign | Proportional figures | `font-variant-numeric: tabular-nums` |
| `1284`, `1,284.000000001`, `NaN`, `undefined` | A raw number rendered | `Intl.NumberFormat` with the user's locale, and a null guard |
| A long translated button label overflows | A fixed-width button | Width from content with a `min-width`, never a fixed `width` |
| Diacritics or tall scripts clipped at the top or bottom | A tight `line-height` with `overflow: hidden` | A looser `line-height`, or no clipping on text boxes |
| A broken-image icon in an avatar | No load-error fallback | Fall back to initials, and `object-fit: cover` for any aspect ratio |
| Truncated text with no way to read it | `text-overflow: ellipsis` and nothing else | A way to the full value that keyboard and touch users reach: wrapping, an expand control, a focusable disclosure, or a detail view. A hover-only `title` does not count. See the **ui-review** skill's [`references/typography.md`](../../ui-review/references/typography.md) |
| Scrolling 1,000 rows stutters | Every row rendered | Virtualize or paginate. Which one is a design call |
| Raw `<b>`, `&amp;`, or `**text**` on screen | Escaping at the wrong layer | Escape once, at render. Never inject user data as HTML |
| Hover-only actions unreachable by keyboard or touch | Visibility tied to `:hover` alone | Also show on `:focus-within`, and keep the action visible on touch devices |

## Truncate, wrap, or clamp

Every long string forces this choice. Make it per field, never globally. When more than one answer fits, the owner is the design.

- **Wrap** text the user needs in full to identify something, such as names, and titles in a detail view.
- **Truncate at the end** for secondary metadata where the start carries the meaning, such as a role, a description, or a message preview. Pair it with a way to the full value.
- **Truncate in the middle** when items differ at the end, such as file names, emails sharing a long domain, paths, and hashes. End truncation makes them identical.
- **Clamp** multi-line previews in cards with `line-clamp: 2`, so card heights stay predictable.
- **Never truncate** numbers, amounts, dates, or anything the user compares. Give them the room.
