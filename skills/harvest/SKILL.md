---
name: harvest
description: "Mine your agent transcripts for moments worth writing about and save each as a note in your writing inbox, with your own words and the commits attached. Use for /harvest at the end of a session, or to collect material from a stretch of work before writing about it."
disable-model-invocation: true
---

# Harvest

**Collect writing material while it is fresh.** Read the user's transcripts, find the moments worth writing about, and save each one as a note in the writing inbox. A note holds raw material: what happened, the user's own words, and the evidence. It is not a draft.

The writing folder and the note format are in [`references/writing-folder.md`](references/writing-folder.md). Read it before step 1.

## 1. Lock the scope

Default to the current session. "This week", a branch, or a topic widens it. State the scope back in one line.

Transcripts live in this workspace's transcripts directory, `{{transcripts_dir}}`. {{transcript_format}} Read another workspace's transcripts only when the user names it.

Read `git log` for the branches in scope too. Commits tie the story to real changes.

For more than three sessions, fan out: one subagent per slice of sessions, with model and effort set per the Subagents section of the **go-mode** skill ([`../go-mode/SKILL.md`](../go-mode/SKILL.md)). Pass each one step 2 and the note format. Each returns its candidate moments in the note format, with a session id and timestamp on every quote. The raw transcripts stay in the subagents.

## 2. Find the moments

A moment is worth a note when it has a **turn**: something the user or the agent believed before and doesn't now. Hunt for:

- **Surprise:** expected one thing, got another.
- **Wrong turn:** an approach tried and dropped, and why.
- **Decision with a reason:** picked A over B, for a reason that would help someone else.
- **The user thinking out loud:** a prompt where the user reasons about design, agents or programming. These are the user's voice and the best raw material in a transcript. Keep them verbatim.
- **A technique that worked**, with the before and after.
- **A number** that changed: a cost, a time, a count.

Assistant turns tell you what happened. User turns carry the voice and the opinions, so read them closely. Routine edits and tool errors that taught nothing are not moments.

## 3. Check the inbox

Read the claim of every note already in `inbox/`. A moment that adds to an existing note extends that note, per the format's rule for new material.

## 4. Write the notes

Write one file per new moment, in the note format.

- **Claim:** the user's sentence when they said it. Otherwise write one and end it with `(draft claim)`.
- **Quotes:** verbatim. Shorten only with `…`.
- **Scrub:** replace secrets, tokens, client and colleague names, private URLs and home paths with a bracketed role or placeholder, such as `[a teammate]` or `[client]`.

Write your own prose through the **unslop** skill ([`../unslop/SKILL.md`](../unslop/SKILL.md)). Quotes stay as the user wrote them.

Done when every candidate is written as a new note, merged into an existing note, or listed as dropped with a reason.

## 5. Report

- **New:** path and claim, one line each.
- **Extended:** path and what was added, one line each.
- **Dropped:** the moment and the reason, one line each.

Then name the note with the strongest turn and offer `/editor` on it.
