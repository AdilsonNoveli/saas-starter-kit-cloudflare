---
name: fireskill-specialist-cloudflare-workers
description: Write and review Cloudflare Workers runtime code in Nuxfire — bindings (Hyperdrive, KV, R2, D1, Queues, Durable Objects, service bindings), waitUntil, cron triggers, queues with DLQ, per-request I/O boundaries, and nodejs_compat. Use when touching `apps/functions/src/*`, `apps/app/server/plugins`, `server/utils/db.ts`, or any code accessing `env`/`event.context.cloudflare`; infrastructure provisioning and deployments belong to `$fireskill-specialist-sst`.
---

# Cloudflare Workers

> Memory of Cloudflare APIs and runtime limits degrades over time. Verify against official documentation and generated TypeScript types before asserting behavior, quota limits, or signatures. This specialist documents **how Nuxfire operates** on this runtime.

## When to Use

- Activate when creating or modifying Worker handlers (`fetch`, `queue`, `scheduled`), Nitro plugins reading `event.context.cloudflare`, storage access (KV/R2/D1/Hyperdrive/Queue/Durable Object), or Worker-to-Worker communication.
- Activate when debugging runtime-specific Worker errors: "Cannot perform I/O on behalf of a different request", "Illegal invocation", 500 errors across all routes, or exhausted database connection pools.
- Do not activate to declare infrastructure resources, domains, secrets, or stages: use `$fireskill-specialist-sst`. Do not activate for database SQL queries or schema modeling: use `$fireskill-specialist-drizzle` and `$fireskill-specialist-postgres`.
- Combine with `$fireskill-specialist-nuxt` (Nitro, plugins), `$fireskill-specialist-openauth` (Auth Worker), `$fireskill-specialist-observability`, and `$fireskill-specialist-performance-engineering`.

## Workflow

1. Read [references/nuxfire-workers.md](references/nuxfire-workers.md): existing Workers, provisioned bindings, and critical I/O rules.
2. Identify in which Worker target code runs (App/Web = Nitro; `Auth`, `Emails`, `Websockets`, Queue consumers, and `Cron` = vanilla handlers in `apps/functions/src`).
3. Verify binding configuration in SST (`infra/*.ts`) **prior** to referencing it in code; unlinked bindings do not exist at runtime.
4. Load task-specific references from the routing table below.
5. Implement maintaining per-request I/O lifecycles and `ctx.waitUntil` for background work following responses.
6. Validate against checks below and test runtime alterations against a live stage: local development cannot emulate Hyperdrive or service bindings with full fidelity.

## Reference Routing

| Situation | Read |
|---|---|
| Any project Worker | `nuxfire-workers` |
| Compatibility date, types, secrets, logs/traces | `best-practices/configuration` |
| Streaming, promises, request context, security | `best-practices/runtime-patterns` |
| Handler signature, platform classes, serialization | `best-practices/platform-apis` |
| Postgres via Hyperdrive | `products/hyperdrive/*` |
| KV (rate limiting, caches) | `products/kv/*` |
| R2 (`BLOB`) | `products/r2/*` |
| Queues and DLQ | `products/queues/*` |
| Cron Triggers | `products/cron-triggers/*` |
| Durable Objects (WebSockets) | `durable-objects/index`, `durable-objects/rules`, `products/do-storage/*` |
| Testing DO/Workers | `durable-objects/testing`, `durable-objects/workers` |
| CLI commands | `wrangler` |
| Bindings overview | `products/bindings/*` |
| Logs and traces | `products/observability/*` |

## Key Rules

- Database clients, socket connections, and I/O handles are instantiated **strictly per request** and never stored in module-level global variables. Only raw binding handles may be module-scoped. In apps, use `useDB()`; in vanilla handlers, construct clients inside the handler scope.
- Close Postgres connections upon request termination inside `ctx.waitUntil` (`closeDB`). Never assume the runtime automatically closes sockets.
- Invoke `ctx.waitUntil(p)` / `context.waitUntil(p)` **as a method on its parent receiver**; never destructure or assign to a detached variable.
- Asynchronous operations executed without `await`, `return`, or `waitUntil` are dropped by the runtime and silently swallow errors.
- Use service bindings (`env.Auth`, `env.Emails`) for Worker-to-Worker communication; never invoke public HTTP endpoints of peer Workers in the same deployment.
- Use native bindings rather than Cloudflare REST APIs for supported storage and queue operations.
- `nodejs_compat` is enabled across all Workers in `infra/utils/constants.ts`; verify Node.js module compatibility before introducing dependencies.
- Sensitive tokens and random IDs: use `crypto.randomUUID()` or `crypto.getRandomValues()`, never `Math.random()`; compare secrets using constant-time algorithms.
- Large or unbounded payloads: stream responses rather than buffering via `await response.text()`.
- Secrets enter exclusively through `sst.Secret`/`vars`; only public values use `NUXT_PUBLIC_`.
- Queue message processing: invoke `message.ack()` on success, `message.retry()` on transient failure; DLQ consumers log and acknowledge.
- KV: minimum TTL is 60 seconds; rate limiting windows must not be smaller than this threshold.
- Never type `Env` as `any`; use typed local `Environment` interfaces with `Hyperdrive` types from `@cloudflare/workers-types`.
- Durable Object classes extend `DurableObject`; access context via `this.env` and `this.ctx`.
- Durable Object `new_sqlite_classes` migration is executed only once per provisioned class: never re-apply to existing classes (error 10074).

## Anti-patterns

- `let db = postgres(...)` at top-level module scope shared across requests.
- Destructuring `const { waitUntil } = ctx` or `const fn = context.waitUntil` — strips method receiver and crashes Worker execution.
- Fetching `https://auth.<domain>/...` from `App` to `Auth` instead of using `env.Auth`.
- Renaming `BLOB`, `KV`, `CACHE` (NuxtHub) or `DB` (apps/web D1).
- Maintaining a parallel `wrangler.toml` alongside SST — introduces split configuration truth.
- Hand-crafting duplicate `Env` interfaces that drift from what SST actually provisioned.
- Storing request-scoped state in module global variables (causes cross-tenant data leaks).
- Using `ctx.passThroughOnException()` as an error handling strategy.
- Trusting `X-Forwarded-For` in production: authoritative client IP is provided by `CF-Connecting-IP`.

## Validation

- `bun run typecheck` in `apps/app` for Nitro code; `tsc` in `apps/functions`; zero `any` types in `Env`.
- Project tests: `bun run test` (Vitest) at repository root.
- After modifying database I/O: verify sequential requests on a real stage without "Cannot perform I/O..." errors, and confirm idle connection pools remain bounded.
- After modifying queues/cron: verify message processing, dead-letter routing to DLQ, and audit entries in logs.
- After modifying Durable Objects/WebSockets: test valid connection tokens, expired token rejection, and automatic reconnection.
- Test deployment with `sst deploy` on a test stage is the definitive gate.

## Related Skills

- `$fireskill-specialist-sst` — resources, bindings, secrets, stages, and deploy workflows.
- `$fireskill-specialist-nuxt` — Nitro plugins and `useEvent()`.
- `$fireskill-specialist-drizzle` — schema and database queries.
- `$fireskill-specialist-openauth` — authentication Worker and `AuthKV`.
- `$fireskill-specialist-application-security` — secrets, HMAC, rate limiting.
- `$fireskill-specialist-observability` and `$fireskill-specialist-performance-engineering`.
