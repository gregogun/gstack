# Finding the layers behind an effect

Adapted from Jakub Krehel's `explain-interface` (`find-the-effect.md`).

Search by property signature, not by guessing the element. You rarely know the markup, but you always know which CSS properties could produce what you see. Every value a recipe returns is measured. What you conclude from the set is inferred.

## Three things that cost you the answer

**Pseudo-elements carry the effect more often than elements do.** A gradient, a noise overlay, a hairline border or a glow commonly lives on `::before` or `::after`. `getComputedStyle(el)` alone never sees them, so pass the pseudo as the second argument and read the element and both pseudos.

**Idle values are not effects.** `filter: blur(0px)`, `opacity: 1` and `transform: none` are what an animation script leaves on every element it touches. Filter them out first, or they bury the few hits that matter.

**A generated stop list is one technique, not twelve stops.** Stops at `0%, 9.99%, 19.07%, ...` came from a generator following an easing curve, and the extra stops keep the gradient from banding. Name the technique, never paste the stops.

## The layer search

```js
() => {
  const dead = v => !v || v === 'none' || v === 'normal' || v === '1' || v === 'blur(0px)';
  const PROPS = ['backgroundImage', 'filter', 'backdropFilter', 'mixBlendMode', 'maskImage', 'boxShadow', 'opacity'];
  const hits = [];
  for (const el of document.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const s = getComputedStyle(el, pseudo);
      const found = {};
      for (const p of PROPS) {
        const v = p === 'maskImage' ? (s.maskImage || s.webkitMaskImage) : s[p];
        if (!dead(v)) found[p] = String(v).slice(0, 200);
      }
      if (!Object.keys(found).length) continue;
      if (Object.keys(found).length === 1 && found.opacity) continue;
      const r = el.getBoundingClientRect();
      const host = getComputedStyle(el);
      hits.push({
        tag: el.tagName.toLowerCase(), pseudo: pseudo ?? 'element',
        cls: (el.getAttribute('class') ?? '').slice(0, 90),
        position: host.position, z: host.zIndex,
        box: `${Math.round(r.width)}x${Math.round(r.height)} @ x${Math.round(r.left)} y${Math.round(r.top)}`,
        found,
      });
    }
  }
  return { viewport: innerWidth, total: hits.length, hits };
}
```

The recipe skips a row whose only hit is `opacity`, since opacity alone is not an effect. The `box` is the host element's, because a pseudo-element has no rect of its own.

Read the result for the stack, not for one row:

- **Compare `box` against `viewport`.** An element wider than the viewport, or with a negative offset, keeps its edges out of view. That it does is inferred. That the author meant it is a guess.
- **Rows come back in DOM order.** Within one stacking context a later row roughly paints over an earlier one, and a positioned row with a higher `z` paints over both. Confirm the order at a pixel with **Narrowing to a region**.
- **`backdropFilter` on any row.** That layer frosts something beneath it, so the layer beneath is part of the answer.
- **`mixBlendMode` on any row.** The layer's color depends on what it covers, so you cannot explain it without naming what is underneath.

## When CSS is not the answer

Where the layer search comes back empty for the region you care about, the effect is not CSS. Run this after the page has drawn:

```js
() => ({
  scripts: performance.getEntriesByType('resource')
    .filter(r => r.initiatorType === 'script').map(r => r.name.slice(0, 120)).slice(0, 40),
  media: [...document.querySelectorAll('canvas, svg, video, img')].map(el => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      box: `${Math.round(r.width)}x${Math.round(r.height)} @ y${Math.round(r.top)}`,
      ctx: el.tagName === 'CANVAS' ? (el.getContext('2d') ? '2d-or-unused' : 'webgl-or-other') : null,
      src: (el.currentSrc || el.getAttribute('src') || '').slice(0, 90),
    };
  }),
})
```

A canvas returns `null` for a context type other than the one it already holds, so `webgl-or-other` means a WebGL context is likely. Probing an unused canvas creates a 2D context on it, which is why this runs only after the page has drawn. In the user's own browser, ask before you run it, per the **control-ui** skill's Live session ([`../../control-ui/SKILL.md`](../../control-ui/SKILL.md)).

A WebGL canvas plus a script you recognise as a WebGL or 3D renderer is a shader (inferred). Say so and describe roughly what it looks like, rather than describing CSS that is not there. An `svg` may carry `<filter>` primitives worth reading directly.

## Narrowing to a region

Where the page is large, sample what paints at one point instead of walking everything. Set `x` and `y` inside the function, so the recipe runs unchanged in every runner:

