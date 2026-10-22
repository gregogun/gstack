---
name: research
description: "Research a question across the web, papers, docs, the codebase and past chats, and turn what you find into cited findings for an idea, a design decision, or a skill or agent-tool change. Use for /research, \"research X\", \"what's the prior art\", or \"what do others do\"."
disable-model-invocation: true
---

# Research

Gather evidence on one question from several sources, then synthesize it into findings the user can act on. Every finding carries its sources and a confidence tier, and says what it means for the decision at hand.

Explorers use the `research explorer` model role, and the synthesizer uses the `research synthesizer` role. Set each spawn's model and effort from its role, per [`model-roles.md`](../go-mode/references/model-roles.md). Every spawn is a background general-purpose subagent with web access.

## 1. Frame the brief

Write the brief in chat before any spawn:

- **Question:** one sentence.
- **Target:** what the findings feed. One of `idea`, `design decision`, or `skill or tool change`. Name the idea, the decision with its options, or the skill or tool.
- **Done when:** the call the findings must let the user make, such as "pick option A or B" or "know which three changes to make to the `how` skill".
- **Out of scope:** what you will not look into.
- **Trusted sources:** the rows of {{sources_config}} whose topic fits the question, plus any source the user names for this run. Skip the line if the file is missing and the user named none.

If the target is unclear, state your reading and proceed. The user can redirect.

## 2. Pick the angles

Split the question into 2 to 4 angles. Each angle is a sub-question paired with the sources that can answer it. Source kinds:

- **Web and docs:** official docs, specs, engineering blogs, issue threads of other projects.
- **Papers:** research papers and benchmarks, for questions about methods or measured effects.
- **Prior art:** how other tools, agent harnesses and skill sets solve the same problem.
- **This codebase:** what exists now and what the change would touch. For deep code questions, run the **how** skill ([`../how/SKILL.md`](../how/SKILL.md)) as one angle instead.
- **Past chats:** what the user already tried or decided. Run the **recall** skill ([`../recall/SKILL.md`](../recall/SKILL.md)) as one angle instead.

A narrow question with one obvious source gets one explorer. When in doubt, use fewer angles.

## 3. Explore

Spawn every explorer in one message, each with [`references/explorer-prompt.md`](references/explorer-prompt.md), its angle, and the trusted sources that fit it filled in. The step is done when every explorer has returned or dropped out. Proceed with the ones that returned and list each dropout as a gap.

An explorer may report a repo it wants cloned. Ask the user before you clone it, and say which repo and why. A clone puts the repo's files on disk where a later command could run them, so it needs the user's go-ahead every time. On a yes, clone it yourself into the scratch directory with the command in [`references/explorer-prompt.md`](references/explorer-prompt.md), then spawn a fresh explorer for that angle with the clone's path.

## 4. Synthesize

Spawn one synthesizer with [`references/synthesizer-prompt.md`](references/synthesizer-prompt.md), the brief, every explorer's report, and the absolute path of the **why** skill's [`epistemics.md`](../why/references/epistemics.md). It weighs the evidence, tiers each claim, and spot-checks the citations that carry a recommendation.

## 5. Present

Present the synthesizer's findings in the format below. Light edits for context from the chat are fine. Before you present, open the source behind each finding the recommendation rests on and confirm it says what the finding claims. Drop or downgrade a finding that fails.

When the user asks to keep the findings, write them to the path they name.

## Trusted sources file

{{sources_config}} is the user's list of sources they trust, outside the plugin. It is a Markdown table with the columns Source, Topic and Note, one row per source. A source is a person, a site, or a repo. For example:

| Source | Topic | Note |
|---|---|---|
| Kent Beck | testing | trust his views on test design |
| `docs.python.org` | Python | primary for language behavior |

Trust ranks a source first in search and weighs it as primary for its topic. It does not raise a claim's tier: one trusted source is still one source. Edit the file by hand. The user creates it the first time they want one.

## Output format

- **Question and target:** the brief in two lines.
- **Findings:** numbered. Each has a claim, its tier, its sources, and one line on what it means for the target.
- **Recommendation:** the call the brief asked for, with the findings it rests on. If the evidence does not support a call, say so and say what would settle it.
- **Gaps:** what was searched and came back empty, and what was not searched.
- **Next step:** the skill or playbook that acts on the findings, picked by target:
  - `idea`: the **grilling** skill ([`../grilling/SKILL.md`](../grilling/SKILL.md)) to settle the product calls, then **to-spec** ([`../to-spec/SKILL.md`](../to-spec/SKILL.md)).
  - `design decision`: the **architect** skill ([`../architect/SKILL.md`](../architect/SKILL.md)), or the **prototype** skill ([`../prototype/SKILL.md`](../prototype/SKILL.md)) when a fork is still open that running something could settle.
  - `skill or tool change`: `/go-mode` with the findings, which routes to its Authoring a skill playbook ([`../go-mode/playbooks/authoring-a-skill.md`](../go-mode/playbooks/authoring-a-skill.md)).
