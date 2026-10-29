---
name: go-help
description: Guides users through gstack setup, /go-mode, and picking the skill, playbook, or principle for a task. Type /go-help with a question.
disable-model-invocation: true
---

# go-help

Answer the user's question about gstack, hand them a prompt they can send, and link the file the answer came from. For a help question, don't start the work. The user asked how, and a gstack run spends real tokens, so let them send the prompt.

A message that asks for work, such as "use gstack to fix this bug", is not a help question. Read [`go-mode`](../go-mode/SKILL.md), and do the work under it.

This file maps questions to the skills that hold the answers. Those files own the details. Read the file you route to before you quote it, and trust it when it disagrees with this map. The links here are relative to this file, so give the user the file's full local path in the installed plugin.

## Find out what they need

Infer the need from the message and the conversation. A named situation, such as "which skill reviews a PR?", goes straight to its section. If the need is still unclear, ask one multiple-choice question with these options, then answer only the section they pick:

- Get set up
- Start a task with `/go-mode`
- Pick a skill for a situation
- Fix a run that went wrong
- Make gstack my own

Check the state that changes the answer, and mention it only when it does:

- No {{models_config}} means the user hasn't overridden any role, so every role runs on the model and effort gstack ships as its default ([`model-roles.md`](../go-mode/references/model-roles.md)).
- No `verify-*` skill or other app harness in the project means agents have no scripted way to drive the app. Mention `/create-verification-skill` when the question is about proving a change works.

When the model config is missing and it matters, ask whether the user wants to review the model and effort for each role now. It matters when the user is new, the question is about setup or cost, or the answer depends on which models run. Ask at most once per chat. If the need is also unclear, ask both questions together. Offer two choices:

- Now: give them `/setup-gstack` to type, and answer their question too.
- Later: answer their question, and add one line saying every role keeps its default model until they run `/setup-gstack`.

## Get set up

1. Install gstack: {{install}}
2. Run [`/setup-gstack`](../setup-gstack/SKILL.md). It shows the model and effort each role runs on, and writes the roles the user changes to the override file. A change applies at the next spawn.
3. Start a real task with `/go-mode`, a goal, and a check that can pass or fail.

Installing changes nothing until the user invokes a skill. Only `/setup-gstack` loads from the user's words. The [README](../../README.md) has the details. Offer to word their first prompt with them, per [`references/prompting.md`](references/prompting.md).

If cost is the worry, say where the tokens go and how to spend fewer. gstack spends extra tokens on subagents and review panels. Rerun `/setup-gstack` and pick lower efforts or cheaper models. A role set to `inherit-parent` runs on the chat's model and effort, which saves tokens when the chat runs on a cheaper model. A shorter panel list runs fewer subagents, one for each entry. Save `/go-mode` for work that needs rigor, and use `/lite-mode` for small work and `/chat-mode` for talk.

## Start a task with `/go-mode`

`/go-mode` matches the task to a playbook, copies the playbook's steps into the todo list, and runs the other skills as the steps need them. A step it skips stays in the list as `skip: <reason>`. A good prompt states the goal and how to tell it's done. It doesn't list skills, because a hand-written sequence tends to drop or reorder steps the playbook would keep. Read [`references/prompting.md`](references/prompting.md) before you help word one.

`/go-mode` attaches the skill to one message, and it fades as the chat moves on, so start each task with `/go-mode`. Mid-chat, "new task" makes the mode match a fresh playbook. `/go-mode` already uses `go-agent` for the subagents its playbook steps spawn. To get the same style from a subagent of your own, spawn a `go-agent` subagent.

## Pick a skill

The default answer is `/go-mode`, which runs most of the others when its steps need them. Name a skill directly when the user wants more or less of something than the playbook gives. Read the skill before you recommend it, and give one example prompt.

