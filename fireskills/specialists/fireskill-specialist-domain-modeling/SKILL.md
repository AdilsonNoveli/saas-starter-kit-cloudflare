---
name: fireskill-specialist-domain-modeling
description: Discover and refine ubiquitous domain language, invariants, events, aggregates, and bounded contexts from concrete scenarios, avoiding anemic domain models. Use when domain terms, rules, or data ownership are ambiguous, when teams use the same word with conflicting meanings, or when model boundary decisions are required; do not create shadow documentation parallel to the canonical spec; do not use for infrastructure or deployment topologies (use `$fireskill-specialist-software-architecture`).
---

# Domain Modeling

## When to Use

- Trigger when domain terminology is ambiguous, two subdomains use identical words with
  different meanings, or business rules lack clear aggregate ownership.
- Trigger prior to designing new entities when entity, value object, event, or projection
  distinctions are unclear.
- Do not trigger to determine service topologies, database engines, or infrastructure —
  that belongs to `$fireskill-specialist-software-architecture`. Domain modeling informs
  architecture; it does not replace it.
- Combine with `$fireskill-specialist-software-architecture` when new bounded contexts imply
  new service or data boundaries.

## Workflow

1. Identify actors, objectives, commands issued, domain events that have occurred,
   and invariants governing state transitions.
2. Capture terminology used by real domain experts — not legacy table or class names —
   and expose false synonyms and semantic collisions.
3. Construct concrete scenarios: happy paths, edge boundaries, failure modes, and temporal
   effects (delayed, duplicate, or out-of-order commands).
4. Formulate each invariant as an assertion that must always hold true, assigning ownership
   to the aggregate capable of enforcing it atomically.
5. Group behaviors that must mutate together and maintain immediate transactional consistency —
   this defines aggregate boundaries, not query convenience.
6. Test proposed boundaries against cross-boundary interactions: if an invariant requires
   coordinating two aggregates without eventual consistency, boundaries are misplaced.
7. Update domain glossaries, context maps, and ADRs in the project's canonical documentation —
   never maintain disconnected model documentation.

## Core Rules

- Name concepts using domain vocabulary (ubiquitous language), never technical layers
  ("Manager", "Handler", "Processor" are implementation artifacts, not domain models).
- Distinguish Entities (identity + lifecycle), Value Objects (immutable, defined by value),
  Domain Events (immutable historical facts, named in the past tense), and Projections (derived read models).
- Keep each invariant inside the aggregate capable of enforcing it atomically — invariants
  spanning multiple aggregates without distributed coordination fail under concurrency.
- Never expand aggregates merely to simplify queries; use read projections for complex queries.
- Isolate bounded contexts when the same concept carries legitimate, conflicting models
  (e.g., "Customer" in Sales vs "Customer" in Support).
- Name events in the past tense (`OrderConfirmed`) and commands in the imperative (`ConfirmOrder`).
- Validate every definition with both a positive conforming example and a violating counter-example.

## Antipatterns

- Anemic Domain Models (entities with getters/setters and procedural service classes).
- Database-driven domain design where database table schemas dictate domain logic.
- Leaking infrastructure types (HTTP request, database row) into core domain aggregates.
- Cross-aggregate transactional mutations in a single transaction.

## Validation

- Domain model tests execute purely in-memory without database or HTTP mocks.
- Invariants are rigorously tested with negative assertions proving illegal state transitions throw domain errors.
- Ubiquitous language is verified with domain stakeholders.
