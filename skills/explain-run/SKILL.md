---
name: explain-run
description: "Explain an exploratory or throwaway agent run (a spike, proof of concept, or tool evaluation) that left no diff, only what the agent ran and what came back. Produces one interactive HTML page: the assumptions tested, a timeline of the run, a verdict per assumption backed by real output, and what it means for the project. Use for /explain-run, \"explain this spike\", \"what did that run actually prove\"."
disable-model-invocation: true
---

# Explain Run

Make an interactive explanation of the specified agent run that a reader new to the project, who didn't watch the run, can read once and understand. Adapted from Geoffrey Litt's [explain-diff-html gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524). The run was throwaway code meant to test assumptions about tools we plan to use in a project. There is no diff. The source material is what the agent actually did: the session transcript, the commands it ran, the scripts it wrote, and the outputs, errors and logs they produced.

Run this on the `judgment and prose` role or stronger, per [`model-roles.md`](../go-mode/references/model-roles.md). Don't hand it to a fast model.

## 1. Rebuild the run from the evidence

Do this before writing anything.

- Read the full transcript or log. If the user didn't point to one, ask. Claude Code sessions live in `~/.claude/projects/<project-slug>/<session-id>.jsonl`.
- List every command run, every file written, and every result that came back, in order.
- Keep three things apart: what the agent *claimed*, what the output *showed*, and what the agent *inferred*. Only output counts as proof. Mark any conclusion that rests on the agent's say-so or on a step that never ran.
- Note the setup: tool versions, environment, credentials or mocks, network access. A result is only as good as the conditions it ran under.

## 2. Write the sections

- **Short version**: the callout from the rules file, right after the title and intro.
- **Questions**: the assumptions the run set out to test, written as plain yes/no or how-much questions (e.g. "Can tool X stream results under 200ms?"). If the run never stated them, infer them from what it did and say that you inferred them.
- **Background**: what each tool is and the part of it that matters here. Give a deep background for beginners (which a familiar reader can skip), then a narrow one about the features the run exercised.
- **The run**: the section where commands and real output belong. A timeline of what the agent did, grouped into phases (setup, first attempt, dead ends, the working approach, measurements). Show the key commands and trimmed real output at each step. Call out dead ends, retries and workarounds, because those are often where the real findings are.
- **Findings**: one card per assumption, in plain words, with a verdict (Confirmed / Refuted / Partly true / Not actually tested), the evidence behind it (a quoted output, a number, an error), and how confident we should be. Be blunt when something wasn't really proven, for example when it ran against a mock, at toy scale, or the agent declared success without checking.
- **How the tools behave**: what the run revealed about how each tool works. Use concrete examples with the real data from the run, and a figure or diagram wherever it explains faster than prose.
- **What this means for the project**: which assumptions are safe to build on, which design choices change, what constraints or gotchas to carry forward, and which follow-up experiments would settle the open questions.
- **Quiz**: five medium-difficulty multiple-choice questions about what the run showed: how the tools behaved, why something failed, what is and isn't proven. They should need real understanding, not gotchas. Follow the quiz rules in the rules file.

## 3. Format and quality

The format and quality rules live in [`../explain-diff/references/explanation-page.md`](../explain-diff/references/explanation-page.md). Read it in full before you write anything. The **explain-diff** skill ([`../explain-diff/SKILL.md`](../explain-diff/SKILL.md)) shares that file. For this skill, "the code section" in those rules is **The run**.

Beyond those rules:

- Put the file at `/tmp/<date>-run-<slug>.html`, with the date prefix from the rules.
- Pick diagram families that fit a run:
  - A timeline or swimlane of the run: agent, tool, result, with dead ends as branches that stop.
  - A system diagram of how the tools talked to each other, with real data from the run on the arrows.
  - A findings matrix: assumptions down the side, verdict and evidence across.
  - Simple charts for any numbers the run measured (latency, cost, limits).
- Trim long output to the lines that matter and mark each cut (`… 240 lines omitted …`). Never invent or tidy output. If you paraphrase, say so.
- Check every number against the output it came from. A figure with no source in the run is dropped.
- Use callouts for gotchas and for anything the run assumed but never checked.

## Before you finish

| You notice | Correct it |
| --- | --- |
| A command, flag or function name appears in a diagram, stepper or plain explanation | Move it into The run, or say what it did in plain words |
| A verdict rests on the agent's say-so | Mark it "Not actually tested", or cite the output |
| The page has no "The short version" callout | Add it after the intro |
| Every wrong quiz answer shows the same message | Write a hint for each question |
| A header is a bare skill label like "Findings" | Rewrite it as what the section tells the reader |
| Any text renders in a serif font | Switch it to the sans-serif stack in the rules file |
