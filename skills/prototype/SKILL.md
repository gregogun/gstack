---
name: prototype
description: "Build a throwaway prototype to make a design or behavioral decision cheaply, or to settle an empirical fork by observing it instead of asking. Use for /prototype, 'mock it up', 'try this layout', 'sketch it to decide', or to check whether a state model or logic feels right."
disable-model-invocation: true
---

# Prototype

**You own the design decision, not the code. The prototype is a throwaway instrument. The real build follows the Feature playbook.**

Here the Laziness Protocol's "smallest change" and the verification bar invert. Speed beats polish, code quality does not matter, and there is no planning. The rigor is in picking the right design cheaply. Propose variations the user didn't ask for, throw an approach away and try another.

## Steps

1. **Scope the decision** the prototype exists to make: which layout, which interaction, which density, or for an empirical fork which behavior, timing, or approach. No decision means no prototype. Route to Feature. Write the question at the top of the prototype where the user sees it, not only in a comment.
2. **Pick the shape.** The question decides it, and the wrong shape wastes the whole prototype.
   - "Does this logic or state model feel right?" → [`references/logic.md`](references/logic.md).
   - "What should this look like?" → [`references/ui.md`](references/ui.md).
   - A behavioral or timing fork → the smallest script that exercises the question.

   If the question is ambiguous and the user isn't around, match the surrounding code (a backend module → logic, a page or component → UI) and state the assumption at the top of the prototype.
3. **Gather references when the design space is open.** Search for prior art, summarize a moodboard of themes, palettes, and layouts, and let the user pick directions before building. Skip when the direction is set.
4. **Build it throwaway.** A UI question with an existing page to host it goes on that page, per `references/ui.md`. Everything else goes in an isolated scratch dir, separate from production source. Name it so a reader can see it's a prototype. It must be trivial to run: one command or one double-clicked file. No tests, no abstractions, no error handling beyond what keeps it running. State lives in memory unless persistence is the question.
5. **Compare alternatives behind one switcher** (buttons or a keypress), each variant labeled. Variants must differ in structure, not just in colour or copy. Default to 3, cap at 5. This is the **principle-exhaust-the-design-space** skill made cheap.
6. **Verify on the matching surface.** For a visual decision, screenshot each variant via the control skill and drive the interaction. For a behavioral or timing decision, observe the thing you are deciding by logging the timing, printing the output, or watching the render. Render the full relevant state after every action or variant switch. The observation is the test here, not an assertion.
7. **Present the decision.** Give alternatives, tradeoffs, and a recommendation. The output is the decision plus the throwaway artifact, not shippable code. Write the verdict and the question it settled where the real build will see it, such as the task's issue or plan. Hand the chosen direction to **Feature** (or `architect` for the shape) for the real build. Once a direction is chosen, remove any variants and switcher left in production source.

## Reply

The variants explored, the evidence (screenshots for a visual decision, the observed output or timing for a behavioral one), tradeoffs, your recommendation, and the prototype's path. Say plainly that the prototype is throwaway.