```js
() => {
  const x = 720, y = 300;
  return document.elementsFromPoint(x, y).slice(0, 8).map(el => {
    const s = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') ?? '').slice(0, 70),
      bg: s.backgroundImage.slice(0, 80), filter: s.filter, backdrop: s.backdropFilter, blend: s.mixBlendMode,
    };
  });
}
```

`elementsFromPoint` returns front to back, which is the paint stack at that pixel in reverse. It skips elements with `pointer-events: none`, and a pseudo-element comes back as its host. Decorative layers are often `pointer-events: none`, so a missing layer here is not an absent one. Fall back to the layer search and match on `box`.

## Is it animated?

```js
() => document.getAnimations().slice(0, 20).map(a => {
  const t = a.effect?.getTiming?.() ?? {};
  return {
    target: a.effect?.target?.tagName?.toLowerCase(),
    cls: (a.effect?.target?.getAttribute?.('class') ?? '').slice(0, 60),
    name: a.animationName ?? a.transitionProperty ?? '(js)',
    timeline: a.timeline?.constructor?.name ?? null,
    duration: t.duration, delay: t.delay, easing: t.easing,
    keyframes: (a.effect?.getKeyframes?.() ?? []).map(({ offset, easing, opacity, transform, filter }) =>
      ({ offset, easing, opacity, transform, filter })),
  };
})
```

`getAnimations()` catches CSS animations, transitions and Web Animations API playback in one call, which a stylesheet walk misses. Read `easing` on the keyframes as well as on the timing. A CSS animation carries its timing function on each keyframe, and its effect-level `easing` reads `linear`. `delay` across sibling targets is where a stagger shows.

It returns nothing on a page at rest, because a one-shot reveal has either finished or never started. Reload and run it at once, or scroll the target into view for a reveal on scroll. A headless page may not produce frames until something captures it, so where it stays empty, take a screenshot and run it again.

## Is it tied to scroll?

A scroll effect is one of three mechanisms, and each leaves a different trace.

- **A scroll-driven CSS animation.** `timeline` in **Is it animated?** reads `ScrollTimeline` or `ViewTimeline` instead of `DocumentTimeline`. The animation's progress follows scroll position, not time, so `duration` reads `auto`.
- **Plain layout.** `position: sticky` or scroll snapping, with no animation at all.
- **A script writing styles on scroll.** Inline `transform` or `opacity` values change between scroll positions while `getAnimations()` shows nothing for that element.

The first two show up in computed style:

```js
() => {
  const hits = [];
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    const found = {};
    if (s.animationTimeline && s.animationTimeline !== 'auto') found.animationTimeline = s.animationTimeline;
    if (s.viewTimelineName && s.viewTimelineName !== 'none') found.viewTimelineName = s.viewTimelineName;
    if (s.scrollTimelineName && s.scrollTimelineName !== 'none') found.scrollTimelineName = s.scrollTimelineName;
    if (s.position === 'sticky') found.sticky = `top ${s.top}`;
    if (s.scrollSnapType && s.scrollSnapType !== 'none') found.snapType = s.scrollSnapType;
    if (s.scrollSnapAlign && s.scrollSnapAlign !== 'none') found.snapAlign = s.scrollSnapAlign;
    if (!Object.keys(found).length) continue;
    hits.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') ?? '').slice(0, 70), found });
  }
  return hits.slice(0, 40);
}
```

The third needs two readings. This scrolls the window half a screen, reads every inline `style` again, and scrolls back:

```js
async () => {
  const snap = () => new Map([...document.querySelectorAll('[style]')].map(el => [el, el.getAttribute('style')]));
  const before = snap();
  const y0 = scrollY;
  scrollBy(0, innerHeight / 2);
  await new Promise(r => setTimeout(r, 300));
  const after = snap();
  const moved = scrollY - y0;
  scrollTo(0, y0);
  const changed = [];
  for (const [el, style] of after) {
    if (before.get(el) === style) continue;
    changed.push({
      tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') ?? '').slice(0, 60),
      before: (before.get(el) ?? '(none)').slice(0, 120), after: style.slice(0, 120),
    });
  }
  return { moved, changed: changed.slice(0, 20) };
}
```

A `moved` of `0` means the window does not scroll, and a nested scroller does. Scroll that element instead, by changing `scrollBy` and `scrollTo` to calls on it. An inline value that tracks scroll with no animation behind it is a script writing styles on scroll (inferred). Which script does it is a guess.
