# UI Prototype

Generate **several radically different UI variations** on a single route, switchable from a floating bottom bar. The user flips between variants in the browser, picks one (or steals bits from each), and the rest are thrown away.

If the question is about logic or state rather than what something looks like, use [`logic.md`](logic.md).

## When this is the right shape

- "What should this page look like?"
- "I want to see a few options for this dashboard before committing."
- "Try a different layout for the settings screen."

## Where the variants live

A UI prototype is much easier to judge when it sits inside the rest of the app: real header, real sidebar, real data, real density. On an empty page every variant looks fine.

- **An existing page can host it (preferred).** Render the variants on that route, gated by a `?variant=` URL search param. The existing data fetching, params, and auth stay. Only the rendering swaps. This still applies when the thing is new but would naturally live inside a page, such as a new dashboard section, settings card, or flow step.
- **A new page in an existing app.** Only when nothing could host it. Create a throwaway route following the project's routing convention, with `prototype` in the path or filename. Same `?variant=` pattern.
- **No app yet.** Use a scratch dir with plain HTML/CSS/JS or the lightest stack that renders the idea, and the same switcher.

## Process

### 1. Generate radically different variants

Hold each variant to:

- The page's purpose and the data it has access to.
- The project's component library and styling system.
- A name that states its position on the axis, such as `DenseTable`, `EditorialList`, `QuietCards`. A name like `VariantA` tells the user nothing when they flip to it.
- Real content: product-shaped copy, plausible names, and the number of items the page will really carry. Lorem ipsum and three rows make every structure look good.
- The same quality floor. Every variant clears the escalation triggers in the **ui-review** skill's [`severity.md`](../../ui-review/references/severity.md): accessible names, visible focus, keyboard reach, reduced motion, nothing clipped at 320px or 200% zoom, contrast, and the rest of that list. The floor is not an axis and never trades against one. If a direction only works by breaking it, say so and drop the direction.

Write the set down before any code: a name and an axis position for each. No two variants share a position.

Variants must be **structurally different**: different layout, different information hierarchy, different primary affordance. Three slightly-tweaked card grids is wallpaper, not a prototype. If two drafts come out too similar, redo one with explicit "do not use a card grid" guidance.

### 2. Wire them together

One switcher on the route:

```tsx
// pseudo-code, adapt to the project's framework
const variant = searchParams.get('variant') ?? 'dense';
return (
  <>
    {variant === 'dense' && <DenseTable {...data} />}
    {variant === 'editorial' && <EditorialList {...data} />}
    {variant === 'quiet' && <QuietCards {...data} />}
    <PrototypeSwitcher variants={['dense','editorial','quiet']} current={variant} />
  </>
);
```

On an existing page, keep all the data fetching above the switcher. Only the rendered subtree changes per variant.

### 3. Build the floating switcher

A small fixed-position bar at the bottom centre of the screen:

- **Left arrow**: previous variant (wraps around).
- **Variant label**: the current variant's name, such as `Editorial`.
- **Right arrow**: next variant (wraps around).

Behaviour:

- Arrows update the URL search param through the framework's router, so the variant is shareable and survives reload.
- `←` and `→` keys also cycle, except when an `<input>`, `<textarea>`, or `[contenteditable]` is focused.
- Visually distinct from the page (a high-contrast pill, subtle shadow) so it's obviously not part of the design.
- Hidden in production builds, gated on `process.env.NODE_ENV !== 'production'` or the equivalent, so a stray merge can't ship it.

### 4. Hand it over

Render one variant at a time, full size, in its real surroundings. Side-by-side thumbnails distort spacing and scale, and spacing is usually what the user is choosing between. Switching is instant, with no transition.

Give the URL, the `?variant=` keys, the key that flips variants, and the width you judged them at. The useful feedback is usually "I want the header from B with the sidebar from C", which is the design they actually want.

### 5. Clean up

Once a variant wins, fold it into the real page (or promote it to a real route) and rewrite it properly, since it was written without tests or error handling. Remove the losing variants, the switcher, and any throwaway route from production source.

## Anti-patterns

- **Variants that differ only in colour or copy.** That's a tweak, not a prototype.
- **Sharing too much code between variants.** A shared `<Header>` is fine. A shared `<Layout>` defeats the point.
- **Wiring variants to real mutations.** Point any mutation at a stub. The question is what it should look like, not whether the backend works.
- **Promoting the prototype directly to production.** Rewrite it when you fold it in.
