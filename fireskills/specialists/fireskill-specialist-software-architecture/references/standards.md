# Architecture Standards and References

## C4 Model Views, from Highest to Lowest Level

- **Context**: The system as a single black box, along with actors and external systems
  exchanging data with it. Answers "what is this and who uses it".
- **Containers**: Deployable and executable runtime units (services, databases, SPAs,
  message brokers) and how they communicate (protocols, sync/async).
- **Components**: Within a single container, the key internal modules and their
  responsibilities — the level where dependency direction matters most.
- **Code**: Classes and functions — typically generated directly from source code
  when local complexity justifies it, rarely maintained manually.

Additional views as decisions warrant: **Data** (ownership, consistency model, lifecycle/retention)
and **Deployment** (processes, nodes, networks, infrastructure dependencies). arc42 provides
an equivalent comprehensive architecture documentation template organized in 12 sections.

## Quality Attributes as Scenarios, Not Adjectives

SEI Quality Attribute Scenario format: **stimulus** (what occurs) + **source** (who/what
generates the stimulus) + **environment** (system condition at that moment) + **artifact**
(system portion affected) + **response** (what the system must do) + **response measure**
(quantitative metric to verify).

Example: "Under 200 concurrent requests/s (stimulus, source: real production traffic),
in normal operation (environment), the checkout service (artifact) processes the request
(response) with p99 latency below 300ms and error rate below 0.1% (response measure)."
Without these six components, a quality attribute cannot be verified — it remains subjective opinion.

## Dependency Rule and Coupling

- Dependencies must point from volatile policies (UI, web framework, database drivers)
  toward stable policies (business rules) — never the inverse. Core tenet of Clean
  Architecture, Hexagonal Architecture, and Ports & Adapters.
- Coupling via explicit contracts (interfaces, events, versioned schemas) is sustainable;
  coupling via implementation (direct imports of internal details across modules) fails
  to scale past a single team.
- Cohesion: things that change for the same reason belong together; things that change
  for different reasons must remain decoupled (Single Responsibility Principle at the
  module level, not just class level).

## Modular Monolith vs. Distributed Services

- Distributed services introduce real and immediate operational costs: eventual consistency
  across boundaries, network latencies, mandatory distributed tracing, coordinated deployments,
  and cross-team schema versioning.
- These costs are justified only when real scenarios demand them: autonomous deployments
  per team, heterogeneous scaling profiles, or strict failure domain isolation between
  mission-critical domains.
- A modular monolith with clear internal boundaries (modules exposing public interfaces,
  forbidding cross-boundary internal imports) delivers most isolation benefits without
  network tax — it is the recommended default starting point until proven otherwise.
- Team Topologies adds the organizational dimension: service boundaries should align
  with team boundaries capable of owning them end-to-end (stream-aligned teams); a service
  without an explicit team owner becomes an operational orphan.

## ADR (Architecture Decision Record) Format

Context (competing forces) → Options Considered → Decision → Consequences (including
trade-offs and drawbacks) → Supporting Evidence → Transition Plan → Reversal Triggers
(conditions justifying future revisit). An ADR does not replace diagrams (showing structure)
or tests (proving behavior) — it preserves the architectural rationale behind structural choices.

## Official Sources

- C4 Model: https://c4model.com/
- arc42 (architecture template): https://docs.arc42.org/
- Architecture Decision Records: https://adr.github.io/
- SEI Quality Attribute Scenarios: https://www.sei.cmu.edu/library/applicability-of-general-scenarios-to-the-architecture-tradeoff-analysis-method/
- Team Topologies: https://teamtopologies.com/key-concepts
- The Clean Architecture (dependency rule): https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- RFC 2119 (normative language in technical specifications): https://www.rfc-editor.org/rfc/rfc2119
