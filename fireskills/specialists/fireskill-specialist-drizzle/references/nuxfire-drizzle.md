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
| `apps/functions/src/database/core-schema.ts` | Non-domain core tables: `User`, `MfaRecoveryCode`, `WaitlistEmail`, `Log` |
| `apps/functions/src/database/schema.ts` | **Barrel file** (`export *`): `core-schema` + **one explicit line per layer** |
| `layers/<layer>/server/database/schema.ts` | Domain tables owned by each layer (teams, billing, notifications, admin, kanban) |

- Every consumer imports `@nuxfire/functions/schema` and sees a flattened module.
  Inside the app, `useDB()` and `tables` originate from `apps/app/server/utils/db.ts`
  (`export const tables = schema`; re-exports `sql, eq, ne, and, or, count`).
- `apps/functions/drizzle.config.ts` reads `./src/database/core-schema.ts`
  **and only the `layers.core` layers that have no `drizzle.config.ts` of
  their own** (checked via `existsSync` — today none, every `layers.core`
  entry self-manages) — this is the **base** migration history. Every
  layer that owns tables — `layers/admin`, `layers/notifications`,
  `layers/teams` (`layers.core`, always applied), `layers/kanban`,
  `layers/billing` (`layers.features`, gated) — has its **own**
  `layers/<name>/drizzle.config.ts`, schema'd to that layer's
  `server/database/schema.ts` alone, generating into its **own**
  `layers/<name>/migrations/` with its **own** tracking table
  (`drizzle.__drizzle_migrations_<name>`, via that config's
  `migrations: {table, schema}`) — **six** fully independent histories, not
  one gated array. `teams` was the last one to split (2026-09-28): it used
  to have a real, bidirectional FK cycle with `core-schema.ts` (`Job`/
  `DeadLetterRecord` → `Team`, `TeamInvite.invitedById` → `User`), which no
  single ordering across independent histories could satisfy — fixed by
  moving `Job`/`DeadLetterRecord` out of `core-schema.ts` into
  `layers/teams` itself (always team-scoped concepts anyway), leaving only
  the one-directional `TeamInvite.invitedById` → `User`.
  `config.ts`'s `layers.features` gates **which feature histories are
  applied at deploy time** (`infra/utils/nuxt.ts`); core histories with
  their own config apply unconditionally. New layers still enter runtime
  automatically once listed in `config.ts`; the **barrel file** (`schema.ts`)
  still requires its own explicit `export *` line, unrelated to any of this.
- The **barrel file**'s imports stay **unconditional** on purpose — it only
  feeds the runtime typed client, at no query cost, since a disabled layer's
  tRPC router is never mounted (`scripts/compose-layers.ts`) **and** its
  migration history is never applied (`infra/utils/nuxt.ts` skips it). A
  feature turned off in `config.ts` never runs a migration for its
  history at all — its tables never exist in that installation's database,
  not even empty; this replaced the earlier (2026-09-27) design where a
  disabled feature's tables stayed forever in the shared base history once
  created. See `apps/functions/src/database/MIGRATIONS.md` for the one-time
  split technique ("snapshot surgery") and the bootstrap procedure required
  for any environment that already had tables in the old shared history.
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

## 4. The Two Remaining Schema Cycles (Deliberate) and the Rule Keeping Them Safe

1. `core-schema.ts` ↔ `layers/teams`: `TeamMembership`/`TeamInvite` reside
   in the layer with a physical FK to `User` (`TeamInvite.invitedById`,
   one-directional, teams → base). `core-schema.ts`'s `logRelations`
   imports `jobs` back from `layers/teams` for a **relation only** (no
   `.references()` — `Log.jobId` has no physical FK), the same shape as
   cycle 3 below — not a physical-FK cycle any more, since `Job`/
   `DeadLetterRecord` moved into `layers/teams` itself (SPEC-0006, teams
   split, 2026-09-28).
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

