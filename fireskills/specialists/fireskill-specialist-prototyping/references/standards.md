# Prototyping Standards and References

## Fidelity by Question Type

- **State/Logic Question** ("does this state machine cover all valid transitions?"):
  terminal or executable tests that make state transitions and invariants visible step
  by step — requires zero UI.
- **Integration Question** ("does this third-party API behave as documented under our load?"):
  isolated spike against a sandbox, provider staging environment, or controlled fake,
  never against third-party production without explicit authorization.
- **UI Structure Question** ("does this screen flow resolve the user task?"):
  navigable wireframe with realistic content — low visual fidelity, high flow fidelity.
- **Visual Direction Question** ("which aesthetic direction best communicates the brand?"):
  two or more deliberately distinct alternatives, never subtle variations of the same
  concept — subtle variations do not discriminate real preference.
- **Performance Feasibility Question** ("does this mechanism sustain expected load?"):
  minimal benchmark with a workload representative of real production (volume, concurrency,
  payload size), not an arbitrary synthetic test.

Choosing higher fidelity than the question requires is waste; choosing lower fidelity
produces an ungrounded answer.

## What Differs Between Prototype and Production

A prototype deliberately omits, until proven otherwise: comprehensive error handling,
real authentication/authorization, observability instrumentation, full test coverage,
complete web accessibility, cross-browser/device compatibility, and security hardening.
None of these can be assumed resolved just because the prototype functioned — each
requires the standard production engineering effort before production deployment.

## Prototype Output Format

Question → Hypothesis → Setup (what was real vs simulated) → Observation (collected
evidence, not impressions) → Decision (accepted, rejected, inconclusive) → Limitations
(what was unexercised) → Next Step (who decides what from here).

The prototype report never becomes a competing normative source alongside the project
spec — key learnings are integrated into the spec, ADR, or backlog, and the report itself
can be archived or discarded along with the prototype code.

## Primary and Official Sources

- GOV.UK Service Manual — Making prototypes: https://www.gov.uk/service-manual/design/making-prototypes
- W3C WAI — Planning and Managing: https://www.w3.org/WAI/planning/
- Martin Fowler — Technical Debt (the cost of inheriting prototype code): https://martinfowler.com/bliki/TechnicalDebt.html
- Scaled Agile Framework — Spikes: https://framework.scaledagile.com/spikes
