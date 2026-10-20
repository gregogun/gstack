---
name: to-spec
description: "Turn the current conversation into a short feature spec and publish it to the project's tracker. No interview, just synthesis of what was already decided. Use for /to-spec, usually after /grilling."
disable-model-invocation: true
---

# To Spec

**You own the synthesis. The user owns the decisions, and they are already made.** Turn what the conversation settled into a spec a person or an agent can build from. Do not interview the user. The one question you ask is which critical paths get tests.

## Steps

1. **Check the decisions exist.** If the conversation hasn't settled what the feature does, who it's for, and what's out of scope, stop and offer `/grilling` first.
2. **Ground in the repo.** Read the code the feature touches. If `GLOSSARY.md` exists, use its terms throughout the spec, and respect any ADRs in the area.
3. **Propose the test seams.** List the critical paths: the ones where a break costs money, data, access, or the feature's core promise. For each, name the highest existing seam that would catch it, with one line on what it catches and what it misses. Where a seam crosses a dependency, say how tests cross it, per the **architect** skill's [`references/dependencies.md`](../architect/references/dependencies.md). Prefer existing seams to new ones, and fewer seams to more. Everything else is verified by running it, not by tests. Confirm the list with the user before writing. If nothing qualifies, say so and write "None" in the spec. In the same message, ask whether the spec goes to tickets next or gets built directly, and if directly, whether by an agent or a human.
4. **Write the spec** from the template below, through the **technical-writing** skill.
5. **Publish it.** Use the tracker the user names. Otherwise use what the repo already uses: GitHub issues when the remote is on GitHub and `gh` works, or a folder that already holds specs. With neither, write `docs/specs/<slug>.md`.
   When the spec gets built directly, label it `ready-for-agent` or `ready-for-human`. On GitHub, run `gh label create <label> --force` first so the label exists, then apply it. In a local file, add a `Status: <label>` line under the title. A spec headed for tickets gets no label: the tickets carry them.
6. **Offer the next step:** `to-tickets` to split it into slices, or `/go-mode` to build it when an agent builds it directly.

## Template

```markdown
## Problem

The problem the user faces, from their perspective.

## Solution

The solution, from the user's perspective.

## User stories

1. As a <actor>, I want <feature>, so that <benefit>

One story per distinct behavior. Cover the edge cases the conversation settled. No padding.

## Implementation decisions

The decisions already made: modules built or changed, their interfaces, schema changes, API contracts, specific interactions.

## Left to the build

Forks the conversation handed to a prototype or to `architect`, one line each.

## Testing

The critical paths confirmed in step 3, each with its seam and prior art in the codebase. Everything else is verified by running it.

## Out of scope

What this spec deliberately leaves out.
```

No file paths or code snippets: they go stale fast. The exception is a snippet from a prototype that states a decision more precisely than prose can, such as a state machine, reducer, schema, or type shape. Inline only the decision-rich part and note that it came from a prototype.

## Reply

The spec's link or path, the confirmed test seams, the label if one was applied, and the next step.
