# Severity

How a confirmed finding is ranked, which fix to propose, how findings are consolidated and how the verdict is reached. The domain references decide whether a symptom is present. This file decides what it costs.

## Levels

- `HIGH` blocks a task, misleads the user, hides content or controls, risks data loss, or is a repeated systemic failure.
- `MEDIUM` meaningfully harms comprehension, efficiency, adaptability or consistency.
- `LOW` is isolated polish with limited task impact.

Within a level, rank by reach, meaning how many places the finding touches and how much one fix buys. A token or shared-component fix outranks the same symptom in one leaf.

Each domain reference has its own `## Severity` section that says what its rules need before they reach `HIGH`. Those sections narrow the levels above and never widen them.

## Escalation triggers

Once the owning domain confirms one of these, it is `HIGH` on sight. Never average it down because the surface is minor.

- An interactive control with no accessible name.
- A keyboard-reachable control with no visible focus indicator.
- A control or path reachable by pointer but not by keyboard.
- Motion or autoplaying content that ignores `prefers-reduced-motion`.
- Content or a control clipped, overlapped or unreachable at 320px width or 200% zoom.
- Body or control text whose rendered contrast pair fails its required ratio.
- State or meaning carried by colour alone.
- A destructive action with no confirmation, undo or distinct treatment.
- Truncated content with no way to reach the full value. See [Truncation](typography.md#truncation).
- Content or a control reachable only past a scroll edge, or behind a disclosure, with no visible cue.
- An error that names no way to recover from it.
- A semantic colour used against its meaning, such as the danger hue on a non-destructive action.
- A state change carried by motion alone, with no colour, icon or label left behind when the animation does not run.

Triggers rank above every other finding. When more fire than the cap allows, list them first and say how many the cap left out. A cap may shorten a report. It may never be the reason a blocker went unreported.

The triggers set severity, not new rules. The owning domain decides whether the symptom is present.

## Delete-first ladder

Severity says how bad a finding is. The ladder says which fix to propose. Before any fix adds something, ask whether removing the element, the effect or the variant solves the problem. When more than one fix works, take the earliest rung that does.

1. **Delete.** A separator that space would carry, an animation on a high-frequency interaction, an ARIA attribute a native element makes redundant, a ramp nothing imports, a variant nobody needs.
2. **Use the platform.** The native element, the native control or the browser's own focus ring, in place of a custom rebuild.
3. **Reuse what the project has.** An existing token, spacing step or motion curve, before any new value.
4. **Correct the value.** The wrong easing, radius, gap or contrast pair, set to the exact value the domain reference gives.
5. **Add.** A new token, a wrapper, a media query, or an ARIA attribute the platform cannot supply.

When the code under review adds what **Delete** would fix, that is a finding, and its fix is the deletion.

## Consolidation and the cap

One root cause is one finding, with every confirmed location in the same row. When a guideline or shared token is the cause, report it once against that source and list the components as its locations.

Report at most 15 findings. Never pad toward the cap. A short review, or one with no findings, is a valid result.

When two domains seem to cover one issue, give it to the owner of the underlying rule and note the secondary effect in the finding's rule cell.

## Verdict

End with one of two.

- `Block` when one or more `HIGH` findings remain. Do not ship until they are fixed.
- `Approve` when no `HIGH` finding remains. Any `MEDIUM` and `LOW` findings stay in the table as work to do.

`Approve` covers only what the Inspected list shows. Name every domain, state, width and mode on the Not inspected list in the verdict line.

In a change review, the cap and the verdict count `Introduced` and `Regression` findings only. A change whose only findings are `Pre-existing` is an `Approve`.

Never report a review of nothing as `Approve`.

## Before you finish

| Mistake | Fix |
| --- | --- |
| A separate findings section per domain | Merge them into one table ranked by severity, then reach |
| A rendering claim whose only evidence is source | Inspect the rendered state, or mark it **Not verified** |
| A missing accessible name or focus ring rated `MEDIUM` because the surface is minor | Triggers are `HIGH` on sight |
| A row on the Inspected list whose evidence names no file, component or check | Inspect it, or move it to Not inspected with the reason |
| A domain marked clear although its reference was never read | Move it to Not inspected and say why |
| The same symptom in several rows, one per component | One row against the shared token or component, listing every location |
| A fix that adds a wrapper, token or ARIA attribute | Check whether a deletion or the native element fixes it first |
| A fix written in a library or styling system the project does not use | Rewrite it in the project's own idiom |
| A finding that says "I prefer" or "feels off" with no rule behind it | Drop it, or name the written rule it breaks |
