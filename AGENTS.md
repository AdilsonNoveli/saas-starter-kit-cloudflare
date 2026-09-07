# AGENTS.md — Nuxfire

Read this before writing or editing any code in this repo. It exists so an LLM with no memory of this codebase doesn't reintroduce mistakes that have already been made and fixed here. Every claim below was verified against the actual source — not inferred, not copied from a generic Nuxt/SST tutorial.

If something here conflicts with a comment in the code or another doc, **the code wins** — update this file.

## What this is

**Nuxfire** — a multi-tenant SaaS starter kit. Monorepo, Bun workspaces, 100% Cloudflare Workers, deployed entirely through [SST](https://sst.dev) (`infra/*.ts`). Brand/domain: `nuxfire.com`. Package namespace: `@nuxfire/*`.

## Stack — what's actually used (read this before assuming)

| Area | Real | Do NOT assume |
|---|---|---|
| Database | **Postgres**, via Cloudflare **Hyperdrive** (`infra/database.ts`) | Not D1. Not a NuxtHub-managed database. |
| ORM | **Drizzle ORM** (`drizzle-orm/postgres-js`), everywhere | **No Prisma anywhere in this stack.** |
| Authorization | **`nuxt-authorization`** (Bouncer-style `defineAbility`) | **No CASL.** |
| Auth | **OpenAuth.js** (`@openauthjs/openauth`) — `PasswordProvider` + `CodeProvider` | Not NextAuth/Lucia/Clerk. No magic-link-only assumption — both password and one-time code exist. |
| Blob storage | `@nuxt-hub/core`'s `hubBlob()` (R2 under the hood) | Database is **not** `hubDatabase()` — only blob storage uses NuxtHub's module. |
| CI/CD | **Does not exist.** `.github/workflows/` is absent. | Don't write docs or code assuming a GitHub Actions pipeline runs deploys. Only path today: `bun run deploy` by hand. |
| Automated tests | **None exist anywhere in the repo.** No `*.test.ts`, no `*.spec.ts`, no test runner configured. | Don't reference existing test suites or coverage. |
| AI features | **Removed.** No `openai` flag in `config.ts`, no AI routes anywhere in `packages/app`. | If you see old docs mentioning an AI chatbot/image generator, it's stale — ignore it. |

## Monorepo layout

```
packages/app            main app: dashboard, billing, team mgmt, MFA-gated /admin console
packages/web             public site: landing, blog, docs (Nuxt Content)
packages/auth-frontend   static login/signup/forgot-password UI, served by the auth Worker
packages/functions       Cloudflare Workers: auth issuer, emails, websockets, job/DLQ consumers, cron
packages/emails          React Email templates
infra/*.ts               every Cloudflare resource, as SST code — sst.config.ts auto-imports every
                         file in infra/ and merges its `outputs` export; there's no central stack file
```

Package import alias: `#nuxfire/config` → root `config.ts`. Cross-package imports use `@nuxfire/<pkg>/...`.

## Database

- Schema: `packages/functions/src/database/schema.ts` — `pgTable`/`pgEnum` only (Drizzle's Postgres dialect). Real tables: `User`, `Team`, `TeamMembership`, `TeamInvite`, `Role`, `Permission`, `Plan`, `Benefit`, `BenefitOnPlan`, `Subscription`, `Job`, `Log`, `Notification`, `PlatformAdmin`, `AuditLog`, `DeadLetterRecord`, `WaitlistEmail`. **There is no `sessions` table** — auth sessions live in Cloudflare KV (`AuthKV`), not Postgres.
- `useDB()` (`packages/app/server/utils/db.ts`) builds a fresh `postgres.js` client **per request**, never cached globally — a Worker can't reuse I/O from one request inside another (Cloudflare's own documented restriction). Don't "optimize" this by hoisting the client to module scope.
- Migrations: Drizzle Kit (`packages/functions/drizzle.config.ts`, `dialect: "postgresql"`). Generate with `DATABASE_HOST=... bunx drizzle-kit generate` from `packages/functions`; applied automatically on every deploy via `infra/utils/nuxt.ts` (`drizzle-kit migrate`), not by hand. No down-migrations — rollback is expand/contract (see `packages/functions/src/database/MIGRATIONS.md`).
- `postgis` is already enabled, from the initial migration.
- Plans are **not** a hardcoded object. They're DB rows, created by the platform owner at `/admin/plans`. The only plan seeded automatically is Free (`packages/functions/src/database/seed-data.ts` → `seed.ts`, idempotent, runs every deploy).
- **On Supabase specifically, use the Direct connection, not the Session pooler**, for `DATABASE_HOST`/`DATABASE_USER` — [Cloudflare's own Hyperdrive docs say so explicitly](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/): Hyperdrive already pools at the edge, so routing through Supabase's own pooler (Supavisor) too is redundant. The two modes use non-interchangeable host/user formats (`db.<ref>.supabase.co` + `postgres` for direct; `aws-0-<region>.pooler.supabase.com` + `postgres.<ref>` for the pooler) — pairing one mode's host with the other's username doesn't error until Cloudflare provisions Hyperdrive, then fails with `400: "Invalid database credentials"` (code 2013), which reads like a wrong password even when it isn't. See `packages/web/content/docs/1.saas-starter-kit/1.getting-started/5.environment-variables.md` for the full explanation, including the one legitimate reason to fall back to the pooler (no IPv6 route from the machine running `sst deploy`, which also runs migrations locally against the same host).

## Auth

- Independent OpenAuth.js Worker (`packages/functions/src/auth.ts`), deployed to `auth.<domain>`. Frontend is `packages/auth-frontend`, built statically (`nuxt generate`) and served as that Worker's static assets.
- Credentials for password accounts live **only** in Cloudflare KV (`AuthKV`) — never in Postgres.
- Session cookies: `nuxfire-access-token`, `nuxfire-refresh-token` (`packages/app/server/utils/auth.ts`). Platform-admin elevated session: `nuxfire-platform-mfa-verified`, a separate sealed h3 session, deliberately distinct from the access/refresh pair.
- `/login`, `/signup`, `/forgot-password` in `auth-frontend` are prerendered **and** driven by query string (`?state=code`, etc.). That combination breaks on hydration — they're marked `{ ssr: false }` in `routeRules` on purpose. Don't "fix" that by removing `ssr: false`.

## Authorization (tenant RBAC)

- `nuxt-authorization`, abilities defined with `defineAbility()` in `packages/app/shared/utils/abilities.ts`, checked against `PERMISSIONS.*` string constants (`shared/utils/permissions.ts`).
- tRPC: `abilityProcedure` (built on `protectedProcedure`) adds `ctx.authorize/allows/denies`. `authorize()` throws `FORBIDDEN` and logs the denial.
- Client: `<Can :ability="..." :args="[...]">` gates rendering the same way the server gates the request.
- `Role.teamId = null` means a **system role**, shared across every team, not scoped to one.

## Platform Admin (`/admin`) — a separate authority system, not tenant RBAC

- Built on `protectedProcedure` directly, **never** on `abilityProcedure` — routing platform authority through the tenant ability layer is exactly how a tenant permission could end up granting platform access.
- `platformAdminProcedure` (`packages/app/server/trpc/trpc.ts`) requires **three** gates every time: (1) an active, non-revoked `PlatformAdmin` row, (2) MFA enrolled on it, (3) a currently-valid elevated session (TOTP verified in the last 30 min). All three failures return the same undifferentiated `FORBIDDEN`.
- Two roles exist (`platform_role` enum: `SUPER_ADMIN`, `SUPPORT`) but the procedure doesn't yet differentiate what each can do.
- Requires two operator-managed secrets before any `/admin/*` route works at all: `PLATFORM_MFA_SESSION_SECRET`, `PLATFORM_ADMIN_ENCRYPTION_KEY`. Routes **fail closed** without them — there's no insecure fallback mode.
- MFA seed/QR is generated **100% client-side** (`uqr`, zero runtime deps) — never send a TOTP secret to a hosted QR-image service.
- No self-service MFA recovery exists yet. A locked-out admin requires a direct DB edit to clear `mfaEnabledAt`.
- First admin account, on any real environment, is **`grant-platform-admin.ts`** (`packages/functions/src/database/grant-platform-admin.ts`) — it grants `SUPER_ADMIN`/`SUPPORT` to a user that already signed up normally, and never touches credentials. **Never** wire owner bootstrap into `seed.ts` or any other automated deploy step, and never give `seed-demo-accounts.ts` a fixed default password on an environment anyone outside the team can reach — both scripts are deliberately manual for the same reason: a known/scripted platform-admin credential running on every deploy is a default-credential vulnerability, not a convenience. `seed-demo-accounts.ts` (owner **and** demo tenant, both with known passwords) is for local dev/demos only.

## Secrets & environment variables

- Every secret name is **`SCREAMING_SNAKE_CASE`**, matching across three places: `.env.example`, `infra/secret.ts` (`new sst.Secret("DATABASE_HOST", "")`), and `Resource.DATABASE_HOST` in worker code. The JS object key (`secretList.DatabaseHost`) is only internal ergonomics — the string literal is what SST actually uses. Don't introduce camelCase secret names anywhere.
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` are **real shell environment variables**, never an `sst.Secret` — SST needs them to authenticate before it can even read the vault. Required before every `sst` command (`secret load`, `secret set`, `deploy`, `dev`).
- Secrets are loaded **per stage**, from a file named for that stage — `.env.stage`, `.env.production` (never a single reused `.env`, never `.env.local`): `bunx sst secret load .env.stage --fallback` (dev) or `bunx sst secret load .env.production --stage production` (prod, no `--fallback` — that would make prod values the default for every stage that hasn't set its own).
- `.env.example` is the canonical template (every key, blank, commented) — copy from it, never reinvent keys.

## Deploy & stages

- `bun run deploy` → `sst deploy`. Stage is a **CLI flag**, not an env var: `bun run deploy -- --stage production` (the `--` is required for `bun run` to pass the flag through). **Not** `SST_STAGE=production`.
- Dev stage defaults to your system username → domain resolves to `<stage>.<devDomain>` (`infra/dns.ts`). `production` is special-cased in `sst.config.ts`: `removal: "retain"`, `protect: true` — every other stage is `remove`/unprotected.
- No CI/CD exists. If asked to add automated deploys, that's new work, not "fixing" something broken.
- **A brand-new Cloudflare account needs its `workers.dev` subdomain provisioned once** before the first Worker script upload succeeds — this happens automatically the first time **Workers & Pages** is opened in the dashboard, but not before. Skipping it fails partway through `sst deploy` with `403: "You need a workers.dev subdomain..."` (error code 10063) on whichever Worker resource gets created first. Not an API token or account ID problem — don't debug it as one.

## Infra / SST gotchas (each one cost a broken deploy — don't relitigate these)

- **`handler` in a Worker def must be a relative path, never `path.resolve()`** — an absolute path breaks artifact staging on Windows.
- **`link` bindings always take the resource's own name** — you cannot link `AppDB` and call it `DB` in the worker. NuxtHub's self-hosted mode requires bindings named literally `BLOB`/`KV`/`CACHE`; that's why those specific resources are created with those exact names in `infra/utils/nuxt.ts`.
- **Durations are strings, never numbers**: `retryDelay: "120 seconds"`, not `120` (throws `duration.split is not a function`).
- **SST 4.14.0 has a real unit bug**: `Queue`'s `dlq.retryDelay` gets converted with `toMilliseconds()` instead of `toSeconds()` internally, so any value over ~86s gets rejected by Cloudflare. Workaround already in place in `infra/jobs.ts`: overwrite `args.settings.retryDelay` with a plain number of seconds via `transform.consumer`. Don't revert this thinking the duration-string bug is fixed upstream without checking.
- **Durable Object `new_sqlite_classes` migrations are one-time and irreversible** — resending it once the class has live instances throws Cloudflare error 10074, permanently, regardless of migration tags. `infra/websockets.ts` checks via the Cloudflare API (`infra/utils/durable-objects.ts`) whether the class already exists for the current stage before deciding whether to send the migration — don't hardcode it either way.
- **No Nuxt component exists in SST.** The Nuxt build runs as a `command.local.Command` (`infra/utils/builder.ts`); the native `sst.cloudflare.Worker` waits on it via `dependsOn`. This is the only way to feed Nitro's output into the native Worker resource — not a workaround to "clean up" later.
- **`@nuxthub/core` forces Nitro's output dir to `dist`, not `.output`**, whenever `hub: {...}` is set in `nuxt.config.ts` (hardcoded inside the module, not configurable). `infra/utils/nuxt.ts` picks the output dir name from the same `app: boolean` flag that decides whether BLOB/KV/CACHE get linked.
- **Queue consumers and Durable Objects have no high-level SST prop** — consumers go through `queue.subscribe(...)`; DOs are registered only via `transform.worker`, and inside that transform `args.bindings` is a Pulumi Output, not a plain array (`$output(args.bindings ?? []).apply(...)`).

## Package management (Windows-specific, but don't undo these cross-platform)

- `bunfig.toml` pins `linker = "hoisted"`. The default `isolated` linker (pnpm-style symlinks) breaks SST's embedded esbuild on Windows (`ERROR_INVALID_FUNCTION` reading Windows reparse points) — this isn't a dependency problem, don't chase one.
- `unenv` is intentionally split: root `package.json` wants v2 (SST's bundler), each Nuxt package (`app`/`web`/`auth-frontend`) wants v1 (Nitro). **Never add a global `overrides` for `unenv`** — it breaks whichever side doesn't get the version it wants.
- Any package your **own code** `import`/`require`s directly (e.g. `tailwindcss/defaultTheme` in `tailwind.config.ts`) must be an explicit `dependency` in that package's own `package.json` — never rely on it "coming along" as a transitive dependency of `@nuxt/ui`. Bun's symlink layout for hoisted transitive deps is not guaranteed stable across unrelated dependency changes.
- `react`/`react-dom` in `packages/emails` must be pinned to the **exact same version**, no `^`/`~` range on either — `@react-email/render` does its own stricter-than-semver equality check at runtime and throws if they differ, even when both satisfy the same semver range.
- Patches in `patches/` are keyed to an **exact dependency version**. If `bun.lock` resolves a different patch version, bun silently ignores the patch — no error. After regenerating the lockfile from scratch, always re-check every `patchedDependencies` entry against what actually resolved.

## WebSockets

- Durable Object class is named **`Websockets`** (not `Room`), `packages/functions/src/websockets.js` (plain `.js`, not `.ts`).
- Auth is a short-lived **HMAC-signed ticket** (`/api/auth/ws-ticket`), carried in the `Sec-WebSocket-Protocol` header — **not** the real session token. That header is the only one a browser `WebSocket` can send, and it's readable by page JS, so the long-lived token must never go there.
- Topic authorization today is exactly `user.id === topic` (`canSubscribeToTopic` in `websockets.js`) — one private topic per user, nothing more granular yet.
- Frontend plugin is `.client.ts`-suffixed on purpose (`websockets.client.ts`) — this is SSR-only-breaking code if it ever runs server-side (a universal plugin here once took down SSR for every visitor on an unhandled 401; don't remove the `.client.ts` suffix or add SSR-side WS calls).

## Rate limiting

Fixed-window limiter on Cloudflare KV, implemented twice (same shape): `packages/app/server/utils/rate-limit.ts` (`hubKV()`, App Worker) and `packages/functions/src/rate-limit.ts` (raw `KVNamespace`, auth Worker — no Nitro there to call `hubKV()` from). Minimum window is 60s (KV's own TTL floor). Currently protects: password/code login (auth Worker), MFA enrollment + reauthentication, Stripe/Paddle webhooks. Not a general API throttle — don't assume ordinary tRPC procedures are rate-limited.

## Logging

Never pass a raw `Error` to `console.error` in Worker code — `message`/`stack`/`name` are non-enumerable and vanish when the Workers runtime serializes the log to JSON, leaving `{}`. Destructure the fields you need explicitly first (see `packages/functions/src/emails.ts`).

## Content (`packages/web`)

- Nuxt Content v3, four collections (`packages/web/content.config.ts`): `docs`, `blog`, `faqs`, `legal` (the last is loose `.md` files directly under `content/`, not a subfolder).
- `content/docs/0.index.md` is the **hub landing page** (`/docs`) — NuxFire is meant to host docs for multiple pre-built products over time. `content/docs/1.saas-starter-kit/...` is the first and, today, only product. Numeric prefixes control ordering and are **stripped from the generated route** (e.g. `1.saas-starter-kit/2.features/6.rbac.md` → `/docs/saas-starter-kit/features/rbac`). A second product would live in its own sibling folder (`2.<product-slug>/...`), never nested inside the SaaS Starter Kit's own tree.
- Blog posts need `date` and `author` in frontmatter (schema-enforced). Images go in `packages/web/public/images/{blog,docs}/`, referenced as `/images/...`.
- The `::folder-tree{filter="..."}` component reads a **static, hand-maintained** `packages/web/constants/paths.json` — it does not read the filesystem live. If you add/remove/rename files, `paths.json` goes stale silently and the rendered tree lies. Regenerate it (or update it) whenever the tree changes meaningfully.
- **`ProseCode.vue` is inline-only; `ProsePre.vue` owns the block-level card.** Nuxt Content maps both fenced code blocks (` ``` `) and single-backtick inline code to the same `<code>` tag → `ProseCode` component — the only thing that tells them apart is whether a `<pre>` wraps it. `ProsePre` wraps its own `<pre>` in the `UCard`/copy-button/filename-bar chrome directly; `ProseCode` is just a plain inline `<code>` span, used both standalone and nested inside `ProsePre`'s `<pre>`. **Never move the card/copy-button treatment back into `ProseCode`** — that makes every single-backtick code span in every doc page render as its own full-width block, breaking sentences and tables site-wide (real incident, not hypothetical). To verify after touching either file: load any doc page with inline code inside a sentence or table cell and confirm it stays inline.
- **Nitro's `crawlLinks` prerender can't discover pages hidden behind a closed `Accordion`** — `DocsSidebarTreeItem.vue`'s nested sections (Getting Started, Features, Concepts) don't render their child links into the server-rendered HTML until opened client-side, so the crawler never finds them from `/`. `packages/web/nuxt.config.ts` works around this with a `docsRoutes()` helper that walks `content/docs` directly and explicitly seeds every doc route into `nitro.prerender.routes` — don't remove it or assume `crawlLinks: true` alone covers the docs tree. This matters because Cloudflare has no D1/Postgres binding backing `@nuxt/content` at runtime for `packages/web` (see `infra/web.ts`) — any doc page that isn't prerendered fails live instead of falling back to a dynamic query. After adding new doc pages, rebuild locally (`bun run build` in `packages/web`) and confirm `.output/public/docs/**` has an `index.html` for every one of them.

## Branding

Domain `nuxfire.com`, display name `NuxFire`, package namespace `@nuxfire/*`. If you see `movimentabairro.org`/`.com.br` or "Movimenta Bairro" anywhere, it's a leftover from a prior rebrand — fix it, don't propagate it.

## Known product gaps (don't build on top of these as if they're solved)

- Public pricing page is static and never reflects real `Plan` rows created at `/admin/plans`.
- No action exists to move an existing team onto a different plan (only create/suspend/reactivate).
- No tenant impersonation by the platform owner.
- No IP allowlisting for `/admin`.
- Terms of Service / Privacy Policy are still largely template boilerplate beyond the brand name, jurisdiction (Brazil/LGPD), and contact email — don't treat the rest of the legal copy as reviewed or final.
