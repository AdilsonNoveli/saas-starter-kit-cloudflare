# Cloudflare Workers in Nuxfire — What Actually Exists in the Codebase

Each statement includes concrete file evidence. If the codebase changes, the code supersedes
this document. **Deployment uses SST** (`infra/*.ts`), not `wrangler.toml`: no
`wrangler.jsonc`/`wrangler.toml` exists in the application.

## 1. Existing Workers

| Worker (SST) | Code | Role | Evidence |
|---|---|---|---|
| `AppWorker` | Nitro build of `apps/app` (`dist/server/index.mjs`) | Nuxt App + tRPC; preset `cloudflare-module` | `infra/app.ts`, `infra/utils/nuxt.ts`, `apps/app/nuxt.config.ts` |
| `WebWorker` | Nitro build of `apps/web` (`.output/`) | Public marketing site; D1 `DB` for `@nuxt/content` | `infra/web.ts` |
| `Auth` | `apps/functions/src/auth.ts` + static assets from `apps/login` | OpenAuth issuer | `infra/auth.ts` |
| `Emails` | `apps/functions/src/emails.ts` | Outbound email delivery, called via service binding | `infra/emails.ts` |
| `Websockets` | `apps/functions/src/websockets.js` | Durable Object `Websockets` (SQLite) | `infra/websockets.ts` |
| Queue Consumer | `apps/functions/src/jobs-consumer.ts` | Processes `JobQueue` | `infra/jobs.ts` |
| DLQ Consumer | `apps/functions/src/dlq-consumer.ts` | Writes to `deadLetterRecords` and acknowledges (replay is a manual action: `admin.queue.replayDeadLetter`) | `infra/jobs.ts` |
| `Cron` | `apps/functions/src/cron.ts` | `scheduled`, `0 * * * *` (hourly) | `infra/cron.ts` |

`Websockets`, `JobQueue`/`JobDLQ` exist only if `flags.websockets` /
`flags.jobsQueue` are `true` in `config.ts` (both `true` today; documentation in
that file notes "requires Workers Paid").

## 2. Runtime and Compatibility

- Every native Worker uses `COMPATIBILITY` from `infra/utils/constants.ts`:
  `date: "2025-09-01"`, `flags: ["nodejs_compat"]`. Update dates in this single file.
- `nuxt.config.ts` declares `nitro.cloudflare.nodeCompat: true` solely to
  silence false Nitro warnings — the actual flag comes from SST.
- `nitro.experimental.asyncContext: true` (depends on `nodejs_compat`) provides
  `useEvent()` with request-scoped context; `useDB()` relies on this.

## 3. Bindings (How Code Consumes Them)

| Binding | SST Resource | Where Created | Usage |
|---|---|---|---|
| `AppDB` (Hyperdrive) | `sst.cloudflare.Hyperdrive("AppDB")` | `infra/database.ts` | Postgres; `env.AppDB.connectionString` |
| `BLOB` (R2) | `sst.cloudflare.Bucket("BLOB")` | `infra/utils/nuxt.ts` | NuxtHub Blob |
| `KV` / `CACHE` (KV) | `sst.cloudflare.Kv(...)` | `infra/utils/nuxt.ts` | NuxtHub KV/Cache |
| `AuthKV` (KV) | `sst.cloudflare.Kv("AuthKV")` | `infra/auth.ts` | `Auth` Worker exclusively |
| `DB` (D1) | `sst.cloudflare.D1("DB")` | `infra/web.ts` | `apps/web` exclusively (`@nuxt/content`) |
| `Auth`, `Emails` (Service Binding) | Worker linked in `link:` | `infra/app.ts`, `infra/auth.ts` | Zero-network Worker→Worker RPC calls |
| `Websockets` (DO namespace) | `transform.worker` | `infra/websockets.ts` | `Websockets` DO class |

- **`BLOB`, `KV`, and `CACHE` use these exact names because NuxtHub requires them.**
  Renaming them breaks `hubBlob()`/`hubKV()`/`hubCache()`.
- **`DB` in `apps/web` must be named exactly `DB`** (the `cloudflare` preset of `@nuxt/content` requires it).
- **App → Auth uses service binding**, not `fetch()` across the public URL: recommended
  by Cloudflare documentation, and comments in `infra/app.ts` document 6s+ timeouts/lockups
  observed using public URLs from within another Worker.
- Bindings reach Nitro code via `event.context.cloudflare.env.<Name>`
  (`apps/app/server/plugins/database-binding.ts`) and pure Workers via the second
  handler argument (`env`), typed with a local `interface Environment` (`jobs-consumer.ts`, `cron.ts`).

