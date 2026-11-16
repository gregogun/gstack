### Opening a PR

Invoked at the end of every other playbook.

**Worktree.** go-mode's first-edit trigger sends you here before the first edit, so set this up at the start, not the end.

1. Resolve `<remote>` and `<default>` per [change scope](../references/change-scope.md#default-branch). Run `git fetch <remote>` and set `<base>` to `<remote>/<default>`. With no remote, `<base>` is the local default branch. Skip the fetch and name the base you used.
2. Run `git worktree add --no-track -b <type>/<slug> <path> <base>`. `<path>` is an absolute path to `<repo>-<slug>` beside the primary checkout, which is the first line of `git worktree list`. `--no-track` keeps the branch from tracking the default branch, so a push never lands on it. A stacked child branches off its parent's branch instead: `git worktree add --no-track -b <child> <path> <parent-branch>`.
3. Every edit, commit, and delegate runs in that worktree. Put its absolute path in every go-agent prompt, and use absolute paths or `git -C <worktree>` for every command. Parallel writers each get their own worktree branched from it, per the **swarm** skill.
4. Before the first push, run `git fetch <remote>` and rebase onto `<base>` if it moved, so the PR includes what other agents merged meanwhile. Push with `git push -u <remote> HEAD`. Later pushes to an open PR follow the Babysit playbook.
5. When the task is done, with its last PR open, remove each worktree you created for it that holds nothing the remote lacks. A worktree you did not create, such as one the user named or a parent handed you, stays. A delegate that opens a PR in its parent's worktree leaves it for the parent. Keep a worktree if any of these checks fails:
   - `git -C <worktree> status --porcelain` prints nothing, so there are no edits and no untracked files.
   - `git -C <worktree> rev-list --count @{u}..` prints `0`, so every commit is pushed. An error means the branch has no upstream, so the check fails.
   - `git -C <worktree> status --porcelain --ignored` lists ignored paths only under dependency or build output, such as `node_modules/`, `dist/` or a cache, and no secret-named file such as `.env*`, `*.pem` or `*.key`. `worktree remove` deletes ignored files without asking.
   - No subagent of yours still works in it, and you left no dev server or preview running there for the user.
   - `lsof -a -d cwd -Fn | grep "^n<worktree>"` prints nothing, so no shell, editor, or other agent has its working directory in it. `cd` your own shell to the primary checkout first, and stop your own watchers.
   - The harness session itself was not opened in it.

   Then run `git -C <primary> worktree remove <worktree>` without `--force`, so git refuses a worktree that changed after the checks. Keep the branch. A clean, pushed worktree loses nothing when removed, so this needs no permission. If you keep it, name its path and the failed check in the reply.

**Returning to a branch.** To continue an existing branch, such as an open PR in Session pickup, a fix in Babysit, or a branch the user or a parent named:

1. Run `git fetch <remote>`, then `git worktree list`. If the branch already has a worktree, work there. That worktree is not yours to remove.
2. If `git worktree list` shows its old path but the directory is gone, run `git worktree prune`.
3. Run `git worktree add <path> <branch>`, with `<path>` named as in step 2 above. This also works when the branch exists only on the remote. You created this worktree, so remove it per step 5 when you are done.
4. Run `git -C <path> merge --ff-only <remote>/<branch>` to pick up pushes from other agents. If `<remote>/<branch>` no longer exists, the PR probably merged and the branch was deleted, so check `gh pr view <branch>` and report that. If the merge refuses for any other reason, the branches diverged, so stop and report it.

Subagents sharing one branch each get their own worktree, or run `git fetch && git reset --hard <remote>/<branch>` between them. If your own worktree picked up unrelated work, patch out your change, start a fresh worktree, and apply it there. If a worktree is snarled, reset it to `<base>` and redo the change minimally.

**Commits.** Commit liberally. Rebase into small, ordered commits before opening PRs. Each commit is a future PR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit. New commit when separable. Commit bodies don't restate the subject.

**PRs.** Run `/deslop` over the diff before commit and `/no-comments` before review. Write every PR title, description, and commit body with `/technical-writing` (every layer except Diátaxis, and apply the STE vocabulary rules: one word per action, keep articles, a plain verb over `-ing` where one works), then apply `/unslop`.

**Review.** Before you open the PR, spawn one fresh subagent on the `code reviewer` model role. Give it the diff against the PR's base, resolved per [change scope](../references/change-scope.md), the ticket or brief's acceptance criteria, and the repo's documented standards. When the diff touches UI (markup, styles, components, tokens), also point it at the **ui-review** skill ([`../../ui-review/SKILL.md`](../../ui-review/SKILL.md)) and have it run a change review over the domains the diff touches. Never give it the writer's reasoning: no plan, transcript, delegate report, commit bodies, or PR description. It reads the code cold, reports findings, and edits nothing. Fix each finding or dismiss it with a concrete reason, and name the dismissals in the PR body. This review runs on every PR. `interrogate` is the heavier, opt-in version.

**Titles.** Conventional Commits `type(scope): subject`, no trailing period. Type such as `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf`. Scope is the area, such as `gstack` or `go-mode`. Subject is short, imperative, and names a real symbol when one carries the change, for example `fix(gstack): retarget opening-a-pr babysit trigger`.

**Descriptions.** The PR body is a one-minute briefing, not a lab notebook, for a reviewer who has the diff. It says why the change exists, what it leaves out, what it could break, and how you proved it works. Write short, simple sentences with few identifiers, no walls of text. The body becomes the squash commit body, so keep that commit under about 40 lines. Use `##` headings, not bold lead-ins, in this order, and drop a section with nothing to say:

- `## Why`: the problem and approach, 1–3 short sentences. No SHAs, rebase genealogy, or "based on main" preamble.
- `## What changed`: 1–3 short bullets. Name a real symbol or path only when it carries the change. Name both sides of a rename or retarget.
- `## Scope`: always. 1–3 short items on what it covers and what it deliberately leaves out (a follow-up, a known gap). No symbols, paths, or file-by-file essay.
- `## Tradeoffs`: only rejected alternatives a reviewer would otherwise ask about. Skip when there was no real choice.
- `## Blast Radius`: 1–2 sentences on who or what it touches and why that is safe or risky. If main is red, state the cost of leaving it red.
- `## Verification`: 1–3 bullets, each a real run path and its outcome. Perf: one primary number with its unit, `before → after`, and a link to the arena or swarm directory for the rest. No sample-size methodology, swarm recitals, or metric tables.

After the sections, attach videos or screenshots when they prove a claim. Full SHAs, swarm or arena lane recitals, lever-correction essays, file-by-file checklists, and "CLEAN" verdicts go in a linked artifact, not the body.

**Forge.** Resolve the forge before the first PR operation and keep that choice for create, edit, view, watch, and merge. GitHub CLI (`gh`) is the default. Do not require Graphite (`gt`).

**Size and stacks.** Prefer five narrow PRs to one large PR. A stack is a base-branch chain. The root PR targets trunk. Each child branch rebases onto its parent's exact tip and its PR targets the parent branch. As a parent merges, move its child onto trunk. Create a child with `gh pr create --base <parent-branch>`, and retarget one with `gh pr edit <pr> --base <parent-branch>`. Branch from trunk only for independent work. Rebase on trunk before substantial stack work.

**Readiness.** Open every PR ready, never as a draft. With `gh`, omit `--draft`. If a PR still opens as a draft, run `gh pr ready <number>`. Run `gh pr view <number>` before you refer to PR status.

**Babysit.** Opening a PR does not start a babysit. Post the URL and keep building. Finish the phase or stack first. Run a separate babysit pass only when the user asks for one after the whole stack exists. A babysit for each new PR stalls the build and spends checks on commits later waves restart. Push back when feedback drifts from intent.

A subagent that opens a PR runs `/deslop`, `/no-comments`, and the **Review** step, plus `interrogate` when its brief asks for it, and posts the URL. It returns to the parent without babysitting.
