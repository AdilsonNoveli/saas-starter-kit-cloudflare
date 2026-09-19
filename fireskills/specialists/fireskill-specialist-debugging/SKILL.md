---
name: fireskill-specialist-debugging
description: Diagnose bugs, regressions, intermittent test flakiness, and performance bottlenecks through minimal reproduction, falsifiable hypotheses, and targeted instrumentation down to root mechanism. Use when diagnosing or reporting broken system behavior, including flaky tests or performance degradation; do not modify code if only diagnosis was requested; do not use to optimize correctly working systems without symptoms (use `$fireskill-specialist-performance-engineering`).
---

# Debugging and Diagnosis

## When to Use

- Trigger when observed behavior diverges from expectations, with or without an established reproduction.
- Trigger for intermittent ("flaky") test failures, post-deploy regressions, or performance
  degradation with concrete symptoms (timeouts, error spikes, reported latency).
- Do not trigger to optimize correctly functioning systems without symptoms — that is
  governed by `$fireskill-specialist-performance-engineering`, which starts from an SLO rather than a defect.
- Combine with `$fireskill-specialist-observability` when production environments lack sufficient telemetry.

## Workflow

1. Capture expected behavior, observed behavior, exact environment, and timestamp/frequency
   of occurrences — without this, hypotheses remain mere guesses.
2. Build a reliable reproduction script or, when direct reproduction is unviable, identify
   a repeatable observable signal (logs, metrics, distributed traces) correlating with the failure.
3. Minimize input payloads, participating components, and time windows down to the smallest
   case reproducing the issue — each removed factor eliminates a hypothesis variable.
4. Formulate falsifiable hypotheses ordered by testability and probability given symptoms.
5. Instrument the most discriminative boundary between competing hypotheses — the precise
   point where hypothesis A predicts value X while hypothesis B predicts value Y.
6. Identify root cause, blast radius (isolated path vs entire class of calls), and the
   exact mechanism generating the symptom.
7. If authorized to remediate, apply the minimal change eliminating root cause and add
   an automated regression test that fails when the fix is removed.

## Core Rules

- Vary only one candidate cause at a time — changing multiple factors simultaneously
  invalidates causal attribution when symptoms disappear.
- Distinguish temporal correlation from causality: "started after deploy X" is a clue,
  not proof, until the mechanism is isolated.
- Preserve diagnostic evidence (logs, dumps, heap snapshots) prior to restarting processes
  or clearing state.
- Compare working and failing environments systematically: identical version, config,
  data, load, and operation ordering, varying one factor per run.
- Treat flakiness as an indicator of concurrency races, timing assumptions, shared state,
  or unisolated external dependencies — never dismiss as "just re-run the CI".
- Remove temporary or verbose instrumentation before closing diagnostics.
- Describe root causes at the mechanism level ("a race condition between X and Y allows
  reads before writes commit"), never merely at symptom level ("fails intermittently").

## Antipatterns

- Applying shotgun changes hoping something works without isolating the cause.
- Fixing symptoms at call sites while leaving the corrupted state generator intact.
- Dismissing intermittent test failures as environmental noise without investigation.
- Modifying production state destructively during active incident diagnosis.

## Validation

- Reproduction case reliably fails on the unfixed codebase and reliably passes after applying remediation.
- Added regression test specifically targets the failure mechanism and asserts expected domain behavior.
- Clean removal of all debug logs, breakpoints, and temporary profiling hooks.