## 4. I/O Rules Learned from Previous Incidents

1. **Never cache database clients in module-level variables.** A `postgres.js`
   client is an I/O object; instantiated in one request and reused in another yields
   "Cannot perform I/O on behalf of a different request". Therefore `useDB()`
   (`apps/app/server/utils/db.ts`) stores clients in `event.context._db`
   (request scope), while Hyperdrive manages pooling.
   The `binding` (handle) can stay in module scope: it is not an I/O object.
2. **Close clients at request completion.** Workers do not invoke `.end()` for you.
   `closeDB(event)` executes in `afterResponse` and `error` hooks
   (`database-binding.ts`), is idempotent (nullifies references prior to `await`),
   and uses `context.waitUntil(...)` so isolates are not frozen mid-closure.
3. **`waitUntil` must always be called as a method:** `context.waitUntil(p)`.
   Extracting to a variable (`const fn = context.waitUntil; fn(p)`) triggers
   `TypeError: Illegal invocation` and crashed the entire Worker with HTTP 500 across
   all incoming requests (documented in `database-binding.ts`).
4. Database clients within `queue()` and `scheduled()` (`jobs-consumer.ts`, `cron.ts`)
   are instantiated **per invocation**, using
   `postgres(env.AppDB.connectionString, { max: 5, fetch_types: false })`.
   When updating these files, follow the `closeDB` pattern (closing inside `ctx.waitUntil`)
   rather than hoisting clients into module scope.
5. `fetch_types: false` is configured across all Postgres clients in the repository — retain this.
6. `CF-Connecting-IP` is the trusted client IP; `X-Forwarded-For` is a fallback
   restricted to `wrangler dev` (`apps/functions/src/rate-limit.ts`).

## 5. KV, Queues, Cron, and Durable Objects — Real Specifics

- **KV**: Minimum TTL is 60s. The `rateLimit` in Worker `Auth` uses fixed windows
  and enforces `Math.max(windowSeconds, 60)`. Outside Nitro (without NuxtHub), it uses
  the raw `kv.get(key, "json")`/`kv.put(...)` API; inside the app, it uses `hubKV()`
  (`apps/app/server/utils/rate-limit.ts`).
- **Queue** (`infra/jobs.ts`): `maxConcurrency: 5`, batch size of 10 / 5s window,
  DLQ with 3 attempts. Per message: success → `message.ack()`; failure → logs `failed`
  to database and calls `message.retry()`. Message payload is the serialized `jobs`
  table record (`$inferSelect`).
  - SST 4.14.0 bug: `dlq.retryDelay` converts to milliseconds instead of seconds.
    The real value (120s) is enforced in `transform.consumer` — do not rely on `dlq.retryDelay`.
- **Cron**: `schedules: ["0 * * * *"]`; handler `scheduled(event, env, ctx)`.
  Currently logs an entry to the `logs` table.
- **Durable Object** (`websockets.js`): `Websockets` class with SQLite storage,
  using `crossws/adapters/cloudflare-durable`; authentication via HMAC ticket issued
  by `apps/app/server/utils/ws-ticket.ts` (`WsTicketSecret` secret).
  - `new_sqlite_classes` is a **one-time irreversible migration**: resending it for
    an already provisioned class causes Cloudflare error 10074. `infra/utils/durable-objects.ts`
    queries Cloudflare's API and only includes the migration if the class is not yet
    present in that stage. Absent `CLOUDFLARE_API_TOKEN`, it assumes "already provisioned".
- **Secrets / Environment**: Sensitive values travel via `sst.Secret` (`infra/secret.ts`)
  and enter Workers as `vars`/`link`; only public values use the `NUXT_PUBLIC_` prefix.
  Never embed secrets in source code or `nuxt.config.ts`.

## 6. What Does NOT Exist (Do Not Assume)

- Application `wrangler.toml` / `wrangler.jsonc`: configuration is managed by SST.
  `references/wrangler.md` serves for ad-hoc CLI commands (inspections, logs, KV/R2 queries),
  not deployment configurations.
- Workflows, Workers AI, Vectorize, Pipelines, Containers: none are in use.
- Code-declared observability (`observability.enabled`, `traces.enabled`): no observability
  blocks exist in `sst.cloudflare.Worker` within `infra/`. While comments in
  `apps/app/server/trpc/trpc.ts` state "observability is enabled on this worker", no
  repository configuration enables this: verify in the Cloudflare dashboard before assuming
  active logs or traces. See `$fireskill-specialist-observability`.