- **Six independent histories** (SPEC-0006, 2026-09-28, extended the same
  day to `admin`/`notifications`, then to `teams`), each with its own config,
  folder, and tracking table:

  | History | Config | Folder | Tracking table | Kind |
  |---|---|---|---|---|
  | Base | `apps/functions/drizzle.config.ts` | `apps/functions/src/database/migrations/` | `drizzle.__drizzle_migrations` | `core-schema.ts` only |
  | Teams | `layers/teams/drizzle.config.ts` | `layers/teams/migrations/` | `drizzle.__drizzle_migrations_teams` | `layers.core`, always applied |
  | Admin | `layers/admin/drizzle.config.ts` | `layers/admin/migrations/` | `drizzle.__drizzle_migrations_admin` | `layers.core`, always applied |
  | Notifications | `layers/notifications/drizzle.config.ts` | `layers/notifications/migrations/` | `drizzle.__drizzle_migrations_notifications` | `layers.core`, always applied |
  | Kanban | `layers/kanban/drizzle.config.ts` | `layers/kanban/migrations/` | `drizzle.__drizzle_migrations_kanban` | `layers.features`, gated |
  | Billing | `layers/billing/drizzle.config.ts` | `layers/billing/migrations/` | `drizzle.__drizzle_migrations_billing` | `layers.features`, gated |

  `apps/functions/drizzle.config.ts` decides base's own scope by checking
  `existsSync(layers/<name>/drizzle.config.ts)` for each `layers.core`
  entry — present means that layer self-manages, absent means it folds into
  the base; every `layers.core` entry self-manages today. `teams` was the
  last to split: it used to have a real, bidirectional FK cycle with
  `core-schema.ts` (`Job`/`DeadLetterRecord` → `Team`,
  `TeamInvite.invitedById` → `User`) that no single cross-history ordering
  could satisfy — fixed (2026-09-28) by moving `Job`/`DeadLetterRecord` into
  `layers/teams` itself, leaving only the one-directional
  `TeamInvite.invitedById` → `User`, the same shape `admin`/`notifications`
  already had. Base baseline consolidated at `0000_init.sql` three times
  (2026-09-16; narrowed to exclude kanban/billing on 2026-09-28; narrowed
  again the same day to exclude admin/notifications; narrowed a third time
  the same day to exclude teams — see `MIGRATIONS.md`'s consolidation notes
  — each time by deleting and regenerating from scratch, safe only because
  this is a SaaS kit forked fresh by third parties, not a single app with
  data that can't be reset). Every non-base history has its own fresh
  initial migration, named after the layer rather than drizzle-kit's
  default `init` (`0000_teams.sql`, `0000_admin.sql`,
  `0000_notifications.sql`, `0000_kanban.sql`, `0000_billing.sql`) so a flat
  listing shows which history a file belongs to at a glance — the filename
  only locates the file on disk (`meta/_journal.json`'s `tag`), never
  affects the applied-migration hash (`sha256` of file content). Generated
  from that layer's schema alone; a non-base table can FK a base table by
  name (`"Team"`, `"User"`) but never the reverse (enforced by
  `scripts/layer-dependency-direction.test.ts`).
- **Generate** (from the owning directory — `apps/functions`, or
  `layers/teams`/`layers/admin`/`layers/notifications`/`layers/kanban`/`layers/billing`),
  providing credentials via environment variables:
  `DATABASE_HOST=… DATABASE_PORT=5432 DATABASE_USER=… DATABASE_PASSWORD=… DATABASE_NAME=… bunx drizzle-kit generate`
  (`generate-migrations` script in each `package.json`). **Inspect generated
  SQL**: drizzle-kit cannot distinguish renames from drop + add operations.
- **Apply**: runs automatically on every `App` deployment, base first, then
  every `layers.core` layer with its own history (unconditionally), then
  every **active** `layers.features` layer with its own history, before the
  seed step — via `scripts/run-migrations.mjs <folder> <table> <schema>`,
  each its own `command.local.Command` chained via `dependsOn`
  (`infra/utils/nuxt.ts`), using `Database*` secrets. Adding a new layer
  with its own history — core or feature — needs zero edits to that loop.
  **Never `bunx drizzle-kit migrate`**: its
  interactive spinner CLI crashes with a bare `exit status 1` when spawned
  without a TTY, exactly how `command.local.Command` runs it (reproduced on
  a real deploy). `run-migrations.mjs` calls `drizzle-orm`'s own `migrate()`
  directly — same engine, no spinner, and reports the real Postgres error on
  failure. A feature that is `false` in `config.ts`, or has no
  `migrations/` folder yet, is skipped entirely — no command runs for it.
  Never run manual migrations on shared staging databases.
- **No down-migrations.** Rollback follows expand/contract patterns
  (`apps/functions/src/database/MIGRATIONS.md`): additive changes remain in place;
  destructive changes (drop, adding `NOT NULL` to existing columns, type alterations)
  ship in separate subsequent migrations **after** consuming code is deployed.
  Production issues are remediated by rolling forward.
- Any environment that applied previous migration history (`0000`–`0009`) requires
  its `public`/`drizzle` schemas reset prior to the next `migrate` run.
- Any environment with data predating the SPEC-0006 split (kanban/billing
  tables already created by the old shared base history) needs a one-time
  bootstrap — `scripts/print-migration-bootstrap.mjs <migrationsFolder>
  <table>` prints (never executes) the `INSERT`s that mark each feature's
  initial migration (`0000_kanban.sql`/`0000_billing.sql`) already-applied
  in its new tracking table, matching drizzle-orm's own hash/timestamp
  algorithm exactly. Apply by hand before
  that environment's next deploy. A brand-new environment needs no
  bootstrap: all three histories just run fresh, in order.
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
