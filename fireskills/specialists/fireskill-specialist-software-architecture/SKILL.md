---
name: fireskill-specialist-software-architecture
description: "Analyze and evolve architecture using boundaries, dependency direction, measurable quality attributes, ADRs, operational cost, migration paths, and trade-offs between modular monoliths and distributed services. Use for modularization, coupling, scalability, resilience, or expensive-to-reverse decisions; do not use for local renames without structural impact or for deciding a single domain boundary (use `$fireskill-specialist-domain-modeling` first)."
---

# Software Architecture

## When to Use

- Trigger for decisions carrying high reversal cost: introducing a new service,
  message queue, distributed cache, changing module boundaries, or altering structural
  dependency direction.
- Also trigger when a quality attribute (latency, availability, consistency,
  capacity) must become an explicit decision criterion.
- Do not trigger to rename, move files, or refactor locally without boundary
  impact — that is everyday maintenance, not an architectural decision.
- Run `$fireskill-specialist-domain-modeling` first when the boundary in question
  belongs to an unmodeled domain concept — architecture decides where to place a
  boundary already established by domain modeling, not invent it out of thin air.

## Workflow

1. Define system purpose, real constraints (budget, timeline, team capacity), and
   measurable quality attribute scenarios (avoid subjective adjectives like "scalable").
2. Map the observed state: data owners, existing dependencies between modules/services,
   critical runtime flows, and where active friction exists.
3. Identify competing architectural forces, decisions that would be expensive to
   reverse later, and risks inherent to each path.
4. Compare alternatives using identical criteria (scenarios from step 1) and realistic
   operational cost — network overhead, distributed consistency, extra observability,
   and multi-team coordination.
5. Select the smallest architecture that satisfies the defined scenarios — the simplest
   option meeting quality attributes wins by default.
6. Define transition plans: migration backwards compatibility, regression observability,
   and a viable rollback path.
7. Document the decision (ADR) and verify proposed boundaries using automated dependency
   tests or static analysis where possible.

## Patterns

- Assign each module explicit responsibilities, data ownership, and public interfaces
  — a module without an explicit contract introduces implicit coupling for consumers.
- Direct dependencies from volatile policies toward stable policies (dependency rule):
  business domain code must not depend on framework/infrastructure details; the
  inverse is healthy architecture.
- Avoid introducing services, queues, caches, or abstraction layers without a real,
  measurable consumer scenario justifying them — speculative abstractions incur
  permanent maintenance costs for hypothetical benefits.
- Explicitly distinguish implemented architecture (what exists today) from target
  architecture (the migration destination) — treating them as identical obscures
  debt and unfinished work.
- Express every quality attribute as a measurable scenario: stimulus, source,
  environment, artifact, expected response, and response measure (e.g., "under
  200 req/s, p99 < 300ms"), never as detached adjectives.
- Keep easily replaceable decisions local and reversible, making explicit (ADR)
  only decisions that are truly expensive to alter later.
- Evolve architecture through verifiable, incremental seams (strangler fig,
  expand/contract) rather than ground-up rewrites — full rewrites rarely ship on
  schedule and lose institutional knowledge embedded in current systems.

## Anti-Patterns

- Adopting microservices because "it is industry standard" without concrete scale,
  team independence, or autonomous deployment requirements — distributed consistency
  and operational overhead are real and immediate; benefits remain hypothetical
  until the scenario materializes.
- Big ball of mud: modules lacking boundaries or defined dependency directions, where
  any component can invoke any other component directly.
- Big design up front without measurable quality scenarios — "future-proof" architecture
  unbacked by concrete stimuli tends to solve the wrong problems and locks reversible
  decisions prematurely.
- Adding generic indirection layers "for future flexibility" when only a single
  consumer exists today — incurs complexity overhead long before any evidence shows
  flexibility will ever be needed.

## Validation

- Critical execution paths, failure modes, consistency constraints, and capacity
  limits evaluated against defined scenarios, not just happy paths.
- Architecture or dependency tests (where runtime/tooling supports) enforcing
  approved dependency directions.
- Migration rehearsal: backward compatibility verified during transition, rollback
  plan tested rather than merely documented.
- Security, data integrity, and operational impacts reviewed as part of the decision,
  never as post-implementation reflections.
- Do not declare an architecture "scalable" or "resilient" without measurable scenarios
  and verifiable evidence — absolute statements without proof are forbidden.

## Related Skills

- `$fireskill-specialist-technical-research` gathers primary evidence when decisions
  depend on third-party capacity, limits, or compatibility.
- `$fireskill-specialist-domain-modeling` to establish domain concept boundaries
  before finalizing service or module boundaries.
- `$fireskill-specialist-delivery-engineering` for rollout and rollback execution
  of architectural migrations.
- `$fireskill-specialist-performance-engineering` when the contested quality attribute
  concerns latency or capacity under load.
- `$fireskill-specialist-code-review` to verify that implemented code respects boundaries
  established here.

Read [references/standards.md](references/standards.md) for architectural
views, ADR templates, quality attribute scenarios, and primary sources.
