---
name: explain-run
description: "Explain an exploratory or throwaway agent run (a spike, proof of concept, or tool evaluation) that left no diff, only what the agent ran and what came back. Produces one interactive HTML page: the assumptions tested, a timeline of the run, a verdict per assumption backed by real output, and what it means for the project. Use for /explain-run, \"explain this spike\", \"what did that run actually prove\"."
disable-model-invocation: true
---

# Explain Run

Make an interactive explanation of the specified agent run that a person who didn't watch it can read once and understand. The run was throwaway code meant to test assumptions about tools we plan to use in a project. There is no diff. The source material is what the agent actually did: the session transcript, the commands it ran, the scripts it wrote, and the outputs, errors and logs they produced.

## 1. Rebuild the run from the evidence

Do this before writing anything.

- Read the full transcript or log. If the user didn't point to one, ask. Claude Code sessions live in `~/.claude/projects/<project-slug>/<session-id>.jsonl`.
- List every command run, every file written, and every result that came back, in order.
- Keep three things apart: what the agent *claimed*, what the output *showed*, and what the agent *inferred*. Only output counts as proof. Mark any conclusion that rests on the agent's say-so or on a step that never ran.
- Note the setup: tool versions, environment, credentials or mocks, network access. A result is only as good as the conditions it ran under.

## 2. Write the sections

The bold names below are directions to you. Write section headers the reader understands without this file, in sentence case.

- **Summary**: a few lines at the top that answer each question with its verdict and the one piece of evidence behind it. A reader who stops here should know what the run proved.
- **Questions**: the assumptions the run set out to test, written as plain yes/no or how-much questions (e.g. "Can tool X stream results under 200ms?"). If the run never stated them, infer them from what it did and say that you inferred them.
- **Background**: what each tool is and the part of it that matters here. Give a deep background for beginners (which a familiar reader can skip), then a narrow one about the features the run exercised.
- **The run**: a timeline of what the agent did, grouped into phases (setup, first attempt, dead ends, the working approach, measurements). Show the key commands and trimmed real output at each step. Call out dead ends, retries and workarounds, because those are often where the real findings are.
- **Findings**: one card per assumption, with a verdict (Confirmed / Refuted / Partly true / Not actually tested), the evidence behind it (a quoted output, a number, an error), and how confident we should be. Be blunt when something wasn't really proven, for example when it ran against a mock, at toy scale, or the agent declared success without checking.
- **How the tools behave**: what the run revealed about how each tool works. Use concrete examples with the real data from the run, and a figure or diagram wherever it explains faster than prose.
- **What this means for the project**: what this means for the project. Which assumptions are safe to build on, which design choices change, what constraints or gotchas to carry forward, and which follow-up experiments would settle the open questions.
- **Quiz**: five medium-difficulty multiple-choice questions about what the run showed: how the tools behaved, why something failed, what is and isn't proven. They should need real understanding, not gotchas. Make them interactive: clicking an answer says whether it was right and explains why.

## 3. Format

- Output a single self-contained HTML file with its CSS and JavaScript. Make it one long page with section headers and a table of contents. Don't use tabs for the top-level structure. Add basic responsive styling so it reads well on a phone.
- Put the file in a global place outside the code repo, and start the filename with today's date in `YYYY-MM-DD-` format, e.g. `/tmp/2026-01-12-run-<slug>.html`. Give the user the full path.
- Write every line through the **unslop** skill, headers, callouts, diagram labels and quiz text included. Write the way you'd explain the run to a colleague. Name the mechanism or the number, not how it felt. Define each tool-specific term the first time it appears, then keep that one name for it. Keep one idea per sentence, and don't open a section by previewing the next one.
- Typography: set every piece of text in a sans-serif system font stack, `font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`, headings, quiz and diagrams included. No serif fonts anywhere, and no web fonts, so the file stays self-contained. Monospace is only for `<pre>` and inline `<code>`. Use a 17px base size, a line height around 1.6, and cap body text at about 70 characters per line.
- Diagrams: pick a small number of diagram families and reuse them. Useful kinds here:
  - A timeline or swimlane of the run: agent → tool → result, with dead ends shown as branches that stop.
  - A system diagram of how the tools talked to each other, with real example data from the run on the arrows.
  - A findings matrix: assumptions down the side, verdict and evidence across.
  - Simple charts for any numbers the run measured (latency, cost, limits).
- Don't use ASCII diagrams. Build diagrams from simple HTML, and use HTML lists for lists.
- For code, commands and output, always use `<pre>` tags. A custom styled div must have `white-space: pre-wrap`. Before saving, check every code block's CSS for `white-space: pre` or `pre-wrap`, and check that no `font-family` in the file names a serif face or the generic `serif`.
- Trim long outputs to the lines that matter and mark where you cut (`… 240 lines omitted …`). Never invent or tidy output. If you paraphrase, say so.
- Use callouts for key concepts, surprising behaviour, gotchas, and anything the run assumed but never checked.
