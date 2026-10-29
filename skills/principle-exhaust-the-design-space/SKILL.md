---
name: principle-exhaust-the-design-space
description: "Apply when facing a novel UI interaction or architectural decision with no precedent in the codebase. Build 2-3 competing prototypes and compare side by side before committing."
disable-model-invocation: true
---

# Exhaust the Design Space

When a decision has no precedent in the codebase, build two or three structurally different candidates and compare them before you commit to one.

It also applies to product design decisions where user experience depends on feel, not logic.

**Why:** The first idea that works is rarely the best one, and you can't see that until a second one stands next to it. A novel decision also sets the precedent the next ten changes copy, so a weak first pick compounds.

**Pattern:**
- **Vary the structure, not the surface.** Candidates differ in layout, data shape, or interaction model. Two versions that differ only in colour, copy, or naming are one candidate.
- **Name the axis.** State the one dimension the candidates differ on and give each a different position on it.
- **Make the comparison cheap.** Throwaway code, one switcher, real content. The **prototype** skill is the method for UI and behavior. The **architect** skill is the method for code shape.
- **Let the right judge decide.** An observable fork (timing, output, layout at a given width) is settled by observing it. A matter of taste or feel goes to the user, who picks the variant. Present the tradeoffs without a recommendation.
- **Skip it when precedent exists.** Follow the pattern the codebase already has. A second exploration of a settled design is waste.
