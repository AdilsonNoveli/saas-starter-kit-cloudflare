---
name: fireskill-specialist-application-security
description: "Model threats and review application security across APIs, authentication, authorization, data storage, dependencies, secrets, and infrastructure. Use for changes involving trust boundaries, identity, external input, sensitive data, or security audits; use for threat modeling before introducing a new attack surface; never declare security without evidence, and use `$fireskill-specialist-delivery-engineering` for pipeline hardening and deployment credential security."
---

# Application Security

## When to Use

- Trigger when changes introduce or modify trust boundaries, identity, external inputs
  (uploads, URLs, query parameters, deserialization), or sensitive data.
- Trigger prior to designing features with new attack surfaces (new public endpoints,
  third-party integrations, new user roles) to perform proactive threat modeling.
- Do not trigger as a substitute for deployment pipeline credential audits — use
  `$fireskill-specialist-delivery-engineering` for CI/CD hardening; focus here is on application code and stored data.
- Combine with `$fireskill-specialist-postgres`, `$fireskill-specialist-trpc`, and
  `$fireskill-specialist-nuxt-authorization` when risks involve tenant data isolation or procedure authorization.
- Combine with `$fireskill-specialist-openauth` for session handling, cookies, MFA, and credentials,
  and with `$fireskill-specialist-sst` for stage-specific secrets.

## Workflow

1. Map assets, actors, trust boundaries, external inputs, and side effects (state mutations)
   before selecting controls.
2. Define plausible threats and actual business impact before choosing controls — do not
   implement defenses against threats irrelevant to the system context.
3. Verify authentication, object-level authorization (not merely route-level), and tenant
   isolation on every read and write operation.
4. Validate all inputs by type, length, format, and destination; encode outputs according to
   rendering contexts; protect state-changing endpoints against replay and CSRF where applicable.
5. Review secrets management, encryption in transit and at rest, session lifecycles,
   vulnerable dependencies, and production configuration.
6. Implement both positive tests (authorized flows succeed) and negative tests (unauthorized
   flows fail predictably) across critical boundaries.
7. Document residual risks, owners, associated observability signals, and incident response
   plans — no system is "100% secure", only operating under known, monitored risk.

## Core Rules

- Deny by default and grant least privilege for each identity and operation.
- Authorize on the server for every operation and every accessed object — never rely on
  client-side checks or client-provided resource IDs without re-validating ownership/tenant.
- Treat file uploads, user-supplied URLs, templates rendering external data, dynamic queries,
  and deserialization as hostile inputs by default.
- Never write bespoke cryptography; use vetted, established cryptographic primitives.
  Never log secrets, tokens, passwords, or sensitive PII, even in debug environments.
- Rotate credentials regularly and prefer ephemeral credentials (short-lived tokens, STS/OIDC)
  over long-lived static secrets.
- Mitigate abuse with actor- and resource-level limits (rate limits per user/API key/tenant),
  not merely per IP — shared NAT/proxies penalize legitimate users while attackers bypass IP limits easily.
- When remediating a vulnerability, fix the root cause and add regression tests without
  disclosing exploitation details beyond what is required for verification.

## Antipatterns

- Authorizing only at the route level (`/admin/*`) without verifying object ownership:
  allows IDOR where tenant A accesses `/api/orders/123` of tenant B by altering IDs.
- Validating inputs only in client-side JavaScript: direct API requests completely bypass client validation.
- Trusting client-declared `Content-Type` or file extensions for file uploads.
- Storing secrets in environment variables without process/log access controls, or logging
  entire request payloads containing bearer tokens.
- Claiming a system is "secure" or a vulnerability is "resolved" without negative automated tests.

## Validation

- Negative test cases: unauthenticated access, incorrect identity, cross-tenant access,
  and replayed requests — all must fail predictably and safely.
- Vulnerability scanning (SCA) and secret detection run as standard development gates.
- Secure production configuration: security headers (`Content-Security-Policy`,
  `Strict-Transport-Security`), cookie attributes (`HttpOnly`, `Secure`, `SameSite`),
  and restricted CORS origins.
- Concrete evidence for each claimed control and documented residual risk.

## Related Specialists

- `$fireskill-specialist-code-review` for broader review and `$fireskill-specialist-observability`
  for abuse signals without PII leaks.
- `$fireskill-specialist-postgres` and `$fireskill-specialist-drizzle` for tenant isolation
  at the data layer (`teamId` constraints and filters).
- `$fireskill-specialist-delivery-engineering` for pipeline credentials, artifact signing,
  and supply chain security.
- `$fireskill-specialist-web-api-design` when security risks stem from API contract design.

Read [references/standards.md](references/standards.md) for threat modeling checklists by boundary,
ASVS, API security, and supply chain standards.