| The user wants to | Skill |
|---|---|
| Do any non-trivial task with rigor | [`/go-mode`](../go-mode/SKILL.md) |
| Try a quick idea or make a small fix, without a playbook | [`/lite-mode`](../lite-mode/SKILL.md) |
| Talk something through, with nothing changed | [`/chat-mode`](../chat-mode/SKILL.md) |
| Check that the agent understood their goal and the problem before it starts | [`/in-your-own-words`](../in-your-own-words/SKILL.md) |
| Aim a task higher before starting: more expert, more outcome-focused, not overspecified | [`/sharpen`](../sharpen/SKILL.md) |
| Know how code works now, or where new code should live | [`/how`](../how/SKILL.md) |
| Know why code is shaped this way, or where a number came from | [`/why`](../why/SKILL.md) |
| Research a question across the web, papers and docs, and get cited findings for an idea, a design decision, or a skill or tool change | [`/research`](../research/SKILL.md) |
| Understand a change or subsystem, explained plainly | [`/teach`](../teach/SKILL.md) |
| Catch up on their own recent work on a topic | [`/recall`](../recall/SKILL.md) |
| Catch up on what changed in this chat since their last message, in a few plain sentences and small visuals, with enough context to decide each action item | [`/ketchup`](../ketchup/SKILL.md) |
| Know what a small diff could break outside itself | [`/blast-radius`](../blast-radius/SKILL.md) |
| Settle types and module shape before code that crosses a function boundary | [`/architect`](../architect/SKILL.md) |
| Get several attempts at one brief, merged into the best one | [`/arena`](../arena/SKILL.md) |
| Run parallel checks over slices, or race workers | [`/swarm`](../swarm/SKILL.md) |
| Have different models review a diff and try to break it | [`/interrogate`](../interrogate/SKILL.md) |
| Settle the product decisions behind an idea by being interviewed | [`/grilling`](../grilling/SKILL.md) |
| Turn a settled conversation into a short feature spec | [`/to-spec`](../to-spec/SKILL.md) |
| Split a spec into labeled tickets an agent or a human can pick up | [`/to-tickets`](../to-tickets/SKILL.md) |
| Answer a design or behavior question with a throwaway sketch | [`/prototype`](../prototype/SKILL.md) |
| Animate, find, remove or fix the performance of UI motion | [`/motion`](../motion/SKILL.md) |
| Stress-test a component with worst-case data and states | [`/break`](../break/SKILL.md) |
| Review a change, screen or repo for accessibility, layout, type, colour, surfaces and motion | [`/ui-review`](../ui-review/SKILL.md) |
| Find the root cause of a bug without fixing it yet | [`/diagnosing-bugs`](../diagnosing-bugs/SKILL.md) |
| Turn a failed Playwright run into one readable file per failure, with a safe rerun command | [`/dossier`](../dossier/SKILL.md) |
| Fix a bug test-first when a cheap local test exists | [`/tdd`](../tdd/SKILL.md) |
| Apply TypeScript rules to `.ts` or `.tsx` work | [`/typescript-best-practices`](../typescript-best-practices/SKILL.md) |
| Strip comments before review, using a reviewer that didn't write them | [`/no-comments`](../no-comments/SKILL.md) |
| Clean AI slop out of a diff before commit | [`/deslop`](../deslop/SKILL.md) |
| Drive a CLI or TUI to reproduce or verify a change | [`/control-cli`](../control-cli/SKILL.md) |
| Drive a browser, Electron, or web UI to reproduce or verify, or debug it to find a cause | [`/control-ui`](../control-ui/SKILL.md) |
| Clean AI tells out of prose | [`/unslop`](../unslop/SKILL.md) |
| Write docs, an RFC, a README, a PR description, or a commit message to a standard | [`/technical-writing`](../technical-writing/SKILL.md) |
| Write a skill, playbook, subagent prompt, `AGENTS.md`, or `CLAUDE.md` that an agent reads | [`/writing-for-agents`](../writing-for-agents/SKILL.md) |
| Hear the last reply again in plain words | [`/bro`](../bro/SKILL.md) |
| Give agents a scripted way to drive the app and prove behavior | [`/create-verification-skill`](../create-verification-skill/SKILL.md) |
| Bring a verification skill and its feature map back in line with the app | [`/maintain-verification-skill`](../maintain-verification-skill/SKILL.md) |
| Vet a performance number before reporting or acting on it | [`/benchmark-checklist`](../benchmark-checklist/SKILL.md) |
| Run a large or cross-cutting change, or one to review after stepping away | [`/figure-it-out`](../figure-it-out/SKILL.md) |
| Keep a decision log during a run, and review it afterward | [`/show-me-your-work`](../show-me-your-work/SKILL.md) |
| Clean up old worktrees, branches, stashes, stale PRs, scratch or disk caches, by hand or on a schedule | [`/housekeeping`](../housekeeping/SKILL.md) |
| Pick a model and effort for each role | [`/setup-gstack`](../setup-gstack/SKILL.md) |
| Find skills that take a gstack command's name, a stale build, or a bad model config | [{{doctor_command}}](../doctor/SKILL.md) |
| Turn their own working habits into a personal mode skill | [`/automate-me`](../automate-me/SKILL.md) |
| Turn what a finished task taught into skill edits | [`/reflect`](../reflect/SKILL.md) |
| Stop agents from repeating the same mistakes in this repo | [`/correct`](../correct/SKILL.md) |
| See which feedback loops a project has and lacks, and fix the weakest one | [`/loop-audit`](../loop-audit/SKILL.md) |
| Find their way around gstack | `/go-help` |

