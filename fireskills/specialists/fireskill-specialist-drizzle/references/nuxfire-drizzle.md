# Drizzle in Nuxfire — What Actually Exists in the Codebase

Each statement includes concrete file evidence. The codebase supersedes this document.

## 1. Versions and Database Driver

- `drizzle-orm` `^0.45.2`, `drizzle-kit` `^0.31.10`, `postgres` (postgres.js)
  `^3.4.5` — `apps/functions/package.json`. Dialect is `postgresql`
  (`apps/functions/drizzle.config.ts`). Only `pgTable`/`pgEnum`.
- Runtime Connection: `drizzle-orm/postgres-js` atop a `postgres.js` client
  configured with `{ max: 5, fetch_types: false }`, routed through Cloudflare
  **Hyperdrive** (`infra/database.ts`). Origin: standard Postgres; PostGIS is
  enabled from the initial migration.
- **No Prisma**, no D1 for application entities, and no NuxtHub `hubDatabase()`
  (D1 `DB` serves `@nuxt/content` in `apps/web` exclusively).
- **No `sessions` table exists.** Sessions and authentication credentials live in `AuthKV`
  (see `$fireskill-specialist-openauth`).

## 2. Where Schemas Reside

| File | Purpose |
|---|---|
| `apps/functions/src/database/core-schema.ts` | Non-domain core tables: `User`, `WaitlistEmail`, `Job`, `Log`, `DeadLetterRecord` |
| `apps/functions/src/database/schema.ts` | **Barrel file** (`export *`): `core-schema` + **one explicit line per layer** |
| `layers/<layer>/server/database/schema.ts` | Domain tables owned by each layer (teams, billing, notifications, admin, kanban) |

- Every consumer imports `@nuxfire/functions/schema` and sees a flattened module.
  Inside the app, `useDB()` and `tables` originate from `apps/app/server/utils/db.ts`
  (`export const tables = schema`; re-exports `sql, eq, ne, and, or, count`).
- `drizzle.config.ts` reads `./src/database/core-schema.ts` **and**
  `../../layers/*/server/database/schema.ts` (glob pattern); new layers enter
  migrations automatically, but the **barrel file** requires an explicit import line.
- Barrel imports are **unconditional**: disabling a feature layer in `config.ts`
  strips pages and components from the client bundle, but **does not** drop tables
  or client database types ("disabled" ≠ "dropped"; preserving orphan data is intentional).
- **Package specifier, never a relative path**, in the barrel and `core-schema.ts`:
  `export * from "@nuxfire/layer-kanban/server/database/schema";`.
  Relative paths (`../../../../layers/...`) pass `tsc`, `vitest`, `drizzle-kit`,
  Nitro, and esbuild locally, but **fail during `sst deploy`** (SST bundler packages
  `cron.ts`, `jobs-consumer.ts`, and `dlq-consumer.ts`, which consume the barrel).
  Requires `@nuxfire/layer-<name>: workspace:*` in `apps/functions/package.json`.
- Inside a layer, import the **owner table** from its source file
  (`@nuxfire/layer-teams/server/database/schema`,
  `@nuxfire/functions/database/core-schema`), **never** from the barrel
  `@nuxfire/functions/schema` (which re-exports the layer itself, creating a circular loop).

## 3. Table Conventions (Observed in `core-schema.ts`, `teams`, `kanban`)

- SQL table names in PascalCase: `pgTable("Team", …)`, `pgTable("KanbanBoard", …)`.
- `id`: `text("id").$default(() => cuid()).primaryKey().notNull()` using
  `createId` from `@paralleldrive/cuid2`. Exception: `User` uses
  `crypto.randomUUID()` (originates from OpenAuth issuer; see `openauth`).
