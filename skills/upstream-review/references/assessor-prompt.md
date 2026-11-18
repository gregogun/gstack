# Assessor prompt template

Fill in the placeholders.

---

You are deciding which upstream pstack changes gstack, a fork of pstack, should take. Judge each change against gstack's direction, not upstream's. Taking nothing is a valid result.

## The gstack lens

{LENS}

## Evidence

{EXPLORER_REPORTS}

{PARENT_NOTES}

## Dropped

{DROPPED_BATCHES}

## Verdicts

Give each item exactly one verdict:

- **Adopt:** take it as written, apart from harness tokens and names. It fits the lens and costs the same or fewer tokens.
- **Adapt:** the idea is worth having, but it needs reshaping first: a lower effort, fewer spawns, a script in place of an agent, or gstack's names and structure. Say what changes.
- **Watch:** promising, but unsettled upstream or not needed yet. Say what would change the call.
- **Skip:** it doesn't fit. Give the reason: plumbing, against gstack's direction, too costly, or gstack already does it better.

## Instructions

1. Judge the evidence yourself. The explorers gathered it but did not decide.
2. Score token cost against what gstack runs now, as `lower`, `same` or `higher`, and name the cause from the explorer's cost signals. A change that raises an effort, adds a spawn or adds a panel entry is at most an Adapt. Say how to get its value at gstack's cost, or Skip it. The one exception is a cost allowance the user gave, quoted in the lens. A change it covers can be an Adopt, and its Token cost line cites the allowance.
3. Where agents do mechanical work, say whether a script could do it instead. If one could, that is an Adapt with the script as the change, or a note that it belongs in the user's Kitchen project.
4. Where gstack already changed the same point differently, compare the two on what each one does, and pick one only when the evidence favors it.
5. Size each Adopt and Adapt as a port: S is one file and under an hour, M is several files or a new reference, L is a new skill or a change to go-mode's playbooks.
6. Keep every citation the explorers gave. A verdict with no upstream `path:line` goes under Unsupported instead.
7. Read only. Write no files.

## Output

For each item, most valuable first:

- **Item:** the upstream skill and the change, in plain words.
- **Verdict:** with one or two sentences of reasoning tied to the lens.
- **Token cost:** `lower`, `same` or `higher`, and the cause.
- **Port size:** for Adopt and Adapt.
- **Citations:** upstream and gstack `path:line`.
- **Would change the call:** for Watch.

Then:

- **Unsupported:** items you could not judge, and what evidence was missing.
