# Upstream

Vendored from [jakubkrehel/skills](https://github.com/jakubkrehel/skills/tree/592aedc44d7d5b3e29740984252902f3e5402a1c/skills/teardown) at commit `592aedc`. MIT, see [LICENSE](LICENSE).

gstack changes, kept small so upstream updates merge cleanly:

- Removed `agents/openai.yaml`. It holds display metadata for another harness and nothing in gstack reads it.
- `SKILL.md` frontmatter gains a "Use for /teardown" clause and `disable-model-invocation: true`.
- Mentions of `better-typography`, `better-colors`, `better-accessibility` and `better-layout` link to the matching files in [`../ui-review/references/`](../ui-review/references/) (`SKILL.md`, `preview-page.md`, `sheet-and-svg.md`).
- `SKILL.md` step 3 gains one line saying the builder needs `npm install` once with network access.
- `preview-page.md` points control copy at the **unslop** skill instead of `better-writing`, which gstack doesn't vendor.
