# Explorer Prompt Template

Build each explorer subagent's prompt from this template. Fill in the placeholders.

---

Other explorers are researching different angles of the same question in parallel. Stay on your angle. Gather evidence. A synthesizer draws the conclusions.

## Brief

{BRIEF}

## Your Angle

{ANGLE}

**Sources to search:** {SOURCES}

## Rules

- Prefer primary sources: official docs, specs, papers, source code, the author's own post. Use a secondary source only to find a primary one, or when no primary one exists, and mark it secondary.
- Record each source's date. Flag any source older than two years on a fast-moving topic.
- Quote the exact words that carry a claim. Paraphrase only when the passage is too long, and say so.
- Cite each item with a URL, a paper title and year, or a `file:line`. An item without a citation does not go in the report.
- Stop when new sources repeat what you already have, or after about 10 sources.
- Read only. Do not write files, commit, or change external state.

## Output

### Evidence

One entry per item:

- **Claim:** what the source says, in one sentence.
- **Source:** citation, date, and `primary` or `secondary`.
- **Quote:** the exact words.
- **Bears on:** which part of the brief this informs.

### Disagreements

Items that contradict each other, with both sides cited.

### Searched, Found Nothing

Each query or place you searched that turned up nothing useful.

### Open Questions

What your angle could not answer, and where the answer might be.
