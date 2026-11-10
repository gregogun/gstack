---
name: explain-diff
description: "Explain a code change (a PR, branch or diff) as one interactive HTML page: background, the core idea, a walkthrough of the code, and a five-question quiz. Written for a reader new to the codebase. Use for /explain-diff, \"explain this PR\", \"walk me through this branch\"."
disable-model-invocation: true
---

# Explain Diff

Make an interactive explanation of one code change that a reader new to the codebase can read once and understand. Adapted from Geoffrey Litt's [explain-diff-html gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524).

The format and quality rules live in [`references/explanation-page.md`](references/explanation-page.md). Read it in full before you write anything. The **explain-run** skill ([`../explain-run/SKILL.md`](../explain-run/SKILL.md)) is the sibling for throwaway runs that leave no diff, and it shares that file.

Run this on the `judgment and prose` role or stronger. Don't hand it to a fast model.

## 1. Read the change

- Resolve the target (a PR, branch, range or working tree) per [change scope](../go-mode/references/change-scope.md), and state the range you read.
- Read every file the diff touches that the page will cite, in full. For a large diff, list the files first and read the ones that carry the change.
- Explore the code around the change for the background: what calls it, what it replaced, and the terms a newcomer needs.

Done when you can explain the change without looking at the diff.

## 2. Write the sections

- **Short version.** The callout from the rules file, right after the title and intro.
- **Background.** First a deep part for beginners, inside a collapsed block marked as skippable: the ideas and terms the change rests on. Then a narrow part: how the system worked just before this change, and the problem the change solves.
- **The core idea.** The essence of the change, not the full detail. Use concrete toy data and diagrams. Add one or two interactive pieces, such as a stepper through an example or a toggle between old and new behavior.
- **Code.** Follow the code-section rules in the rules file: groups by concept, key functions with a plain gloss, few snippets, tests and scripts in a line. End with the known gaps the change leaves, if any.
- **Quiz.** Five questions, per the rules file.

## 3. Check and hand over

Do the fact check and the hand-over steps in the rules file. Give the user the full path of the saved page.

## Before you finish

| You notice | Correct it |
| --- | --- |
| A function name, flag or command appears outside the Code section, including in a diagram or stepper | Rewrite it as what the step asks or does |
| The Code section has a group per file | Regroup by concept and drop the minor files |
| A number, limit or count has no matching line in the source | Find it or delete the claim |
| Every wrong quiz answer shows the same message | Write a hint for each question |
| The page is dense, or a term appears before it is defined | Split the sentence and define the term where it first appears |
| A header is a bare skill label like "Intuition" | Rewrite it as what the section tells the reader |
| Any text renders in a serif font | Switch it to the sans-serif stack in the rules file |
