# Plan template

Every plan written by `audit` follows this structure. The executor may be a less capable model with zero context and zero taste, so the plan must contain everything, exactly. No references to "the audit above" or "the easing we discussed".

## Where plans live

Plans go in `plans/` at the repo root, one file per plan, named `NNN-short-slug.md` with a zero-padded number. `plans/README.md` indexes them. If the repo already keeps plans elsewhere, use that location and say so.

## The plan

````markdown
# NNN <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` when this plan was written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n files, rough size>

## Problem

What is wrong, where, and why it matters to how the product feels. Cite every
location as `path/to/file.tsx:123` and include the current code verbatim:

```css
/* src/components/dropdown.css:14 current */
.dropdown { transition: all 400ms ease-in; }
```

## Target

The exact end state. Every value spelled out, including curves, durations,
spring configs, and media queries. Never "use a nicer easing":

```css
/* target */
.dropdown {
  transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out);
  transform-origin: var(--transform-origin);
}
```

## Repo conventions to follow

How this codebase already does it, with one exemplar the executor should
imitate (token names, file placement, prop patterns):

- Easing tokens live in `src/styles/tokens.css`. Add new curves there, e.g. `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
- <exemplar file:line that already does this correctly>

## Steps

1. <One concrete edit per step: file, what changes, resulting code.>
2. ...

## Boundaries

- Do NOT touch <files/components out of scope>.
- Do NOT change markup or structure. Motion properties only, unless a step says otherwise.
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since the commit stamp), STOP and report instead of improvising.

## Verification

- **Mechanical**: <exact commands (typecheck, lint, build) with expected outcome>.
- **Feel check**: run the UI, trigger <interaction>, and confirm:
  - <observable check, e.g. "the dropdown scales from its trigger, not from center">
  - <e.g. "spamming the toggle never restarts the animation from zero">
  - In DevTools, set playback to 10% (Animations panel) and confirm <detail>.
  - Toggle `prefers-reduced-motion` (Rendering panel) and confirm movement is dropped but opacity feedback remains.
- **Done when**: <machine- or eye-checkable completion criteria>.
````

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (the same easing token swap across components), they may merge into one plan.
- Pull every value from the Values section of [`../SKILL.md`](../SKILL.md) and never approximate from memory.
- The feel check is not optional. Motion can be mechanically correct and still feel wrong. Give the executor, or the human reviewing the executor's diff, concrete things to watch for in slow motion.
- After writing plans, create or update `plans/README.md` with a table of plans (number, title, severity, status), the recommended execution order, and any dependencies between plans.

## Modes that use plans

### plan

`plan <description>` skips the audit. Run a narrow recon of only the files the description touches, check the change against the Values section and the gate in [`../SKILL.md`](../SKILL.md), and write one plan in the structure above. If the gate rejects the change, write no plan and say which check failed.

### execute

`execute <plan>` runs one plan.

1. Read the plan and compare its `Commit` stamp to `git rev-parse --short HEAD`. If the files it names have drifted, stop and report.
2. Work in a worktree on its own branch, so the main checkout stays clean.
3. Apply the steps in order, with no improvising. Respect the Boundaries section.
4. Run the mechanical verification.
5. Review the diff with the review bar in [`audit.md`](audit.md). Fix any Block-level issue before reporting.
6. Set the plan's Status to DONE in the plan and in `plans/README.md`, then report the Before, After, Why table and the feel checks that need a human.

### reconcile

`reconcile` re-checks existing plans against the current code.

1. For each plan with Status TODO, compare its `Commit` stamp to HEAD and read the files it cites.
2. Mark a plan DONE when the target state already holds, STALE when the cited code has drifted so the steps no longer apply, and keep it TODO otherwise.
3. For a STALE plan, rewrite the Problem and Steps against the current code and update the stamp, or drop it from the index with a one-line reason.
4. Update `plans/README.md` to match, and report the changes in a table.
