---
name: go-deeper
description: "Pick the two or three general ideas behind a piece of work (a finished task, a PR, a diff, a conversation) that will come back in other projects, and point to the best verified places to learn each one, tied back to where it shows up in this work. Use for /go-deeper, \"where can I learn more about this\", \"what should I read to understand this properly\"."
disable-model-invocation: true
---

# Go Deeper

**You turn one piece of work into a short reading list for the ideas in it that travel. The user should come back to the next project knowing more, not just this repo.**

`teach`, `how` and `why` explain this codebase. This skill points outward: the general idea, the best place outside this repo to learn it, and the spot in this work where it shows up. A short list of excellent sources beats a long list of good ones.

Run this on the `judgment and prose` role or stronger, per [`model-roles.md`](../go-mode/references/model-roles.md). Picking what's worth learning is the judgment call.

## 1. Read the work

Resolve what the user means: the task just finished in this chat, a PR, a branch, a diff, or a topic from the conversation. For a code change, resolve the range per [change scope](../go-mode/references/change-scope.md) and read the files that carry it. State in one line what you read.

Done when you can name the problem the work solved and how it solved it, without looking.

## 2. Pick the ideas

List every idea the work rests on. Sort each into one of two piles:

- **Local:** true only here. Which script calls which, this repo's naming, this team's config.
- **Transferable:** a general idea with a common name that you would find in docs or a book. Git worktrees, check-then-act races, idempotent operations, content negotiation, CSS stacking contexts.

Two ideas that one chapter of a good book would teach together are one idea. Merge them under the chapter's name. Then keep up to three transferable ideas. One is fine. Rank by how likely the user is to meet the idea again, then by how much of this work it explains. Drop an idea the conversation shows they already know. For each one you keep, write down:

- its common name, the one a search engine and a senior engineer would both use
- a one-sentence plain definition
- its anchor: the `file:line` in this work where it shows up, read and confirmed. When the work is a conversation with no files, quote the message where it came up.

Done when every kept idea has all three and none is local detail with a general-sounding name. When no idea survives, tell the user the work rests on nothing worth studying beyond this repo, and stop.

## 3. Find sources

Spawn one finder per idea in a single message, built from [`references/finder-prompt.md`](references/finder-prompt.md). Fill in the idea, its definition, its anchor with one line on what it does there, and the rows of the trusted sources file that fit it. That file and what trust means are defined in the **research** skill's Trusted sources file section ([`../research/SKILL.md`](../research/SKILL.md)). Each finder is a background general-purpose subagent on the `research explorer` model role, with web access. Set each finder's model and effort from that role, per [`model-roles.md`](../go-mode/references/model-roles.md).

While they run, check whether a gstack principle teaches the idea. List the `principle-*` folders beside this skill and read any whose name fits. A match goes on the idea's **In gstack** line, not in its sources.

Done when every finder has returned or dropped out. Move an idea whose finder dropped out to Gaps.

## 4. Check every link

Open every link you will hand over yourself. Confirm the page loads, the section you name exists, and it says what you claim. Drop a source that fails. A finder's report is not proof, so check the page itself.

Keep at most three sources per idea. Prefer, in order: a primary source (the spec, the official docs, the original author's own writing), then a well-known book chapter or talk, then a secondary write-up. Keep a secondary one only when it explains the idea better than any primary source you have. Point every link at the chapter, section or anchor that covers the idea, not a home page or a whole book.

Done when every link has been opened this session. Move an idea with no surviving source to Gaps.

## 5. Write it up

Reply in chat in the format below. Write it through the **unslop** skill ([`../unslop/SKILL.md`](../unslop/SKILL.md)). When the user asks to keep it, write the same Markdown to the path they name.

```markdown
# Go deeper: <what the work was, in a few words>

<One or two sentences on the work and why these ideas were picked.>

## <Idea's common name>

<Plain definition, one sentence.> <Why it will come back, one sentence.>

**In this work:** [`<file>:<line>`](<path>#L<line>). <What to look at there, once you've read up, and what you'll now see in it.>

- **[<Source title>, <section>](<url>)** · <primary | book | talk | secondary> · <~10 min | ~1 hour | an evening>
  <What it covers, and what you can do or see after reading it.>

**In gstack:** [`principle-<name>`](<path>). <How the principle applies the idea.>

## Gaps

<Ideas you considered and dropped, and why.>
```

Order the sources inside each idea from quickest to deepest, so the first one gives the gist and the last one makes the idea yours. The depth tag is your estimate from the page's length, so keep it rough. Leave out the **In gstack** line when no principle matched, and the Gaps section when nothing was dropped.

## Before you finish

| You notice | Correct it |
| --- | --- |
| An idea's name only makes sense inside this repo | Move it to the local pile, or rename it to its common name |
| A source line says "great resource" or "covers everything" | Say what the reader can do after reading it |
| An "In this work" line says where the idea is but not what to look for | Say what the reader will see there once they've read up |
| Two ideas share their best source | Merge them into one idea |
