### Bug fix

**You own this task. Plan, review, verify.** Delegate investigation and the fix to subagents, stay in the lead. Set each subagent's model and effort per the Subagents section.

Be scientific. Every shipped line traces to runtime evidence. Belt-and-suspenders that "might help" is a hypothesis, not a fix. It does not ship. When evidence refutes a hypothesis, revert what it motivated. The smallest change the evidence justifies ships, nothing more.

1. Diagnose with the **diagnosing-bugs** skill ([`../../diagnosing-bugs/SKILL.md`](../../diagnosing-bugs/SKILL.md)): a feedback loop that goes red on the bug, the minimal repro, the mechanism confirmed with runtime evidence, and the regression seam. Skip it only when the user hands you a confirmed cause, and then still build the loop.
2. Plan the fix. If it crosses a function boundary, `architect` first. Delegate implementation to a subagent on the `bug-fix` model role (a fast code model) with a specific scope.
3. Verify on the same surface. The diagnosis loop and the original repro now pass. "Inconclusive" or wrong-surface is not a pass. Flag it. Unit tests show branch behavior, not bug absence.
4. Stage the commits so the failing repro lands before the fix in git history. When diagnosis found a correct regression seam, see the **tdd** skill for the failing-test-first cadence. Skip it when the test would be expensive, integration-heavy, or unclear, or when diagnosis found no correct seam. State the confirmed hypothesis in the fix's commit message.
   This is the canonical **sequence-verifiable-units** principle skill, the failing test first and the fix on top.
5. Run **Opening a PR**.

**Reply:** what was broken, root cause, fix, how you verified. Paste failing-then-passing repro output verbatim.
