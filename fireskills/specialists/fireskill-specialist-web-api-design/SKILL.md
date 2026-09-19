---
name: fireskill-specialist-web-api-design
description: "Design and review HTTP APIs with resources, methods, status codes, errors, pagination, idempotency, concurrency, authentication, and backwards-compatible evolution. Use for REST, JSON APIs, webhooks, or OpenAPI; never blindly apply REST patterns to RPC without evaluating real contract requirements."
---

# Web API Design

## When to Use

- Trigger when designing or reviewing HTTP, REST, JSON API contracts, webhooks, or
  OpenAPI specifications for internal or external consumers.
- Trigger for decisions regarding resource modeling, HTTP methods, status codes,
  structured errors, pagination, idempotency, concurrency, authentication, and API versioning.
- Do not trigger for RPC protocols or event schemas treating them as generic HTTP resources
  without confirming the actual architectural contract style.
- Combine with `$fireskill-specialist-application-security` for threat modeling,
  credential handling, rate-limiting abuse, and trust boundaries.

## Workflow

1. Discover consumers, use cases, existing architectural styles, request volume,
   latency budgets, availability targets, trust boundaries, and compatibility policies.
2. Model resources, identifiers, entity relationships, business invariants, and ownership
   without exposing internal database schemas or ORM entities as public contracts for convenience.
3. Define operations, schemas, headers, status codes, and Problem Details; document
   explicit retry semantics per operation using [references/standards.md](references/standards.md).
4. Design authentication, resource-level and tenant-level authorization, idempotency,
   preconditions, and optimistic concurrency before implementing route handlers.
5. Specify cursor/offset pagination, query filters, deterministic sorting, payload size limits,
   rate limiting, and handling of mutating underlying data.
6. Materialize OpenAPI/JSON Schema specifications and executable contract tests covering
   positive, negative, and backwards-compatibility test suites against the implementation.
7. Define structured logging, telemetry metrics, correlation headers, deprecation schedules,
   migration plans, and sunset policies to decommission legacy behavior safely.

## Patterns

- Adhere to coherent HTTP semantics and specific standard status codes.
- Maintain stable, actionable error formats that never leak internal stack traces or secrets.
- Use cursor-based pagination whenever underlying datasets mutate during extended traversals.
- Ensure safe creation and automated retry flows using idempotency keys.
- Secure webhooks with cryptographic payload signatures, timestamps, replay defense, and retry policies.
- Prevent silent breaking changes and avoid ambiguous field semantics.
- Never expose persistence schemas as external API contracts for convenience.

## Anti-Patterns

- Responding with `200 OK` for every request and encoding failures solely in response bodies;
  caches, API gateways, and observability tooling lose standard protocol semantics.
- Repeating POST requests after network timeouts without idempotency keys or reconciliation;
  lost responses can duplicate billing charges, order submissions, or side effects.
- Paginating via simple offsets across large, rapidly changing datasets without stable sort keys;
  results in duplicated or skipped items between pages.
- Enforcing authorization solely at the endpoint or list level rather than checking loaded resources;
  allows valid IDs to cross tenant boundaries or access control scopes.
- Versioning URLs for every minor additive change; multiplies active surface contracts
  without solving backwards compatibility discipline.

## Validation

- Execute contract tests validating requests, responses, headers, and Problem Details
  against positive and negative examples declared in the OpenAPI specification.
- Prove tenant-level and resource-level authorization boundaries using valid identity,
  cross-tenant identity, expired credentials, and insufficient scopes.
- Simulate network retries, duplicate requests, post-commit timeouts, concurrent update races,
  and pagination traversal while records are inserted and deleted.
- Run structural linters and validators across OpenAPI and JSON Schema definitions,
  verifying backwards compatibility against published versions.
- Never declare compatibility or idempotency without replay test evidence and automated
  contract test suites verifying the consumer perspective.

## Related Skills

- `$fireskill-specialist-application-security` covers threat modeling, OAuth, secret
  management, abuse defense, and trust boundaries.
- `$fireskill-specialist-domain-modeling` defines domain vocabulary and business invariants
  before exposing them as API resources.
- `$fireskill-specialist-typescript` models internal type systems without blindly exposing
  them as public contracts.
- `$fireskill-specialist-observability` defines telemetry and SLO monitoring beyond contract
  correlation headers.
- `$fireskill-specialist-performance-engineering` measures API throughput and latency without
  compromising semantic integrity for synthetic benchmarks.

Read [references/standards.md](references/standards.md) for method matrices,
error handling, idempotency, concurrency, pagination, webhooks, and compatible evolution.
