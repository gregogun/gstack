# Claude Code harness

This folder holds what the Claude Code build of gstack needs beyond the shared source in `skills/` and `agents/`:

- `tokens.md`: the value of each `{{token}}` in the source Markdown.
- `plugin.json`: the plugin manifest. The build writes it to `.claude-plugin/plugin.json`.
- `agents/<name>.yml`: frontmatter lines the build adds to `agents/<name>.md`. Model and effort are left unset, so agents run on the parent's model.
- `harness.json`: where the manifest goes, the extra root files to copy, and the deny list of Cursor names the build rejects.

## Build

From the repo root, with Node 18 or later (or bun):

```sh
node scripts/build.mjs claude-code
```

This writes `dist/claude-code/`. The build fails, listing `file:line`, on an unknown or unrendered token or a Cursor name left in the rendered Markdown. `dist/` is not committed.

## Install

The repo root is a local marketplace named `gstack` (`.claude-plugin/marketplace.json`). Its one plugin, also `gstack`, points at `./dist/claude-code`, so build first.

```sh
claude plugin marketplace add /path/to/gstack
claude plugin install gstack@gstack
```

Inside a session, `/plugin marketplace add /path/to/gstack` and `/plugin install gstack@gstack` do the same. Start a new session afterwards.

Claude Code loads a plugin from a local-directory marketplace in place, so after a source change rerun the build and run `/reload-plugins` or start a new session. No reinstall or version bump is needed.

To remove it, run `claude plugin marketplace remove gstack`, which also uninstalls the plugin.

## Names

Skills are namespaced by the plugin, so `/go-mode` is also `/gstack:go-mode`. The bare name works while no other command uses it. Agents load as `gstack:go-agent` and `gstack:comment-sicko`.
