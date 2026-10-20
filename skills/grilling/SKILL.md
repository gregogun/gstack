---
name: grilling
description: "Interview the user about an idea, plan, or feature until the product decisions are settled. Use for /grilling, 'grill me', to explore an idea with nothing built, or to stress-test a fuzzy idea before building or writing a spec."
disable-model-invocation: true
---

# Grilling

**You own the facts and the technical calls. The user owns the product decisions.** Interview the user until every decision that changes what gets built is settled, then stop.

## What to ask, and what not to

Classify each open decision before you ask it:

- **A fact you could look up** (what the code does, what an API supports, what a library costs): find it yourself. Use a subagent for broad searches. Never ask the user.
- **A fact you could observe by running something** (behavior, timing, layout, feel): don't ask. Note it as a fork for the **prototype** skill or the build to settle.
- **A technical choice the user has no stake in** (module shape, data structure, library): don't ask. The build decides it, via `architect` when it crosses a function boundary.
- **A product or preference call** (who it's for, what it does, what's in scope, what matters most, how it should feel): ask. These are the only questions.

If `GLOSSARY.md` exists, use its terms in your questions, and respect any ADRs in the area.

Write every question and the playback through the **unslop** skill. Write the Markdown file through the **technical-writing** skill.

## Stage

Match the depth to the stage:

- **Exploring an idea:** nothing gets built. Follow the user's interest instead of a build tree. Facts you would otherwise leave to a prototype become open questions.
- **Validating an idea:** settle only what the first working version needs. Record the rest as open, without asking.
- **Building a real feature:** settle the full product tree, including edge cases, out-of-scope lines, and the critical paths that must not break.

When it's unclear which stage this is, make it your first question.

## Rounds

Map the decisions as a tree: each decision branches into the ones that hang off it. The **frontier** is every decision whose prerequisites are settled. A question that depends on another question still open belongs to a later round.

Each round, ask at most five frontier questions, most consequential first. Number each one, give your recommended answer, and word it so "yes" accepts the recommendation:

```
❓ **Q1** - **<question title>**: <question body, including the choices when there are several>

➡️ <your recommended answer>

---

❓ **Q2** - ...
```

Wait for the answers. Each answer reshapes the tree, so recompute the frontier before the next round. Don't block a round on a running lookup: only the questions downstream of it wait.

## Done

Stop when no product decision that would change what gets built is left open. Technical and observable forks stay with the build. Then play back the result:

- **Decided:** each product decision, one line each.
- **Left to the build:** the forks for `prototype` or `architect`, one line each. Skip when exploring.
- **Open:** what you recorded without asking, and the open questions when exploring.

Don't act on it until the user confirms the playback. Then offer the next step: `/go-mode` to build it, or `to-spec` for a feature that will be split into tickets.

When exploring, offer to write the playback to a Markdown file instead. Use the path the user gives. Otherwise look for a folder in the repo that already holds ideas or explorations and use it. With none, use `docs/ideas/<slug>.md`. Outside a repo, ask the user where it goes.
