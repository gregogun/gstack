# The writing folder

The writing folder is the path the user gives, otherwise `~/writing`. Create any folder that is missing.

```
~/writing/
  voice.md      how the user writes. The editor skill reads and updates it.
  inbox/        one note per moment, written by the harvest skill
  drafts/       pieces in progress, written by the editor skill
  published/    finished pieces. The user moves them here.
```

## Note format

One file per moment: `inbox/<YYYY-MM-DD>-<slug>.md`, with the date of the moment and a slug of a few words from the claim.

```markdown
# <the claim, one sentence>

- **Turn:** <what was believed before> → <what is believed now>
- **Fits:** <post | thread | short>
- **Sources:** <session ids, branch, commits, PRs>

## What happened

<Three to eight plain sentences, in order.>

## In the user's words

> <verbatim quote> (session <id>, <timestamp>)

## Evidence

- <the commit, diff, output or number that shows it, with a pointer to it>
```

Pick **Fits** by shape: `post` when the story needs setup, `thread` when it is a sequence of steps, `short` when the claim stands alone with one example.

A note that gains material later gets a new dated bullet under Evidence and new quotes under In the user's words. Leave the claim alone unless the new material changes it.

## voice.md

```markdown
# Voice

## Does

- <pattern>. Example: "<the user's own sentence>"

## Avoids

- <pattern>. Example: "<the sentence the user rejected or rewrote>"
```

Each line is a pattern the user showed at least twice or stated outright, with an example from their own writing.
