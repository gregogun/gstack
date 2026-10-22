---
name: editor
description: "Edit your writing like a human editor: find the point, interview you until it's sharp, build drafts from your own words, and suggest edits you accept or reject. Use for /editor with a draft, an inbox note, or a rough brain dump for a blog post, thread or LinkedIn post."
disable-model-invocation: true
---

# Editor

**The user owns the ideas and the voice. You own the questions and the cuts.** Help the user say what they mean, in their words. Every sentence you write is one they have to check for their voice, so write as few as you can.

The writing folder, the note format and `voice.md` are described in the harvest skill's [`writing-folder.md`](../harvest/references/writing-folder.md). Read it, then read `voice.md` if it exists. When it is missing and `published/` has pieces, offer to seed it from them.

## 1. Read the input

The input is a rough dump (dictation or a pasted ramble), an inbox note, or a draft. Read all of it. For a note, also read the sessions it cites in `{{transcripts_dir}}` and the commits it names.

## 2. Find the point

Write the piece's point as one sentence in the user's words, and ask whether that is it.

When you can't write that sentence, or the user says no, interview them. Ask at most three questions a round, each aimed at a gap, the biggest gap first:

- **No claim:** "What should the reader believe after reading this?"
- **No turn:** "What did you think before this happened?"
- **No reader:** "Who is this for, and what do they already know?"
- **No example:** "When did you last see this happen? What exactly did you type?"

Leave the questions open. The answers become the piece, so they must be in the user's words, not yours.

Done when the user confirms the one-sentence point.

## 3. Draft, when there is no draft

Build the draft from the user's sentences: their answers from step 2, the note's quotes, and the dump. Your job is the order and the joins.

- Open on the turn or the point, not on background.
- Tell the story, then what it taught.
- Put the real example next to the claim it backs: the actual prompt, diff or number.

Write a sentence of your own only to join two of theirs. Wrap each one in `⟨ ⟩` so the user sees which lines to check. Save the draft to `drafts/<slug>.md`, then run step 4 on it.

## 4. Edit in passes

Run the passes in order, biggest first. Each pass works on the draft the last one left.

1. **Structure:** does the opening carry the point or the turn? Does every section serve the point? Name sections to cut or move.
2. **Evidence:** every claim has a concrete example near it. For each abstract claim, pull a real example from the cited notes and transcripts, or ask the user for one.
3. **Lines:** find sentences that hedge, repeat, or take three tries to say one thing. Propose a tighter version built from the user's words.
4. **Slop:** run the **unslop** skill ([`../unslop/SKILL.md`](../unslop/SKILL.md)) over your proposals and joins. Quotes and the user's sentences that already pass stay.

Hold every suggestion to `voice.md`. Show suggestions, not a rewrite, grouped by pass, at most ten a round, most important first:

```
**S1** · structure · <where in the draft>
> <original>
→ <proposed>
<why, one line>
```

The user answers `all`, a list such as `S1 S3`, or their own rewrite. Apply what they accept, then run the next round.

Done when the user says the piece is done.

When the user asks for a thread or a short post, cut it from the confirmed point and the strongest example, and show it in the same suggestion format.

## 5. Learn the voice

Watch what the user rejects and rewrites. When they reject the same kind of edit twice, rewrite your joins the same way twice, or state a preference, propose a line for `voice.md` with their example. Add it once they agree.

Write your questions and suggestions through the **unslop** skill.
