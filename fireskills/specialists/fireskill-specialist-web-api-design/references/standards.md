# HTTP API Standards

## Resources, Methods, and Preconditions

| Intent | Method / Contract | Key Semantic Property |
| --- | --- | --- |
| Read representation | `GET` | Safe, idempotent, and cacheable according to headers |
| Replace known state | `PUT` | Idempotent; complete representation defined |
| Partially update | `PATCH` | Patch format and idempotency semantics must be declared |
| Create / Process command | `POST` | Protect with idempotency when side effect is non-idempotent |
| Delete resource | `DELETE` | Intended effect is idempotent; responses may vary |

Use `If-Match` with ETags or equivalent preconditions when concurrent edits must not
silently overwrite each other. Respond with `412 Precondition Failed` when preconditions
fail, and `428 Precondition Required` only when server policy strictly mandates conditional updates.

## Status Codes and Error Handling

- `201 Created`: Resource successfully created, providing `Location` header when it has its own URI.
- `202 Accepted`: Asynchronous request accepted; provide polling status or tracking link.
- `204 No Content`: Successful execution yielding no representation body; never send payload.
- `400 Bad Request`: Malformed syntax or generically invalid request.
- `401 Unauthorized`: Missing or invalid authentication; supply `WWW-Authenticate` challenge when applicable.
- `403 Forbidden`: Authenticated identity lacks authorization for the requested resource.
- `404 Not Found`: Resource does not exist, or hidden by uniform access policy.
- `409 Conflict`: Conflict with current resource state that the client can resolve.
- `422 Unprocessable Content`: Request syntax understood, but semantically invalid.
- `429 Too Many Requests`: Rate limit exceeded; include `Retry-After` header when known.

Model error responses using RFC 9457 Problem Details with stable `type`, `title`,
`status`, sanitized `detail`, and optional `instance` URIs. Extensions provide domain
error codes, field-level validation errors, and trace correlation IDs; never leak
stack traces, internal SQL statements, or secrets.

## Idempotency and Retries

For non-idempotent POST operations with external side effects:

1. Client generates a high-entropy idempotency key representing the unique intent;
2. Server binds the key to client identity, operation name, and payload fingerprint/hash;
3. Equivalent replays receive the previously computed and cached response;
4. Replays with mismatched payloads fail explicitly with validation errors;
5. Concurrent requests sharing the same key are serialized or rejected with conflict errors;
6. Key retention duration and expiration policies are clearly documented.

Always test network scenarios where transactions commit on the server but responses are lost.
Transport retries must never cause duplicate side effects.

## Pagination, Filtering, and Sorting

- Order by deterministic, unique sort keys; append primary `id` as tiebreaker.
- Cursors must encode position/sorting, remain opaque to consumers, and be validated
  against contradictory filter parameters.
- Define default and maximum `limit` bounds, sort direction, and invalid cursor handling.
- Do not provide exact record totals when database costs or consistency guarantees
  make it unsustainable; provide approximate indicators instead.
- Define syntax, types, and strict allowlists for query filters; never expose raw SQL expressions.
- Test record insertions, updates, and deletions occurring between paginated requests.

Offset-based pagination is acceptable only for small, static datasets or views where
eventual inconsistency is tolerated. Never choose it solely for query convenience.

## Authorization and Data Exposure

- Authorize the loaded entity and concrete action, not merely the route endpoint.
- Include tenant/organization scoping in database lookups or enforce equivalent row-level security.
- Use explicit request/response field allowlists to prevent mass-assignment vulnerabilities
  and accidental internal data leakage.
- Explicitly differentiate authentication, authorization, entitlement, and data ownership.
- Normalize error responses for sensitive resources when differing between 403 and 404
  would leak resource existence.

## Webhooks

- Cryptographically sign the raw request body with a versioned secret and HMAC algorithm.
- Include unique event IDs and timestamps; enforce clock-drift tolerance and replay protection.
- Consumer deduplicates incoming events by ID and processes them idempotently.
- Webhook delivery uses short timeouts, exponential backoff retries, and dead-letter expiration.
- Event sequence cannot be assumed without explicit guarantees; payloads should include
  event versions and sufficient identity to reconcile out-of-order deliveries.
- Support seamless secret rotation with overlapping key validity windows.

## Backwards-Compatible Evolution

Generally additive and safe:

- Introducing new endpoints or operations;
- Adding optional fields in responses (when consumers tolerate unknown fields);
- Adding enum values (only when clients handle open/extensible enums).

Potentially breaking:

- Removing or renaming fields or operations;
- Making optional request fields required, or tightening validation constraints;
- Altering units, timezones, sorting order, or `null` semantics;
- Adding enum values when consumers use exhaustive pattern matching;
- Modifying authorization rules, retry semantics, or consistency guarantees.

Publish clear deprecation notices, monitor client telemetry, provide migration paths,
and enforce sunset schedules. Run automated OpenAPI diff tools and consumer contract
tests before decommissioning endpoints.

## Minimum Verification Proof

- OpenAPI 3.1 and JSON Schemas validating positive and negative payload examples;
- Contract tests verifying status codes, headers, Problem Details, and parameter limits;
- Automated replay and concurrency tests demonstrating idempotency;
- Cross-tenant authorization tests verifying isolation;
- Pagination coherence verified during concurrent dataset mutations;
- Schema diff classification verifying breaking vs non-breaking changes;
- Structured logs correlating request IDs without logging sensitive credentials or tokens.

## Primary Sources

- HTTP Semantics, RFC 9110: https://www.rfc-editor.org/rfc/rfc9110
- HTTP Caching, RFC 9111: https://www.rfc-editor.org/rfc/rfc9111
- Problem Details, RFC 9457: https://www.rfc-editor.org/rfc/rfc9457
- Conditional Requests, RFC 9110: https://www.rfc-editor.org/rfc/rfc9110#section-13
- OpenAPI 3.1: https://spec.openapis.org/oas/v3.1.0
- JSON Schema: https://json-schema.org/specification
- OAuth 2.0 Security BCP, RFC 9700: https://www.rfc-editor.org/rfc/rfc9700
- Idempotency-Key draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- CloudEvents: https://cloudevents.io/