If a skill directory next to this one is missing from the table, read its frontmatter and route by its description. The `principle-*` directories are covered under principles below.

Close calls:

- `/chat-mode` only talks. `/lite-mode` does small work with one check. `/go-mode` runs a playbook. The newest mode in a chat wins.
- `/how` explains what the code does. `/why` explains the reasons. `/teach` runs one or both and explains the result plainly.
- `/arena` gives every worker the same brief and merges the best parts. `/swarm` splits work into slices or a race and returns one report.
- `/architect` implements right after it settles the design. Add "with checkpoint" to review the design before it writes code.
- `/interrogate` reviews the diff. `/blast-radius` looks for breakage outside the diff and proves the one fact that makes the change safe.
- `/technical-writing` is for documents people read. `/writing-for-agents` is for documents agents read.
- `/diagnosing-bugs` stops at a confirmed cause. `/go-mode fix …` runs it and then fixes the bug.
- `/recall` rebuilds context across recent chats. `/ketchup` covers only this chat since the user's last message. Resuming one specific chat or branch is the Session pickup playbook.
- `/figure-it-out` designs one rigorous run. The Autonomous run playbook drives one task to a finish condition.

Not in gstack:

- {{loop_command}} and the {{skill_authoring}} skill come from the harness.

## Playbooks and principles

Playbooks are step lists inside `/go-mode`, not skills, so they have no slash command. Inside `/go-mode`, describing the task picks one, and these phrases name one directly:

- "babysit this pr" or "check on pr 123" runs Babysit. It drives the PR to merge-ready and stops there. It doesn't merge unless the user asks to merge, land, or ship.
- "take over this branch" runs Session pickup.
- "pause safely" runs Pause safely.
- "run the eval playbook" runs Eval.
- "this test is flaky" runs Flaky test. It fixes or quarantines the flake and never raises retries to make it pass.

The Playbooks section of [`go-mode`](../go-mode/SKILL.md) lists every playbook and when it applies.

gstack has no planning skill. The harness's plan mode works alongside it. For a design question, the Prototype playbook or `/architect` settles it in code first.

Principles are one-rule skills that `/go-mode` reads and cites in its replies. The user rarely invokes one. They steer with the names instead, as in "apply prove it works. show me the real output." Typing `/principle-<name>` still loads one on demand.

## Fix a run that went wrong

| Symptom | Fix |
|---|---|
| The agent won't edit or run anything | `/chat-mode` is on. Send the request with `/lite-mode` or `/go-mode`. |
| The mode stopped applying after a few turns | `/go-mode` applies to the message it was typed with. Start each task with `/go-mode`. |
| A question got treated as the next step of the last task | Say "new task", or say the turn doesn't need the mode. |
| A new model choice had no effect | Skills read {{models_config}} at each spawn, so a change applies to the next one. Check that the role name matches a role in [`model-roles.md`](../go-mode/references/model-roles.md) exactly, and that the row has Role, Model and Effort cells. |
| Runs cost more than expected | See the cost paragraph under Get set up. |
| A gstack command ran a different skill | Run [{{doctor_command}}](../doctor/SKILL.md). It finds the other skill with that name and offers a fix. |
| A skill didn't load on its own | Only `/setup-gstack` loads from the user's words. The others load when the user types them or when `/go-mode` runs them, and it doesn't run every skill. |
| Parallel agents overwrote each other | Give each agent its own worktree. |
| An overnight run moved but finished nothing | {{loop_command}} needs a check that can pass or fail, not a duration. |
| The reply claims success from a green build | Ask for the real command, flow, stored value, or profile. That's the prove-it-works principle. |
| A login or other browser-server flow got only mocked component tests | Ask for one real end-to-end test of the main path. That's the test-where-the-bug-lives principle. |

For a run that drifts, [`references/prompting.md`](references/prompting.md) has one-line steers.

## Make gstack my own

- [`/automate-me`](../automate-me/SKILL.md) drafts a personal mode skill from the user's own history, to use alongside `/go-mode`.
- [`/reflect`](../reflect/SKILL.md) after a session turns its lessons into skill edits the user approves.
- `/go-mode write a skill for <workflow>` runs the authoring playbook. The eval playbook tests a skill change blind.
- Fix a misbehaving skill in its own PR, not inside the feature work where it went wrong.

## Reply

Lead with the answer. Give at most one example prompt in a code block, adapted from [`references/recipes.md`](references/recipes.md) when one fits, then the link to that file. Keep it short unless the user asked for the whole map.
