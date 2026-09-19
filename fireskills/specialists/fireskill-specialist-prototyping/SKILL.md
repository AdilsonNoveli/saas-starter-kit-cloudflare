---
name: fireskill-specialist-prototyping
description: "Build disposable prototypes to answer specific technical, interaction, or visual questions with minimum sufficient fidelity and without inheriting technical debt into production. Use for spikes, proofs of concept, and exploring alternatives before expensive decisions; never promote prototype code to production without full reimplementation and validation; do not use when the question already has documented answers, use `$fireskill-specialist-technical-research` for that."
---

# Prototyping

## When to Use

- Trigger when there is a specific technical, interaction, or visual question
  that only an executable artifact (not a document) can answer with confidence.
- Also trigger to compare two or more concrete alternatives before making an
  expensive-to-reverse decision.
- Do not trigger when the question already has documented answers in primary
  sources — in that case, `$fireskill-specialist-technical-research` resolves it
  faster and without the cost of building anything.
- Never promote prototype code directly to production — the reduced fidelity of
  the prototype (no test coverage, missing error handling, omitted security) is a
  deliberate choice valid only while it remains disposable.

## Workflow

1. Formulate a single question and the decision criteria before writing any
   code — without this, prototyping turns into endless aimless exploration.
2. Define what needs to be real (the mechanism under test) and what can be simulated
   or mocked (everything that does not affect the answer to the question).
3. Choose the minimum sufficient fidelity, an explicit timebox, and a clearly
   disposable location inside or outside the repository.
4. Build more than one alternative when direct side-by-side comparison provides
   more insight than testing a single option against expectations.
5. Execute the planned scenario and collect observable evidence — not subjective
   impressions of "it feels like it works".
6. Explicitly answer the original question (accepted, rejected, or inconclusive)
   and document the limitations of what was tested.
7. Discard the prototype or explicitly archive it as non-production, leaving zero
   runtime dependencies pointing to it.

## Patterns

- Do not mistake a convincing demo for a valid architecture — a prototype that
  "works in a demo" has proven nothing about concurrency, scale, error scenarios,
  or security that was not deliberately exercised.
- Keep real customer data, production credentials, and live production integrations
  out of the prototype, unless the question itself strictly requires testing against
  the real system (and even then, with explicit authorization and bounded scope).
- For interface prototypes, use realistic content (never "lorem ipsum") and extreme
  states (very long strings, empty lists, error states) — UI questions rarely concern
  the happy path alone.
- For logic/state prototypes, expose transitions and invariants in a minimal interface
  (CLI, executable test) that makes them observable, rather than hiding them behind
  an unnecessary full UI.
- Do not spend time on abstractions, test coverage, or visual polish beyond what the
  question demands — this opposes the fundamental purpose of prototyping.
- Mark code as disposable in ways that prevent accidental imports by production
  code (isolated directory, unambiguous naming, no public exports).
- Convert all relevant learnings into requirements, documented decisions, or tests
  in the proper canonical location (spec, ADR, backlog) — the prototype itself is
  not a source of truth once discarded.

## Anti-Patterns

- Leaving "temporary" prototype code running in production because "it worked" —
  without the full validation (security, error handling, scale) deliberately omitted,
  it carries invisible risk into production.
- Testing multiple questions simultaneously in the same prototype — when the result
  is ambiguous, it is impossible to isolate which variable caused what.
- Investing in visual polish or architecture "just in case" when the question was
  purely about the technical feasibility of a mechanism.
- Silently inheriting prototype debt: reusing prototype files as the base for
  production code without rewriting them to standard quality requirements.

## Validation

- Decision criteria were defined prior to execution, and results are reproducible
  by another person executing the same scenario.
- The original question has an explicit answer: hypothesis accepted, rejected,
  or inconclusive (and in that case, what is required to decide).
- Prototype limitations and differences relative to production requirements are
  explicitly documented.
- No prototype artifact remains connected to the final runtime — verified, not
  merely assumed.
- Do not declare an approach "production-ready" based solely on a prototype — that
  requires full implementation and validation according to project standards.

## Related Skills

- `$fireskill-specialist-technical-research` when the question can be answered by
  primary sources without building anything.
- `$fireskill-specialist-domain-modeling` when the prototype reveals an unmodeled
  domain concept — the learning becomes a model, not trapped in disposable code.
- `$fireskill-specialist-ux-design` or `$fireskill-specialist-ui-design` when the
  prototype involves interface flows or visual hierarchy beyond the immediate spike.

Read [references/standards.md](references/standards.md) for fidelity levels
by question type, output format, and official sources.
