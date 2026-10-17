---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript in the `agent-transcripts/` directory the system prompt names. Do not glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects.

```bash
ls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10
```

That covers the legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`) layouts. For each candidate, read the first JSONL line. Take the file whose `message.content[0].text` contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three general-purpose subagents, not read-only. Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and a read-only subagent may lose MCP tools.

Each reviewer and the synthesizer name a model role. Set the model from that role's entry in {{models_config}}. With no entry for the role, use the available model that best fits the role's description and say which. Leave the model unset for an `inherit-parent` entry, so the subagent runs on the parent model. If the spawn rejects a model, use the parent model and say so. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **go-mode** skill.

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

Follow each approved row's Routing exactly:

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
