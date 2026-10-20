# Logic Prototype

A single, self-contained HTML file that lets anyone drive a state model by clicking buttons. Use this when the question is about **business logic, state transitions, or data shape**: the kind of thing that looks reasonable on paper but only feels wrong once you push it through real cases.

Because it's one file with nothing to install, you can hand it to a non-developer (a designer, a PM, a domain expert) and let them feel the model for themselves. So it speaks their language, not the code's.

## When this is the right shape

- "I'm not sure if this state machine handles the edge case where X then Y."
- "Does this data model actually let me represent the case where..."
- "I want to feel out what the API should look like before writing it."
- Anything where someone wants to **press buttons and watch state change**.

If the question is "what should this look like," use [`ui.md`](ui.md).

## Process

### 1. Isolate the logic in a portable module

Put the logic that answers the question in a single `<script>` block written as a small, pure module that could be lifted into the real codebase later. The page around it is throwaway. This module isn't.

The right shape depends on the question:

- **A pure reducer**: `(state, action) => state`. Good when actions are discrete events and state is a single value.
- **A state machine**: explicit states and transitions. Good when "which actions are even legal right now" is part of the question.
- **A small set of pure functions** over a plain data type. Good when there's no implicit current state, just transformations.
- **A class or module with a clear method surface** when the logic genuinely owns ongoing internal state.

Pick the shape that fits the question, not the one easiest to wire to a page. Keep it pure: no DOM, no `document`, no button handlers reaching inside it. The page calls into it and nothing flows the other way. Once the question is answered, the validated module lifts into the real code on its own.

### 2. Build the HTML file

One file, plain HTML/CSS/JS: no framework, no bundler, no server, everything inline so it opens by double-click.

Every label is in **domain language**, not code: buttons and state read like the business, not the reducer.

Lay it out top to bottom:

1. **Title and one-line explanation** of what this demo lets you explore (the question).
2. **Current state**: the full relevant state as a readable panel (labelled fields, not a raw JSON dump), re-rendered after every click. Call out what just changed.
3. **Free-play buttons**: one button per action, always available, so anyone can poke at the model in any order.
4. **Guided walkthroughs**: one scenario per tab. Each tab holds a short plain-language description of the scenario and what to watch for, then the ordered buttons to press. Each step is a real button that performs the action and moves to the next step. Starting a walkthrough resets to a known initial state.

Choose scenarios that show the awkward cases: the happy path, a tricky edge case, and an attempt at something that should be illegal.

Keep it clean and restrained: clear typography, generous spacing, one accent colour, no animations.

### 3. Hand it over

Send the file or open it for the user. The interesting moments are "wait, that shouldn't be possible" or "huh, I assumed X would be different". Those are the bugs in the _idea_, which is the whole point. If they want new actions or scenarios, add them.

Once the question is answered, the pure module lifts into the real code and the HTML shell is thrown away.

## Anti-patterns

- **Adding tests.** A prototype that needs tests is no longer a prototype.
- **Wiring it to the real database.** Use in-memory state unless the question is about persistence.
- **Generalising.** No "what if we wanted to support X later." The prototype answers one question.
- **Blurring the logic and the page.** If the pure module references the DOM, `document`, or button handlers, it's no longer liftable.
- **Reaching for a framework, bundler, or server.** One file the user double-clicks.
- **Shipping the HTML shell into production.** The logic module is the part worth keeping.
