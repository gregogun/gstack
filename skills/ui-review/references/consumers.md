# Consumers

UI additions to the shared [change scope](../../go-mode/references/change-scope.md).

## Assets that stay in scope

Two excluded categories come back. A font file added or swapped is a [typography](typography.md) change. An image added to a component is a [surfaces](surfaces.md) and [accessibility](accessibility.md) change, through its outline and its `alt` text. Review the code that references them, not the bytes.

## Expanding to consumers

A changed file is evidence, not the review subject. Its blast radius is the set of surfaces it renders in, and those are what you review.

Expand one hop by default, to the direct importers and callers. Expand a second hop only for design tokens, theme values and shared primitives, where one line reaches the whole product. Review at most five consumers in total across both hops, and state how many you did not expand, since an unstated cutoff reads as completeness.

Use the project's own resolver where one exists, otherwise import paths.

`git grep` searches the working tree by default. Pass the reviewed ref after the pattern, or on a pull request you search a different revision and miss importers the change itself added. Results come back as `<rev>:path/to/file`, so read them with `git show`, never the working-tree copy. Pass `-e` when the pattern starts with a dash, such as a `--color-*` token, or git parses it as an option.

For a changed token or theme value, search the token name rather than the file, since consumers reference the name and never import it.

Order the consumers by a rule you can evaluate, so the cutoff is reproducible.

1. **Route and layout entry points first**, whatever the framework treats as a rendered surface, such as `app/**/page.*`, `app/**/layout.*`, `pages/**`, `routes/**`, `src/views/**` or `*.astro` pages. Everything else only appears inside one.
2. **Then by importer count**, since a component pulled in by twenty files carries more of the change than one pulled in by two.
3. **Break ties by proximity**, same package or feature directory first.

Say plainly if the ordering was arbitrary past a point.
