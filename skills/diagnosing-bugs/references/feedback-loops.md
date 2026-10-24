# Feedback Loops

A feedback loop is one command that goes red on this bug and green once it's fixed. With a tight one, bisection, hypothesis testing, and instrumentation all just consume it. Without one, no amount of reading code will find the cause. Spend disproportionate effort here.

## Ways to build one, roughly in this order

1. **Failing test** at whatever seam reaches the bug: unit, integration, e2e.
2. **Curl or HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** that asserts on DOM, console, or network. Use Playwright for a loop that drives the page, and the `chrome-devtools` CLI for a loop that reads console or network. The **control-ui** skill sets up both.
5. **Replay a captured trace.** Save a real request, payload, or event log to disk and replay it through the code path in isolation.
6. **Throwaway harness.** Spin up the smallest subset of the system (one service, mocked dependencies) that reaches the bug with a single call.
7. **Property or fuzz loop.** For "sometimes wrong output", run 1000 random inputs and look for the failure.
8. **Bisection harness.** When the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check" so `git bisect run` can drive it.
9. **Differential loop.** Run the same input through the old and new version (or two configs) and diff the outputs.
10. **Human-in-the-loop script.** Last resort, when a human must click. Copy [`../scripts/hitl-loop.template.sh`](../scripts/hitl-loop.template.sh), edit its steps, and run it. The user follows the prompts and the captured answers come back to you.

## Tighten it

Treat the loop as a product. Once you have one:

- **Faster:** cache setup, skip unrelated init, narrow the test scope.
- **Sharper:** assert on the specific symptom, not "didn't crash".
- **More deterministic:** pin time, seed randomness, isolate the filesystem, freeze the network.

A 30-second flaky loop is barely better than none. A 2-second deterministic one finds the bug.

## Non-deterministic bugs

The goal is a higher reproduction rate, not a clean repro. Loop the trigger 100 times, run in parallel, add stress, narrow timing windows, inject sleeps. A 50% flake is debuggable and a 1% flake is not, so keep raising the rate.

## Done

The loop is done when you can name one command that you have already run, with its output shown (redacted), and that is:

- [ ] **Red-capable:** it drives the real bug path and asserts the user's exact symptom.
- [ ] **Deterministic:** the same verdict every run, or a pinned, high rate for a flaky bug.
- [ ] **Fast:** seconds, not minutes.
- [ ] **Agent-runnable:** it runs unattended, or through the human-in-the-loop script.
