# Database migrations

> **2026-09-16:** the history up to `0009_lively_mother_askani` was consolidated
> into a single `0000_init.sql` — regenerated with `drizzle-kit generate` from
> `schema.ts` (not hand-merged), after confirming zero drift between the old
> migration history and the current schema. The old numbered files, their
> `meta/*_snapshot.json` and `_journal.json` entries are gone; git history has
> the original sequence if you need it. Any environment that already applied
> the old history must have its `public`/`drizzle` schemas reset before the
> next `drizzle-kit migrate` — done for the local dev stage as part of this
> change; `production` had no `DATABASE_HOST` configured yet, so it wasn't
> affected.

> **SPEC-0006:** this history (`apps/functions/src/database/migrations/`) is
> **base only** now — `layers.core` (`config.ts`), always active. Each
> feature layer (`layers.features`: kanban, billing) owns its own,
> completely independent migration history instead: `layers/<name>/drizzle.
> config.ts`, `layers/<name>/migrations/`, its own tracking table
> (`drizzle.__drizzle_migrations_<name>`, set via that config's `migrations:
> {table, schema}`), applied at deploy time (see "Applying migrations at
> deploy time" below), gated on `layers.features.<name>`. A feature that is
> off is skipped entirely at deploy time — its tables never reach that
> database, not even as an empty table. See "Base vs. feature histories"
> below for how the split was done and what it means going forward.

> **2026-09-28 (base consolidation):** this project is a SaaS kit meant to be
> forked and deployed fresh by third parties, not a single, permanently
> running application with data that can never be lost. Under that
> constraint, carrying `0000_init.sql`'s original mixed content forward
> forever (it still `CREATE TABLE`d `KanbanBoard`/`Plan`/`Subscription`/etc.,
> from before the SPEC-0006 split — see the "already-deployed environment"
> caveats below, which described that constraint) stopped making sense: a
> fork's very first migration file should already show a clean base with
> nothing feature-owned in it, not a historical artifact only explainable by
> reading this document. The old `0000_init.sql`/`0001_pending_purchase.sql`/
> `0002_plan_public_offer.sql`/`0003_team_plan_nullable_and_billing_feature.
> sql` were deleted and `apps/functions/drizzle.config.ts` (already scoped to
> `layers.core` only, unchanged) was used to `drizzle-kit generate` a single,
> fresh `0000_init.sql` — 14 tables, none of them feature-owned, `Team`
> already `planId` nullable and `maxSeats` present (the schema's current
> state, not a later `ALTER`). The `postgis` extension line (never
> drizzle-kit-generated — no geometry column exists — hand-added the first
> time this consolidation happened, 2026-09-16) was re-added by hand at the
> top, identically. The one environment this repository was developed
> against was fully reset (`DROP SCHEMA public CASCADE`/`DROP SCHEMA drizzle
> CASCADE`, all three histories re-applied fresh, seed re-run) rather than
> bootstrapped — an explicit, informed choice for a development database with
> no data that needed to survive, not the general recommendation (see the
> "already have data" paragraph below, which still applies to any fork that
> reaches this point with real user data to protect).

Migrations are **generated** with Drizzle Kit (`drizzle-kit generate`, an
author-time command always run interactively by a human) from `schema.ts`,
but **applied** against Postgres by `scripts/run-migrations.mjs`, never by
`drizzle-kit migrate`'s own CLI (see "Applying migrations at deploy time").
`infra/utils/nuxt.ts` runs it automatically after every `App` deploy, using
the `DatabaseHost`/`DatabasePort`/`DatabaseUser`/`DatabasePassword`/
`DatabaseName` secrets — see `infra/secret.ts`.

## Applying migrations at deploy time

`infra/utils/nuxt.ts` runs `bun run scripts/run-migrations.mjs <folder>
<table> <schema>` for each history — never `bunx drizzle-kit migrate`.
`run-migrations.mjs` calls `drizzle-orm`'s own `migrate()` function directly
(the exact engine `drizzle-kit migrate`'s CLI wraps), with no interactive
spinner UI. This is not a style preference: `bunx drizzle-kit migrate`'s
spinner reliably crashes with a bare `exit status 1` and no further output
when spawned without a real TTY attached — exactly how SST's
`command.local.Command` runs it (Pulumi pipes the child process's streams;
it never allocates a console). Reproduced on a real deploy (2026-09-28,
`AppMigrationsKanban`), twice, at the identical point, even though the
underlying migration was already correctly applied — confirmed by running
the same migration through `run-migrations.mjs` directly, which succeeded
both times and printed the real (in that case, non-error) outcome.
`run-migrations.mjs` also reports far more on failure than the CLI ever
did: the actual Postgres error (`message`, `code`, `detail`, `hint`,
`schema_name`, `table_name`, `constraint_name`), not just an exit code.

If you ever need to run a migration by hand outside a deploy (e.g. to
diagnose a failure), use the identical command `infra/utils/nuxt.ts` runs:

```bash
cd apps/functions   # or layers/kanban, layers/billing
DATABASE_HOST=... DATABASE_PORT=5432 DATABASE_USER=... DATABASE_PASSWORD=... DATABASE_NAME=... \
  bun run ../../scripts/run-migrations.mjs ./src/database/migrations __drizzle_migrations drizzle
  # (feature layer: ./migrations __drizzle_migrations_<name> drizzle)
```

**If you ever edit `infra/utils/nuxt.ts`'s `create` strings**: never wrap the
script path in quotes, even an absolute one. `command.local.Command` already
wraps `create` in its own `cmd /c "..."` on Windows; a quoted path nested
inside that breaks `cmd.exe`'s argument parsing (`error: File not found
""C:\...\run-migrations.mjs""`, doubled quotes) — reproduced on a real
deploy, then locally via `cmd /c 'cmd /c "..."'`. Use the plain, unquoted,
relative path (`../../scripts/run-migrations.mjs`, valid from both
`apps/functions` and every `layers/<name>`) instead — it never needs
quoting, since the repo path has no spaces. Before reporting any change to
these command strings as fixed, reproduce it locally under this same double
`cmd /c "..."` wrap; do not rely on `tsc` alone.

## Base vs. feature histories

There are now three independent migration histories, each with its own
`drizzle-kit` config and its own tracking table in the `drizzle` schema:

| History | Config | Migrations | Tracking table | Scope |
| --- | --- | --- | --- | --- |
| Base | `apps/functions/drizzle.config.ts` | `apps/functions/src/database/migrations/` | `drizzle.__drizzle_migrations` | `layers.core` schemas + `core-schema.ts` (always applied) |
| Kanban | `layers/kanban/drizzle.config.ts` | `layers/kanban/migrations/` | `drizzle.__drizzle_migrations_kanban` | `layers/kanban/server/database/schema.ts` only |
| Billing | `layers/billing/drizzle.config.ts` | `layers/billing/migrations/` | `drizzle.__drizzle_migrations_billing` | `layers/billing/server/database/schema.ts` only |

A feature layer's tables can FK into base tables by name (e.g. `Team`) —
never the reverse, since a base layer must never import a feature layer
(enforced by `scripts/layer-dependency-direction.test.ts`, which also
catches an indirect import through the schema barrel). `infra/utils/nuxt.ts`
applies the base history first, then each active feature's history in turn,
before running the seed step — so a feature's `CREATE TABLE ... REFERENCES
"Team"` always runs after `"Team"` exists.

**Why this split, not one shared history gated by `config.ts`:** the
previous design generated the base's migrations from `layers.core` **and**
active `layers.features` combined, so turning a feature off only stopped
new migrations from referencing it — its tables, already created by past
migrations, stayed in the database forever. It also meant a fork that never
uses kanban still carried kanban's DDL in the one history everyone shares.
With independent histories, a feature that was never turned on never runs
its migrations at all, so its tables never exist.

**How the split was originally done (2026-09-28, superseded the same day —
kept here because the technique is what a live production fork must use
instead of the consolidation below):** `kanban`'s and `billing`'s tables
used to live in the base's `0000_init.sql`. Splitting them out first
required moving 8 table definitions to new, independent histories
**without** the base history generating a `DROP TABLE` for them (they still
existed in the environment at the time). This was done as "snapshot
surgery": the 8 table entries were removed by hand from
`apps/functions/src/database/migrations/meta/0003_snapshot.json` — no new
`.sql` file — so drizzle-kit's next diff of `apps/functions/drizzle.config.ts`
(schema'd to `layers.core` only) against that snapshot saw no change for
those tables (verified: `drizzle-kit generate` reported "No schema changes,
nothing to migrate"). `layers/kanban/migrations/0000_kanban.sql` and
`layers/billing/migrations/0000_billing.sql` were generated fresh from each
layer's own schema, `CREATE TABLE IF NOT EXISTS`-free, ordinary
`CREATE TABLE` — correct for a **new** environment, where these tables don't
exist yet. Named after the layer (not drizzle-kit's default `init`) so a
flat file listing, editor search, or review diff shows at a glance which
history a file belongs to — the filename is only ever used to locate the
file on disk (`meta/_journal.json`'s `tag`); it plays no part in the
applied-migration hash (`sha256` of the file's *content*), so renaming an
already-applied file changes nothing for an environment that already
recorded that hash (verified against `node_modules/drizzle-orm/migrator.js`
directly, then confirmed against the real deployed environment after the
rename). The base's own `0000_init.sql` was left with the 8 tables still
physically defined inside it (just no longer tracked going forward) — the
correct, non-destructive move for an environment with real data. Later the
same day, once this project's actual scope was clarified (a SaaS kit forked
fresh by third parties, not a single permanent app), that leftover content
was removed too — see the 2026-09-28 "base consolidation" note above; that
is a **different, more destructive** operation, safe only when the
environment can be reset.

**A fork with real, must-not-lose data needs a bootstrap step before its
next deploy**, or `drizzle-kit migrate` will try to `CREATE TABLE
"KanbanBoard"` etc. against tables that already exist and fail.
`scripts/print-migration-bootstrap.mjs` prints the SQL to mark
`layers/kanban/migrations/0000_kanban.sql` and `layers/billing/migrations/
0000_billing.sql` as already-applied in that environment's new tracking
tables — same hash (sha256 of the file) and `created_at` algorithm
`drizzle-orm/migrator.js` itself uses, so it's indistinguishable from having
actually run `drizzle-kit migrate` there. It only prints SQL; it never
connects to a database. Run once per environment that predates this split:

```bash
node scripts/print-migration-bootstrap.mjs layers/kanban/migrations __drizzle_migrations_kanban
node scripts/print-migration-bootstrap.mjs layers/billing/migrations __drizzle_migrations_billing
```

Apply the printed SQL by hand against that environment's Postgres (or via
whatever the team's normal migration-access path is) before the next
deploy runs `drizzle-kit migrate` there. A **new** environment (nothing
deployed yet) needs no bootstrap — it just runs all three histories fresh,
in order, the ordinary way.

## Generating a new migration

Base:

```bash
cd apps/functions
DATABASE_HOST=... DATABASE_PORT=5432 DATABASE_USER=... DATABASE_PASSWORD=... DATABASE_NAME=... \
  bunx drizzle-kit generate
```

A feature layer (same pattern, from that layer's own directory):

```bash
cd layers/kanban   # or layers/billing
DATABASE_HOST=... DATABASE_PORT=5432 DATABASE_USER=... DATABASE_PASSWORD=... DATABASE_NAME=... \
  bunx drizzle-kit generate
```

Review the generated SQL in `migrations/` before committing — Drizzle Kit
diffs `schema.ts` against the last snapshot in `migrations/meta/`, but it
can't know your intent (e.g. renaming a column vs. drop+add), so double
check destructive changes.

## Rollback strategy

Drizzle Kit does not generate down-migrations. Rollback is handled the
same way any Postgres schema change is:

- **Additive changes** (new table, new nullable column, new index) are
  safe to leave in place even if the deploy is rolled back — the app
  version being rolled back to simply won't reference them.
- **Destructive changes** (drop column/table, `NOT NULL` on an existing
  column, type changes) should ship in their own migration, deployed
  *after* the application code that stops depending on the old shape has
  been live for a while — not in the same deploy that removes the code
  path. This is the standard "expand/contract" pattern: expand the schema
  first, deploy code that uses the new shape, then contract (drop) the
  old columns/tables in a later migration once nothing reads them.
- If a bad migration reaches production before this is caught, write and
  apply a new forward migration that undoes it (e.g. `ALTER TABLE ... ADD
  COLUMN` to restore a dropped column) rather than trying to "revert" —
  Postgres migrations in this setup are append-only, matching how
  `migrations/meta/_journal.json` tracks what's already been applied.
- Take a manual backup/snapshot before any migration that drops or
  alters data-bearing columns; Supabase (and most managed Postgres) offer
  point-in-time recovery as a last resort.
