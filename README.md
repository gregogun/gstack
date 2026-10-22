# gstack

gstack is a personal fork of [pstack](https://github.com/cursor/plugins/tree/182f2ce414e83224915c190d2f63239c1608d0a5/pstack), a set of agent skills for rigorous engineering work. This fork removes pstack's dependence on Cursor so the skills can run in any agent harness. Claude Code is the first supported harness.

Start each chat in a mode. [`/chat-mode`](skills/chat-mode/SKILL.md) only talks. [`/lite-mode`](skills/lite-mode/SKILL.md) tries an idea or makes a quick fix. [`/go-mode`](skills/go-mode/SKILL.md) picks a playbook for the task and runs the other skills when the steps need them. Ask [`/go-help`](skills/go-help/SKILL.md) when you are not sure which skill fits.

## Skills

- [`go-mode`](skills/go-mode/SKILL.md): the entry point for any non-trivial task. Routes the task to a playbook.
- [`lite-mode`](skills/lite-mode/SKILL.md): does a quick experiment or a small fix directly, with one real check.
- [`chat-mode`](skills/chat-mode/SKILL.md): talks things through and changes nothing. In Claude Code a hook blocks tool calls that can change something.
- [`go-help`](skills/go-help/SKILL.md): finds the skill, playbook or principle for a task.
- [`setup-gstack`](skills/setup-gstack/SKILL.md): picks the model and effort for each role.
- [`doctor`](skills/doctor/SKILL.md): finds skills that clash with gstack's names, a stale build, and model config errors.
- [`in-your-own-words`](skills/in-your-own-words/SKILL.md): plays back the goal and the problem before work starts.
- [`sharpen`](skills/sharpen/SKILL.md): aims a task higher without overspecifying it.
- [`grilling`](skills/grilling/SKILL.md): interviews you about an idea until the product decisions are settled.
- [`to-spec`](skills/to-spec/SKILL.md): turns a settled conversation into a short feature spec.
- [`to-tickets`](skills/to-tickets/SKILL.md): splits a spec into labeled vertical-slice tickets.
- [`how`](skills/how/SKILL.md): explains how a subsystem works.
- [`why`](skills/why/SKILL.md): finds out why code is shaped the way it is.
- [`research`](skills/research/SKILL.md): researches a question across the web, papers, docs and code, and turns it into cited findings for an idea, a design decision or a skill change.
- [`teach`](skills/teach/SKILL.md): runs `how` and `why` and gives one plain explanation.
- [`recall`](skills/recall/SKILL.md): rebuilds recent context on a topic from chat history.
- [`ketchup`](skills/ketchup/SKILL.md): summarizes what changed in this chat since the last message.
- [`blast-radius`](skills/blast-radius/SKILL.md): finds what a small diff could break outside itself.
- [`architect`](skills/architect/SKILL.md): settles types and module shape before code that crosses a function boundary.
- [`arena`](skills/arena/SKILL.md): runs several attempts at one brief and merges the best parts.
- [`swarm`](skills/swarm/SKILL.md): runs parallel workers over slices or races and returns one report.
- [`interrogate`](skills/interrogate/SKILL.md): has different models review a diff, try to break it, and check it against the spec.
- [`diagnosing-bugs`](skills/diagnosing-bugs/SKILL.md): finds the root cause of a reproducible bug without fixing it.
- [`prototype`](skills/prototype/SKILL.md): builds a throwaway sketch to settle a design or behavior question.
- [`tdd`](skills/tdd/SKILL.md): fixes a bug test-first when a cheap local test exists.
- [`typescript-best-practices`](skills/typescript-best-practices/SKILL.md): TypeScript rules for `.ts` and `.tsx` work.
- [`deslop`](skills/deslop/SKILL.md): removes AI-generated code slop from a diff before commit.
- [`no-comments`](skills/no-comments/SKILL.md): strips comments before review.
- [`unslop`](skills/unslop/SKILL.md): removes AI tells from prose.
- [`technical-writing`](skills/technical-writing/SKILL.md): a standard for docs, READMEs, PR descriptions and commit messages.
- [`writing-for-agents`](skills/writing-for-agents/SKILL.md): writes skills, prompts and `AGENTS.md` files that agents follow the same way every run.
- [`bro`](skills/bro/SKILL.md): restates the last reply in plain words.
- [`control-cli`](skills/control-cli/SKILL.md): drives and inspects a CLI or TUI through a local harness.
- [`control-ui`](skills/control-ui/SKILL.md): drives and inspects a web, IDE or Electron UI through a local browser or CDP harness.
- [`create-verification-skill`](skills/create-verification-skill/SKILL.md): generates a project-local skill that proves app behavior.
- [`maintain-verification-skill`](skills/maintain-verification-skill/SKILL.md): brings a verification skill back in line with the app.
- [`benchmark-checklist`](skills/benchmark-checklist/SKILL.md): vets a measured number before you report or act on it.
- [`figure-it-out`](skills/figure-it-out/SKILL.md): designs a rigorous run when no playbook fits.
- [`show-me-your-work`](skills/show-me-your-work/SKILL.md): keeps a decision log you can review later.
- [`housekeeping`](skills/housekeeping/SKILL.md): audits and cleans up worktrees, branches, stashes, stale PRs, scratch and disk caches.
- [`automate-me`](skills/automate-me/SKILL.md): drafts a personal `-mode` skill from your own history.
- [`reflect`](skills/reflect/SKILL.md): turns what a finished task taught into skill edits.
- [`correct`](skills/correct/SKILL.md): stops agents from repeating the same mistakes in a repo.
- `principle-*`: 24 one-rule skills that `go-mode` indexes and cites, such as [`principle-prove-it-works`](skills/principle-prove-it-works/SKILL.md).

## Install

Each harness renders its own copy of the skills with `node scripts/build.mjs <harness>`. For Claude Code, see `harnesses/claude-code/README.md` in the gstack source repo.

## Upstream

This repo is a snapshot fork of pstack from [cursor/plugins at commit `182f2ce`](https://github.com/cursor/plugins/tree/182f2ce414e83224915c190d2f63239c1608d0a5/pstack) (2026-10-16), copied without upstream history. Staying in sync with upstream is not a goal.

The `deslop`, `control-cli` and `control-ui` skills come from the `cursor-team-kit` plugin in [cursor/plugins at the same commit](https://github.com/cursor/plugins/tree/182f2ce414e83224915c190d2f63239c1608d0a5/cursor-team-kit/skills).

## License

MIT. See [LICENSE](LICENSE). The `deslop`, `control-cli` and `control-ui` skills are MIT, Copyright (c) 2026 Cursor, under the [cursor-team-kit license](https://github.com/cursor/plugins/blob/182f2ce414e83224915c190d2f63239c1608d0a5/cursor-team-kit/LICENSE).
