---
name: writing-for-agents
description: "Write documents an agent reads: skills, playbooks, references, subagent prompts, AGENTS.md, and CLAUDE.md. Use for /writing-for-agents, or when creating or editing any of them."
disable-model-invocation: true
---

# Writing for Agents

Reference for any document an agent consumes: a skill, a playbook, a reference file, a subagent prompt, an `AGENTS.md` or `CLAUDE.md`. The packaging differs, the writing does not. The goal is a document the agent runs the same _process_ through every time, not one that produces the same output.

Use the {{skill_authoring}} skill for skill mechanics: drafting, testing, and iterating. Use this skill for the writing.

## Context pointers

A **context pointer** is a line in the agent's context that names out-of-context material and says when to reach it. A skill's description is one. A line in `AGENTS.md` naming a doc is one. A link to `references/x.md` is one. The pointer's _wording_, not its target, decides when the agent reaches the material and how reliably. A must-have target behind a weakly worded pointer is a variance bug: sharpen the wording first, and inline the material only if sharpening fails.

A pointer states what the material is and lists the **branches** that should trigger reaching it. A branch is a distinct case the document handles, so different runs take different paths through it.

- **Front-load the leading word.** The pointer is where it triggers.
- **One trigger per branch.** Synonyms that rename one branch are that branch written twice. Collapse them.
- **Cut identity the body already carries.**

Every word of an always-loaded pointer (an `AGENTS.md` line, a model-invoked skill's description) costs context on every turn. Prune it harder than the body.

## Information hierarchy

A document is built from **steps** (the ordered actions the agent performs) and **reference** (definitions, rules, and facts consulted on demand). Each piece sits on a ladder ranked by how soon the agent needs it:

1. **In-file step:** what the agent does, in order.
2. **In-file reference:** consulted on demand. A flat set of peer rules on one rung is fine.
3. **Disclosed reference:** a separate file reached by a context pointer, loaded only when the pointer fires.

Push too little down and the top bloats. Push too much and you hide material the agent needs.

**Progressive disclosure** moves material down the ladder so the top stays legible. Branching is the test: inline what every branch needs, and disclose what only some branches reach. In-file reference that should be disclosed buries the steps, and attending to them becomes a coin flip.

**Co-location:** once a piece has its rung, keep its definition, rules, and caveats under one heading. The document should read like documentation written for the agent.

**Sprawl** is a document too long even when every line is live. Attention thins across the excess. The cure is the ladder: disclose reference, and split by branch or sequence so each path carries only what it needs.

## Completion criteria

Every step ends on a **completion criterion**, the condition that tells the agent the step is done.

- **Clarity:** can the agent tell done from not done? A vague bound ("understanding reached") invites premature completion, where the visible steps ahead pull the agent off the current one. Sharpen the bound first. Only if it stays fuzzy and you observe the rush, split the later steps out behind a real context boundary: a hand-off or a subagent. An inline call leaves them in view.
- **Demand:** how much it requires. "Every modified model accounted for" forces thorough work where "produce a change list" does not. Demand binds reference too: "every rule applied" sets the bar for a flat rule list.

The strongest criteria are both checkable and exhaustive.

## Leading words

A **leading word** is a compact concept the model already knows from pretraining (_tracer bullet_, _fog of war_, _red_). Repeated as a token, never re-explained, it anchors a whole region of behavior in a few tokens. Reach for an existing word before coining one: a coined word recruits no priors, so you pay for its definition.

It anchors twice. In the body, the agent reaches for the same behavior every time the word appears. In a pointer, the same word in your prompts, docs, and code links them to the material.

Hunt for passages that collapse into one word:

- "fast, deterministic, low-overhead" → _tight_.
- "a loop you believe in" → _red_: the loop goes red on the bug or it doesn't.

## State the positive

Steering by prohibition puts the forbidden behavior in context and makes it more available. State the target behavior instead: "write one-line comments", not "don't write long comments". Keep a prohibition only as a hard guardrail you can't phrase positively, and pair it with the positive target.

## Pruning

When in doubt, delete. Keep only prose that changes a decision.

- **One source of truth.** Each meaning lives in one place, so a behavior change is a one-place edit. Delegate to other skills by name and path, and don't restate them. Duplication also inflates a meaning's prominence past its real rank.
- **The environment is a source of truth.** `package.json` scripts, config, the directory layout, and `--help` output are lookups. A document that restates them is a stale cache. Write what the agent can't find by looking: the unwritten convention, the reason behind a choice, the gotcha no config confesses. Point at structural sources per the **encode-lessons-in-structure** principle skill.
- **Tell it to do the thing.** Explain the reason only when the rule is confusing without one.
- **Hunt no-ops sentence by sentence.** An instruction the model already follows by default says nothing. The test is model-relative: does the sentence change behavior versus the default? Settle disagreements by running the document. Delete a failing sentence whole. A leading word too weak to beat the default (_be thorough_) is a no-op too, and the fix is a stronger word (_relentless_).
- **Prune sediment.** Lines go stale as the behavior they describe changes. Adding feels safe and removing feels risky, so stale layers settle. Check every line still bears on what the document does.

## In gstack

- Every gstack skill sets `disable-model-invocation: true`, so only the user starts one. Its description is for humans and costs no agent context.
- A skill reaches another by naming it in bold and linking its path, for example the **tdd** skill ([`../tdd/SKILL.md`](../tdd/SKILL.md)). The agent reads the file. Reference shared by several skills lives in one skill's `references/` and the others link it.
- **go-mode** routes tasks to playbooks, and **go-help** maps a need to a skill. A new skill gets a row in go-help and a line in the README, so the user has one place to look.
- Write prose through the **unslop** skill.
