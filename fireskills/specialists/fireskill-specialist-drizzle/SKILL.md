---
name: fireskill-specialist-drizzle
description: Model and modify schemas, relations, migrations, and seeds with Drizzle ORM on PostgreSQL (Cloudflare Hyperdrive) in Nuxfire — per-layer tables, barrel `schema.ts`, deliberate schema cycles, `drizzle-kit generate/migrate`, expand/contract patterns, and `useDB()`. Use when touching `apps/functions/src/database/`, `layers/*/server/database/schema.ts`, or any Drizzle query; does not cover pure PostgreSQL tuning (postgres) or Worker per-request I/O lifecycle (cloudflare-workers).
---

# Drizzle ORM (PostgreSQL)

## When to Use

- Activate when creating/modifying tables, columns, relations, indexes, migrations, seeds, or when writing queries with `useDB()` or inside `apps/functions` Workers.
- Activate when creating a domain layer with persistent tables (barrel export entry).
- Do not activate for raw SQL tuning, extensions, and execution query plans: use `$fireskill-specialist-postgres`. For conceptual data modeling: use `$fireskill-specialist-data-modeling` and `$fireskill-specialist-domain-modeling`. For client lifecycle per request: use `$fireskill-specialist-cloudflare-workers`.
- Combine with `$fireskill-specialist-nuxfire-layers` (layer conventions), `$fireskill-specialist-trpc` (procedure usage), and `$fireskill-specialist-sst` (migrations and seeds executed during deployment).

## Workflow

1. Read [references/nuxfire-drizzle.md](references/nuxfire-drizzle.md).
2. Inspect adjacent schema files and follow established conventions: PascalCase SQL identifiers, `id` with cuid2, timestamps with timezone.
3. For new tables or layers, follow [references/new-table-recipe.md](references/new-table-recipe.md).
4. Generate migrations, **audit the SQL output**, and isolate destructive alterations.
5. Validate against checks below. If barrel or `core-schema` changed, verify via `sst deploy` on a test stage.

## Key Rules

- Source schemas are `core-schema.ts` (platform/non-domain) + per-layer `schema.ts`; `apps/functions/src/database/schema.ts` is an aggregate **barrel** importing each layer **exclusively by package specifier** (`@nuxfire/layer-<x>/…`), never relative paths.
- Inside a domain layer, import tables directly from their **owning file**, never from the aggregator barrel `@nuxfire/functions/schema`.
- Inter-file foreign key references must live **strictly inside callbacks** (`.references(() => t.id)`, `relations(t, ({ one }) => …)`); never evaluate imported table bindings at top-level module scope (prevents TDZ).
- There are exactly three deliberate schema dependency cycles (core<->teams, teams<->billing, core<->notifications). Do not introduce a fourth without necessity; `notifications` uses `relations()` without physical FK constraint.
- Never rename existing columns or "normalize" existing `camelCase`/`snake_case` column identifiers: triggers destructive data migrations.
- State fields that expand over time use `text` with default value, not `pgEnum`.
- Tenant-scoped tables include `teamId` and all queries filter by it.
- Migrations: generate inside `apps/functions` with `DATABASE_*` credentials in environment; apply **exclusively** during deployment (`drizzle-kit migrate` in `infra/utils/nuxt.ts`). No automated rollbacks: use expand/contract patterns.
- Deployment seed is idempotent and creates only Free tier plans and system roles; admin assignment is explicit (`grant-platform-admin.ts`), never automatic.
- Deactivating a layer in `config.ts` preserves existing database tables.
- Moving `pgTable` definitions between files produces zero migration diffs; if a diff appears, schema was unintentionally mutated.
- PostgreSQL error code `23505` indicates unique key constraint violation.

## Anti-patterns

- Using relative imports (`export * from "../../../layers/<x>/…"`) in the database barrel — fails bundling during `sst deploy`.
- Importing `@nuxfire/functions/schema` from inside a layer schema (circular loop through aggregator).
- Accessing `teams`, `users`, or `plans` at top-level module scope across cyclic dependencies.
- Adding physical foreign key constraints to complete the `notifications` cycle.
- Editing `0000_init.sql` or `meta/*` by hand; applying manual ad-hoc migrations on shared stages.
- Dropping a column/table and removing consumer code in the **same deployment**.
- Attaching admin creation or hardcoded passwords to deploy seeds.
- Caching Drizzle or postgres.js clients in module-level global variables.
- Deleting `User` rows without clearing both `AuthKV` session keys.
- Relying on `nuxt typecheck` for server schemas (it ignores server tsconfig).
- Assuming a `sessions` table exists: sessions reside in KV.

## Validation

- `bun run generate-migrations` in `apps/functions` produces zero diffs when only moving code between files.
- Inspect generated migration SQL: verify absence of unexpected `DROP` or destructive `ALTER ... NOT NULL` statements.
- `bun run typecheck` in `apps/functions` (`tsc --noEmit`) and `bunx vue-tsc --noEmit -p server/tsconfig.json` in `apps/app`.
- `bun run test` (Vitest) at repository root.
- Ensure `platformAdmins` and `auditLogs` are defined strictly in `core-schema.ts`.
- Verify deploy seed is idempotent: running twice yields no changes on the second execution.

## Related Skills

- `$fireskill-specialist-postgres` — SQL, indexes, and performance tuning.
- `$fireskill-specialist-data-modeling` and `$fireskill-specialist-domain-modeling`.
- `$fireskill-specialist-nuxfire-layers` — layer architecture and registration.
- `$fireskill-specialist-trpc` — table usage inside API procedures.
- `$fireskill-specialist-cloudflare-workers` — Hyperdrive and per-request I/O rules.
- `$fireskill-specialist-sst` — deploy migrations, seeds, and database secrets.
- `$fireskill-specialist-openauth` — authentication and KV session store architecture.
