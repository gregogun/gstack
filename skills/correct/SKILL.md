---
name: correct
description: "Find the mistakes agents keep repeating in this repo and make each one impossible. Try architecture first, then types, then a lint whose error names the fix, then a hook, then a test, and write docs last. Prove each check fails on a real past mistake. Repeat this each time the operator corrects you. Use for /correct."
disable-model-invocation: true
---

# Correct

The operator keeps correcting agents in this repo for the same mistakes. Change the repo so the next agent can't make them.

Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Design the repo so a change that looks right from one file is right for the whole repo.

## Find the mistake classes

First, read recent commits, reverts, review comments, agent instruction files, and comments that explain workarounds. Group the mistakes into classes. A class counts once it has happened twice.

### Review-bot repeats

A review-bot finding becomes a class once it shows up in a third PR. Count PRs, not comments, because a bot repeats one finding across many lines of one diff. Bots also file noise, and a third PR separates a pattern from a one-off. Start the class as an agent rule. If the finding shows up again after the rule lands, it is a repeat, so move it to a lint or a test.

## Fix each class at the highest level that works

1. **Eliminate it with architecture.** Give each piece of state one owner and each task one supported way. Hide internals so the wrong import fails. Replace hand-synced lists with one source of truth. Delete old ways and dead code an agent would copy.
2. **Enforce it with types so the bad state can't be written.** If bad code still compiles, add a lint or CI check whose error names the file, type, or function to use instead. If the pattern is already common, fail only when a change adds more.
3. **Run it every time with a hook.** Use a hook when the lesson is an action that must happen at a fixed moment, not a property of the code: format after each edit, block a command, or run a check before a commit or push. A harness hook fires on the agent's tool calls. A git hook fires on commit and push for every contributor. Reach for a hook when an agent rule for the action keeps being skipped. Like a lint error, its failure message names the fix.
4. **Test the behavior.** Fix or delete any test that still passes when the behavior it checks breaks, or that fails when only the internals change.
5. **Write docs or agent rules last, only for judgment calls.** Nothing fails when an agent skips them. Write them with the **writing-for-agents** skill.

## Fix and prove

Then fix the most frequent classes now, one commit each. Prove each new check fails on a real past mistake. Run the same command locally and in CI. Exceptions go on the offending line with a reason, an expiry date, and a human's approval.

## Keep the rule table

Last, keep a table in the agent instruction file that pairs each rule with what enforces it. When the operator corrects you, fix the mistake and add the rule. If the rule was already there and nothing enforces it, that's a repeat, so fix it at the highest level in the same change. A skipped rule for an action that must happen every time usually becomes a hook. Drop a rule once its mistake can't happen.

**Reply:** each class with its evidence, the level you picked, and why a higher level didn't work.
