---
name: to-tickets
description: "Break a spec, plan, or the current conversation into vertical-slice tickets with blocking edges, acceptance criteria, and a ready-for-agent or ready-for-human label, published to the project's tracker. Use for /to-tickets, usually after /to-spec."
disable-model-invocation: true
---

# To Tickets

**You own the breakdown. The user approves it once before anything is published.** Split the work into tickets that each deliver one narrow, complete, verifiable piece of behavior.

## Steps

1. **Gather the source.** Work from the conversation. If the user passes a spec reference (a path, an issue number, or a URL), fetch it and read its full body and comments.
2. **Ground in the repo.** Read the code the work touches. If `GLOSSARY.md` exists, use its terms in titles and descriptions, and respect any ADRs in the area. Look for a prefactor that makes the rest easier: make the change easy, then make the easy change.
3. **Draft vertical slices.**
   - Each ticket cuts a narrow but complete path through every layer it needs (schema, API, UI), never one layer on its own.
   - Each ticket is verifiable on its own and fits one `/go-mode` run.
   - Prefactoring comes first.
   - A test belongs in a ticket only when the ticket touches a critical path the spec's Testing section names. Everything else is verified by running it.
4. **Wire the blocking edges.** Each ticket lists the tickets that must close before it can start. A ticket with no blockers can start immediately.
5. **Label each ticket.** `ready-for-agent` when an agent can finish and verify it alone. `ready-for-human` when it needs a judgment call, external access, a design decision, or manual testing. Say why in the ticket.
6. **Confirm the breakdown once.** Present a numbered list: title, blocked by, label, and what it delivers. Apply the user's edits, then publish. Don't quiz the user on granularity.
7. **Publish** each ticket from the template below, through the **technical-writing** skill, in dependency order so blockers exist before the tickets that reference them.
   - **The tracker:** the one the spec lives in. Otherwise the one the user names, or what the repo already uses: GitHub issues when the remote is on GitHub and `gh` works, or a folder that already holds specs. With neither, use `docs/specs/<spec-slug>/tickets/`.
   - **On GitHub:** one issue per ticket. Run `gh label create <label> --force` before first use of each label, then apply it. Link each ticket to its spec, as a native sub-issue where the repo supports it. Use native blocking links where the repo supports them, otherwise the "Blocked by" section.
   - **Local files:** one file per ticket, `<NN>-<slug>.md`, numbered from `01` in dependency order.
   - Don't close or edit the spec.
8. **Offer the next step:** `/go-mode <ticket>` for one ticket, or `/go-mode implement the spec in <spec> until done` to work through every `ready-for-agent` ticket.

## Wide refactors

A wide refactor is one mechanical change (rename a column, retype a shared symbol) whose blast radius breaks too many call sites for a vertical slice to land green. Sequence it as expand, migrate, contract:

1. **Expand:** add the new form beside the old so nothing breaks.
2. **Migrate:** move call sites in batches sized by blast radius (per package, per directory), one ticket per batch, each blocked by the expand.
3. **Contract:** delete the old form in a ticket blocked by every batch. Never leave it behind (the **principle-migrate-callers-then-delete-legacy-apis** skill).

When the batches can't each stay green, keep the sequence on one shared branch and add a final integrate-and-verify ticket that every batch blocks.

## Template

```markdown
# <Ticket title>

Status: <ready-for-agent | ready-for-human>   (local files only; on GitHub this is the label)

## Parent

The spec this ticket comes from.

## What to build

The behavior this ticket makes work, end to end, from the user's perspective. Not a layer-by-layer list.

## Acceptance criteria

- [ ] An observable result someone can check by running it
- [ ] A test at <seam>, only when this ticket touches a critical path from the spec

## Blocked by

The tickets that gate this one, or "None, can start immediately". Omit when native blocking links are set.
```

No file paths or code snippets: they go stale fast. The exception is a snippet from a prototype that states a decision more precisely than prose can, such as a state machine, reducer, schema, or type shape. Inline only the decision-rich part and note that it came from a prototype.

## Reply

Each ticket's link or path with its label and blockers, and the next step.
