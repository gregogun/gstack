### Visual parity

**You own pixel-exact equivalence. The baseline is the spec. You do not touch it.** Equivalence is verified by image diff, not by eye.

1. Establish the baseline first, before any migration: a visual regression harness that screenshots the current component across its states, plus the target when matching two implementations. No baseline, no parity claim. A blocking prerequisite, not a follow-up.
2. Anti-shortcut clauses, stated and held: no harness modifications, no baseline tampering, no component restructuring to make a diff pass. If the baseline looks wrong, stop and ask, don't edit it.
3. Migrate one component at a time. Parallelize across worktrees, one owner per component (the **separate-before-serializing-shared-state** principle skill). Shared primitives migrate first as a blocking phase.
4. Verify each component against its baseline via image diff on the matching surface via the control skill. A nonzero diff is a fail. Investigate the pixel delta. {{loop_command}} per component until the diff is zero.
5. **When the target is a design rather than an implementation** (a design file or an image), the design is the spec and the project's tokens are the vocabulary. Map every design value onto an existing token or component. Never add a token, a component variant, or an arbitrary value to hit a number. If rounding to the nearest token moves spacing or size by more than 2px, or puts a colour on a different step, stop and ask which way to go. Build only the states the design draws. A state it doesn't draw isn't yours to design, so leave the component's default and list the state as missing. From an image, state the scale you assumed and treat every value as an estimate. Report each difference as a measured value, such as "gap is 12px, design is 16px", never as a feeling.
6. Run **Opening a PR** per component or per safe batch.

**Reply:** components migrated, the diff result for each, the baseline harness location, what's left. For a design target, add each rounded value, each deviation and the question it raised, and each missing state.
