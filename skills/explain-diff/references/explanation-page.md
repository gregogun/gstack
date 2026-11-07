# Explanation page rules

Format and quality rules for the HTML page that **explain-diff** and **explain-run** produce. Both skills link here, so a change to the rules is one edit. Every rule is exact. A page that breaks one is not done.

## Reader and voice

- Write for a reader new to the codebase. They don't know its terms, its history or its tools.
- Use plain, short sentences with one idea each. Plain beats elegant.
- Define every term at its first use, in the sentence where it appears.
- Use concrete toy data in examples. Name real numbers only when you checked them (see **Facts**).

## Plain words outside the code

Outside the code section, a page names no function, flag, command or file path in running text, diagrams, stepper text or table cells. Say what a step asks or does.

| Instead of | Write |
| --- | --- |
| `rev-parse`, `status --porcelain -z`, `pack-objects` | Which commit is on the branch? Which files aren't committed? Send me the commits I don't have. |

The code section is the diff's **Code** section, or the run's **The run** section. It may name functions and show snippets. Diagram labels get the plain-words rule too.

## Open with the short version

Put one callout right after the title and intro, headed "The short version". It holds about four bullets that sum up the whole change or run. A reader who stops there still knows what happened.

## The code section

- Group by concept. Cover the key changes only, not every file.
- Open each group with one plain sentence on what the group is for. Then name its key functions, each with a plain gloss.
- Show few snippets. Explain each one in words after it.
- Give tests and scripts one line.
- Read every file the page cites before you cite it. Reading a handful of files from a large diff gives a shallow page.

## Facts

Before saving, grep the source for every number, name, limit, count and quoted string the page states. Drop any claim you can't find. Count tests and files by running a command, not from memory. For a run, check each figure against the output it came from.

## Format

- One self-contained HTML file with inline CSS and JavaScript. One long page with section headers and a table of contents. No tabs for the top-level structure.
- Body font is sans-serif: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Use a monospace font for code only.
- Responsive down to phone width.
- Save outside the code repo, with a filename that starts with today's date as `YYYY-MM-DD-`, for example `/tmp/2026-01-12-<kind>-<slug>.html`. Give the user the full path.
- Draw diagrams in HTML, never as ASCII art. Pick a small set of diagram families and reuse them. Put example data in them. Use HTML lists for lists.
- Show code, commands and output in `<pre>`. A styled div must set `white-space: pre-wrap`. Check every code block's CSS before saving.
- Use callouts for key terms, edge cases and gotchas.
- Give every interactive element a unique `id`.

## Quiz

Five multiple-choice questions of medium difficulty. Each needs real understanding of the change or run and is not a gotcha. Clicking an answer marks it right or wrong and explains why. Each question has its own hint for a wrong answer, written for that question. A generic "try again" fails.

## Before you hand over

1. Run the **unslop** skill ([`../../unslop/SKILL.md`](../../unslop/SKILL.md)) over all prose on the page.
2. Open the page in a real browser at phone width (about 390 px wide), routed through the **control-ui** skill ([`../../control-ui/SKILL.md`](../../control-ui/SKILL.md)). Click every interactive control: every button, slider, stepper and quiz answer. Done when the page logs zero errors.
3. Confirm every element `id` is unique, by script, not by eye.

## Model

This is writing and judgment work. Run it on the `judgment and prose` model role or a stronger one, per [`model-roles.md`](../../go-mode/references/model-roles.md). A cheap model produces the dense, over-technical page these rules exist to prevent.
