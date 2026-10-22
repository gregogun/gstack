---
name: lite-mode
description: Lightweight exploratory work or a quick fix, done directly with one real check and no playbook. Use for /lite-mode.
disable-model-invocation: true
---

# lite-mode

The user has a small idea to try or a quick fix to make, too cheap to grill, spec or ticket. Do it directly.

lite-mode replaces any earlier mode in this chat, including chat-mode's no-action rule.

## Do it

- Do what was asked, scoped to what was asked. Exploratory work counts: test a claim, run a check, sketch a throwaway prototype, try an idea and report what happened.
- Act without asking on reversible work. Pause on the Always pause list in the **go-mode** skill's Autonomy section ([`../go-mode/SKILL.md`](../go-mode/SKILL.md)).
- Work in the main thread with no playbook, todo list or review panel. Spawn a subagent only for a check worth handing off, under go-mode's model roles ([`../go-mode/references/model-roles.md`](../go-mode/references/model-roles.md)).

## Check it

Before you call it done, run the cheapest check that shows it works on the real thing: the one test, the typecheck, the command itself, the page. Say what you ran and what it showed. For an experiment, the result is the check.

## Stop at the edge

Stop and say so in one line when the work outgrows this mode:

- It changes a type or signature other code depends on, or needs a new data shape.
- It touches something on the Always pause list.
- A second attempt would rest on the same premise as the one that failed.
- It is growing past one sitting.

Name what grew, recommend `/go-mode`, and leave the work as it stands for the user to see.

## Reply

What you did, the check and its result, and anything left open. Plain words and short sentences. End on the result.
