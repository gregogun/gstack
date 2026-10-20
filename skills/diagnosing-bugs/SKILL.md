---
name: diagnosing-bugs
description: "Find the root cause of a reproducible bug: build a feedback loop that goes red on it, minimise the repro, and binary-search the cause with runtime evidence. Stops at a confirmed cause, without fixing. Use for /diagnosing-bugs, 'diagnose', 'debug this', or something broken, throwing, or failing. The go-mode Bug fix playbook runs it before the fix."
disable-model-invocation: true
---

# Diagnosing Bugs

**You own the diagnosis. Every claim traces to runtime evidence.** The deliverable is a confirmed cause, not a fix.

Be scientific. A hypothesis is not a cause until runtime evidence confirms it. When evidence refutes a hypothesis, revert whatever it motivated. Skip a step only with a stated reason.

If `GLOSSARY.md` exists, use it for a model of the modules involved, and check ADRs in the area.

## Redact

You show commands, outputs, and captured artifacts. Write `<REDACTED>` in place of every secret first. Build loops against environment variables so credentials stay out of what you show. Captured artifacts carry auth headers: quote only the lines that carry the signal. If the redacted output isn't enough to diagnose, say so.

## Steps

1. **Build a feedback loop.** Reproduce the bug yourself on the matching surface: the **control-cli** or **control-ui** skill, a test, or a script. Build it per [`references/feedback-loops.md`](references/feedback-loops.md), and don't move on until it meets the Done checklist there. Ask the user only with a specific, stated reason the surface can't reach the bug, and only after driving it as far as it goes. If it won't reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires. If you catch yourself reading code to build a theory before the loop exists, stop.
2. **Check it's the right bug.** The loop must produce the failure the user described, not a nearby one. Capture the exact symptom (error message, wrong output, timing) so the fix can be checked against it.
3. **Minimise.** Cut inputs, callers, config, data, and steps one at a time, rerunning the loop after each cut. Stop when every remaining part is load-bearing: removing any one turns the loop green.
4. **Binary-search the cause.** Seed hypotheses with the **how** skill over the affected subsystem and the **why** skill for regression history. Each hypothesis states its prediction: "if X is the cause, changing Y makes the bug disappear." A hypothesis without a prediction gets sharpened or dropped. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, and eliminate. Change one variable at a time. Drive a long or stubborn hunt with {{loop_command}}.
5. **Instrument when state is unclear.** Prefer a debugger or REPL: one breakpoint beats ten logs. Otherwise add targeted logs at the boundaries that tell hypotheses apart, never "log everything and grep". Tag every debug log with a unique prefix such as `[DEBUG-a4f2]`.
6. **Confirm the mechanism** with runtime evidence: the surviving hypothesis predicts the loop's red and green.
7. **Find the regression seam.** Name the seam where a test would exercise the real bug pattern as it occurs at the call site. If the only seams are too shallow to reproduce it, that is a finding: the architecture prevents this bug from being locked down. Say so.
8. **Clean up.** Remove every tagged debug log (grep the prefix). Delete throwaway harnesses, or move them to a clearly marked debug location. Keep the loop command, since the fix is verified against it.

## Reply

The symptom, the loop command with its red output (redacted), the minimal repro, the root cause and the evidence that confirmed it, the hypotheses ruled out, and the regression seam or its absence. Then offer to fix it with `/go-mode`, which continues from the Bug fix playbook's step 2.

## Unattended runs

When the run is unattended (CI, a schedule, or the prompt says so), nobody sees an offer. File the diagnosis as a ticket instead, on the tracker and in the template the **to-tickets** skill uses, written through the **unslop** and **technical-writing** skills. Its acceptance criteria: the loop command goes green and the original symptom is gone.

- Label it `ready-for-agent` when the cause is confirmed and the fix is clear.
- Label it `ready-for-human` when the fix needs judgment, or when step 1 would have asked the user. Say what was tried.

On GitHub, create a missing label with `gh label create <label> --force` before applying it.
