# Domain Modeling Standards and References

## Tactical Building Blocks (DDD)

- **Entity**: Possesses stable identity over time, even as attributes change. Two entities
  are equal if and only if they share identity, never by equality of field values.
- **Value Object**: Defined entirely by its attributes, immutable, lacking independent identity.
  Two instances with identical attributes are interchangeable (e.g., `Money(100, "USD")`, `Address`).
- **Aggregate**: A cluster of entities and value objects treated as a cohesive unit of
  transactional consistency. The **aggregate root** is the sole gate for state mutations;
  external objects never hold direct references to internal aggregate members.
- **Domain Event**: An immutable record of an event that has occurred in the domain,
  named in the past tense, used to communicate state changes across aggregates or bounded
  contexts without synchronous write coupling.
- **Domain Service**: Domain behavior that does not naturally belong to an individual entity
  or value object because it orchestrates multiple aggregates. Use as an exception, not
  a dumping ground for business logic.
- **Repository**: Persistence abstraction per aggregate root, not per database table —
  domain code must not assemble cross-aggregate query mutations directly.

## Bounded Context and Context Mapping

- A **bounded context** is the boundary within which a given domain model applies consistently.
  Beyond that boundary, the same term may legitimately carry a distinct model.
- Context Mapping patterns: **Partnership** (teams coordinate cooperatively),
  **Customer-Supplier** (downstream depends on upstream contract), **Conformist** (adopts
  upstream model without influence), **Anticorruption Layer** (translates at boundaries
  to isolate domain models from legacy or external schemas), **Shared Kernel** (shared subset
  of code — use with caution as it introduces change coupling).
- Always use an Anticorruption Layer (ACL) when integrating with third-party or legacy systems.

## Modeling Artifacts

- **Glossary**: Term, definition, valid bounded context, rejected synonyms (with rationale),
  and concrete usage example.
- **Scenario**: Given / When / Then format capturing preconditions, triggering commands,
  enforced invariants, resulting domain events, and new states.
- **Context Map**: Identified bounded contexts and interaction patterns between each pair.
- **Event Storming**: Collaborative timeline mapping of domain events prior to designing
  commands and aggregates.
- **ADR**: Architecture Decision Records capturing targeted architectural and domain choices.

## Guiding Questions for Model Decisions

- Who makes this decision, and which aggregate root enforces it upon write?
- What must be immediately consistent (same aggregate) vs eventually consistent (domain event + projection)?
- Which attributes always mutate together in a single transaction?
- Which bounded context provides the definitive meaning for this concept?
- Which counter-example would invalidate this model definition?

## Authoritative Documentation

- Domain-Driven Design Reference (Eric Evans): https://www.domainlanguage.com/ddd/reference/
- Implementing Domain-Driven Design (Vaughn Vernon): https://www.informit.com/store/implementing-domain-driven-design-9780321834577
- DDD Crew — Context Mapping: https://github.com/ddd-crew/context-mapping
- DDD Crew — Bounded Context Canvas: https://github.com/ddd-crew/bounded-context-canvas
- EventStorming (Alberto Brandolini): https://www.eventstorming.com/
- Architecture Decision Records: https://adr.github.io/