- Timestamps: ``timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`)``
  and `updated_at` with `.$onUpdate(() => new Date())`.
- Foreign Keys: `.references(() => table.id)` always wrapped in a **callback**.
- Evolving status values: use `text` with `default`, not `pgEnum`
  (`Team.status = "ACTIVE" | "SUSPENDED"`). Enums are reserved for closed sets (`platform_role`).
- Column naming convention is **intentionally mixed**: `teamId`/`mfaSecret` (camelCase)
  and `created_at`/`updated_at` (snake_case) coexist on the same table. Match the
  conventions of the file being edited; do not "normalize" — renaming columns generates
  destructive migrations.
- Relations declared alongside tables using `relations(table, ({ one, many }) => ({ … }))`.
- Types: `typeof table.$inferSelect` / `$inferInsert`
  (e.g., `jobs-consumer.ts`, `InsertRole` in `db.ts`).
- System Roles: `Role.teamId = null` denotes a shared system role.
- `AuditLog.actorUserId` is intentionally **not** a foreign key constraint;
  `Notification.userId` likewise (declared purely via Drizzle relations).

## 4. The Three Schema Cycles (Deliberate) and the Rule Keeping Them Safe

1. `core-schema.ts` ↔ `layers/teams`: `Job`/`DeadLetterRecord` reside in core with
   FK to `Team`; `TeamMembership`/`TeamInvite` reside in layer with FK to `User`.
2. `layers/teams` ↔ `layers/billing`: `Subscription.teamId` → `Team`;
   `Team.planId`, `plan`/`subscriptions` → billing.
3. `core-schema.ts` ↔ `layers/notifications`: `usersRelations.notifications`
   ↔ `notificationRelations`. Pair of **relations** only, **no FK**: do not add
   `.references()` (would generate unnecessary migrations).

**Rule**: All cross-file references must be placed **inside callbacks**
(`.references(() => x.id)`, `relations(t, ({ one }) => …)`). Reading an imported
binding at module root triggers TDZ import runtime crashes.
`layers/admin` introduces no cycles: `core-schema.ts` never references
`platformAdmins`/`auditLogs` — after editing core, grep for those names; any hit
in active **code** (not comments) represents an avoidable new cycle.
Schema cycles have corresponding workspace dependency cycles (`teams` ⇄ `billing`,
`functions` ⇄ `notifications`); Bun resolves them via symlinks.

Moving a `pgTable` between files **generates no migrations** (drizzle-kit tracks
table/column identities against snapshot schemas). If a move produces a migration,
a column attribute was unintentionally altered.

## 5. Migrations

- Consolidated baseline at `apps/functions/src/database/migrations/0000_init.sql`
  (2026-09-16); `meta/_journal.json` contains one entry.
- **Generate** (from `apps/functions`), providing credentials via environment variables:
  `DATABASE_HOST=… DATABASE_PORT=5432 DATABASE_USER=… DATABASE_PASSWORD=… DATABASE_NAME=… bunx drizzle-kit generate`
  (`generate-migrations` script in `package.json`). **Inspect generated SQL**: drizzle-kit
  cannot distinguish renames from drop + add operations.
- **Apply**: runs automatically on every `App` deployment — `drizzle-kit migrate`
  inside a `command.local.Command` (`infra/utils/nuxt.ts`), using `Database*` secrets.
  Never run manual migrations on shared staging databases.
- **No down-migrations.** Rollback follows expand/contract patterns
  (`apps/functions/src/database/MIGRATIONS.md`): additive changes remain in place;
  destructive changes (drop, adding `NOT NULL` to existing columns, type alterations)
  ship in separate subsequent migrations **after** consuming code is deployed.
  Production issues are remediated by rolling forward.
- Any environment that applied previous migration history (`0000`–`0009`) requires
  its `public`/`drizzle` schemas reset prior to the next `migrate` run.
- Create automated database snapshots prior to any migration altering populated columns.

## 6. Seed Data and Manual Utility Scripts

- `seed/index.ts` runs **on every deployment** (immediately following migrations,
  `infra/utils/nuxt.ts`), is idempotent, and provisions the default **Free** plan
  and system roles (Owner/Admin/Member). Data originates from `seed/data.ts`, which
  `ensureSystemRoles()` (`layers/teams/server/utils/roles.ts`) and `ensureFreePlan()`
  (`layers/billing/server/utils/plans.ts`) share as runtime safety nets.
  Keep both mechanisms reading from identical `data.ts` definitions.
- **Never** tie admin account provisioning to seed scripts or deploy pipelines:
  `grant-platform-admin.ts` (promotes `SUPER_ADMIN`/`SUPPORT` to an already-registered user
  without modifying credentials) and `seed/demo-accounts.ts` (known test credentials,
  dev/demo environments only) are **strictly manual utilities by design**.
- Subscription plans are mutable database records managed via `/admin/plans`, not hardcoded constants.

## 7. Resetting User Data (Pitfall)

Truncating or wiping `User` rows without purging the two corresponding `AuthKV` keys
(`["email", email, "password"]` and `["users", email]`) causes split-brain state:
subsequent registrations fail with `email_taken` or violate `User_email_unique` (`23505`).
During dev database resets, wipe both keys for affected emails simultaneously (or flush
the entire KV namespace on disposable test stages). Details in `$fireskill-specialist-openauth`.

## 8. Runtime Execution

- Application: `useDB()` (request-scoped, closed via `closeDB`) — see
  `$fireskill-specialist-cloudflare-workers`.
- Pure Workers: client created per invocation using `env.AppDB.connectionString`.
- Uniqueness Violation: `error.code === "23505"` (postgres.js error code).
- Deployment Scripts (`seed`, `drizzle-kit`): direct connection, `ssl: "require"`,
  `max: 1` (seed), using `DATABASE_*` variables — bypasses Hyperdrive.
- For databases with their own connection pooler, use direct connections: Hyperdrive
  already pools connections at Cloudflare's edge. Mixing pooler hosts with direct-user
  credentials fails only during Hyperdrive provisioning with "Invalid database credentials"
  (error 2013), mimicking incorrect passwords.

## 9. What Does NOT Exist

- Database query/schema test suite. Existing tests cover billing logic, team seats,
  and RBAC abilities, not direct SQL execution.
- Down-migrations, automated migration CI checks, alternative ORMs.
