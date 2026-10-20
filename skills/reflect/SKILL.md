---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript in this workspace's transcripts directory, `{{transcripts_dir}}`. {{transcript_format}} Do not glob across other workspaces' transcript directories. That crosses workspace boundaries and reads private chats from unrelated projects.

```bash
ls -t {{transcripts_dir}}/*.jsonl {{transcripts_dir}}/*/*.jsonl {{transcripts_dir}}/*/subagents/*.jsonl 2>/dev/null | head -10
```

That covers the flat (`<id>.jsonl`), nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`) layouts. For each candidate, read its first user turn. Take the file whose first user turn contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three general-purpose subagents, not read-only. Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and a read-only subagent may lose MCP tools.

Each reviewer and the synthesizer name a model role. Set each spawn's model and effort from its role, per [`model-roles.md`](../go-mode/references/model-roles.md).

| Lens | Model role | Role description | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | the strongest reasoning model | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | a fast code model, from a different family than the judgment role where possible | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | the strongest reasoning model | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in their final response.

## 3. Synthesize

One general-purpose subagent, not read-only, with the model from the `reflect judgment, divergent, synthesizer` role (the strongest reasoning model). It spot-verifies citations through MCP, and a read-only subagent may lose MCP tools. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Follow each approved row's Routing exactly. Write every skill edit with the **writing-for-agents** skill.

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the {{skill_authoring}} skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to {{skill_authoring}} and run its description-optimization loop.
- `new skill via {{skill_authoring}}: <kebab-name>`: hand creation to {{skill_authoring}}. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
