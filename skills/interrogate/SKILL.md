---
name: interrogate
description: "Multiple LLM reviewers challenge changes from independent angles and check them against the spec and the repo's standards. Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\"."
disable-model-invocation: true
---

# Interrogate

Spawn one reviewer per configured model to adversarially review code changes. The adversarial signal comes from model diversity, not assigned personas. The deliverable is a synthesized verdict. Do NOT auto-apply changes.

## Step 1, Scope

Identify what to review from context:

- If the user points at specific files or a diff, use that.
- If on a feature branch, resolve the range per [change scope](../go-mode/references/change-scope.md) and diff it for the full changeset.
- If the user's message references recent work, gather the relevant files.

Before spawning anyone, check that the base ref resolves (`git rev-parse <base>`) and the diff is not empty. A bad ref or empty diff fails here.

Package the diff or file contents with any surrounding context files the reviewers need to understand the code.

Collect the repo's documented standards: `CONTRIBUTING.md`, `CODING_STANDARDS.md`, `AGENTS.md`, `CLAUDE.md`, and any other file that says how code here is written. Leave out rules that tooling already enforces.

## Step 2, Intent

Before spawning reviewers, state the intent in one clear paragraph from the user's message, commit messages, the PR description if one exists, and the code. If you're unsure about the intent, ask the user before proceeding.

Find the spec the change implements, in this order: issue or ticket references in the commit messages (fetch them with their acceptance criteria and parent spec), a path the user passed, then a spec under `docs/specs/` or the repo's specs folder matching the branch or feature. If none exists, the Spec section of the output says "No spec" and the review continues.

## Step 3, Spawn Reviewers

Spawn all reviewers in a single message, one per entry in the `interrogate reviewers` model role, labeled Reviewer A, B, and so on to match the entry count. Set each reviewer's model and effort from its entry, per [`model-roles.md`](../go-mode/references/model-roles.md).

| Subagent | Role description |
|----------|------------------|
| Reviewer A | the strongest reasoning model |
| Reviewer B | a second, different model for diversity, from another family where possible |

Each reviewer is a read-only general-purpose subagent. If the spawn rejects an entry, run that reviewer on the parent model and say so. Do not block the review on the model issue.

Read `references/reviewer-prompt.md` and fill in the same template for every reviewer with the stated intent, the spec or "No spec", the repo standards, the diff or file contents, the rubric from `references/rubric.md`, and the code-quality lens from `references/code-quality-review.md`.

## Step 4, Synthesize

As results come back, build a unified picture. Parse every reviewer's findings. Merge findings that describe the same issue differently, and note which models raised each one. Findings two or more models raised independently are the highest signal. Read a lone model's finding, but weight it accordingly. Note disagreements. If one model flags something and another explicitly says the opposite, that is context for the verdict.

## Step 5, Lead Judgment

You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator. Read `references/lead-judgment.md` for the full framework. Judge spec findings the same way, but list them under Spec, apart from the buckets, so code-quality findings can't bury them. Put every other finding in one of four buckets, with the model(s) that raised it and a one-line rationale.

- **Act on**. Real issues affecting correctness, security, or maintainability given the actual goals. They would block a real PR.
- **Consider**. Legitimate, but you're not sure they outweigh the cost of addressing them now. Worth the user's attention.
- **Noted**. Technically valid but not actionable. Context-dependent, premature optimization, or low-impact at this stage.
- **Dismissed**. Wrong, nitpicky, or missing context, with a brief reason.

## Output Format

### Intent
> [The stated intent paragraph from Step 2]

### Spec
[Missing or partial requirements, behavior nobody asked for, and requirements that look done but are wrong. Each quotes the spec line and names the models that raised it. Or "No spec".]

### Reviewers
- Reviewer [label]: [model name], [N findings] (one bullet per reviewer)

### Act On
[Each: description, which models raised it, why it matters.]

### Consider
[Each: description, which models raised it, the tradeoff.]

### Noted
[Brief list.]

### Dismissed
[Each with a brief rationale.]

### Agreement Map
[Where models agreed and diverged, and what that pattern tells us.]
