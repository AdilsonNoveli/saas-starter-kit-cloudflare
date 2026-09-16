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

Migrations are generated with Drizzle Kit from `schema.ts` and applied
against Postgres through `drizzle-kit migrate` (see
`infra/utils/nuxt.ts` — it runs automatically after every `App` deploy,
using the `DatabaseHost`/`DatabasePort`/`DatabaseUser`/`DatabasePassword`/
`DatabaseName` secrets — see `infra/secret.ts`).

## Generating a new migration

```bash
cd apps/functions
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
