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
- There are exactly two deliberate schema dependency cycles (core<->teams, core<->notifications). `teams<->billing` used to be the third; SPEC-0005 broke it one-directional (billing->teams only — `Team.planId` has no FK/relation back to `Plan`, since a base layer must never import a feature layer). Do not introduce a fourth cycle without necessity; `notifications` uses `relations()` without physical FK constraint.
- Never rename existing columns or "normalize" existing `camelCase`/`snake_case` column identifiers: triggers destructive data migrations.
- State fields that expand over time use `text` with default value, not `pgEnum`.
- Tenant-scoped tables include `teamId` and all queries filter by it.
- Migrations (SPEC-0006, extended same-day to admin/notifications): five independent histories — base (`apps/functions`, only `core-schema.ts` + `layers/teams`, the one core layer with a real FK cycle) plus one per layer that owns tables and has its own `drizzle.config.ts`: `layers/admin`, `layers/notifications` (`layers.core`, always applied), `layers/kanban`, `layers/billing` (`layers.features`, gated). Base decides its own scope by checking `existsSync(layers/<name>/drizzle.config.ts)` per `layers.core` entry — present means self-managed, absent means folded into base. Generate (`drizzle-kit generate`, interactive, human-run only) inside the owning directory with `DATABASE_*` credentials in environment; apply **exclusively** during deployment via `scripts/run-migrations.mjs` (never `bunx drizzle-kit migrate` — its spinner CLI crashes without a TTY, which is how `command.local.Command` always runs it), base first, then every core layer with its own history, then every active feature layer with its own history (`infra/utils/nuxt.ts`). No automated rollbacks: use expand/contract patterns.
- Deployment seed is idempotent and creates only Free tier plans and system roles; admin assignment is explicit (`grant-platform-admin.ts`), never automatic.
- A feature that is `false` in `config.ts` **never runs its migration history at all** — its tables never exist in that installation's database (SPEC-0006). This is a deploy-time skip, not a schema diff: flipping an already-active feature off does not retroactively drop its tables — nothing diffs the independent histories against each other; the tables simply stop being migrated or seeded.
- Moving `pgTable` definitions between files produces zero migration diffs; if a diff appears, schema was unintentionally mutated.
- PostgreSQL error code `23505` indicates unique key constraint violation.

## Anti-patterns

- Using relative imports (`export * from "../../../layers/<x>/…"`) in the database barrel — fails bundling during `sst deploy`.
- Importing `@nuxfire/functions/schema` from inside a layer schema (circular loop through aggregator).
- Accessing `teams`, `users`, or `plans` at top-level module scope across cyclic dependencies.
- Adding physical foreign key constraints to complete the `notifications` cycle.
- Editing `0000_init.sql` or `meta/*` by hand; applying manual ad-hoc migrations on shared stages. Two documented exceptions, both empirically verified before/after, never repeated without the same rigor — see `apps/functions/src/database/MIGRATIONS.md`: (1) the one-time "snapshot surgery" that created the SPEC-0006 split (hand-removing table entries from a `meta/*_snapshot.json` with **zero** new SQL); (2) the full base consolidation (delete + regenerate `0000_init.sql` from scratch), safe **only** when the environment can be reset — this project is a SaaS kit forked fresh by third parties, not a single app with data that must survive.
- Dropping a column/table and removing consumer code in the **same deployment**.
- Using `bunx drizzle-kit migrate` (its CLI) anywhere in the deploy pipeline (`infra/utils/nuxt.ts`, or any `command.local.Command`): its spinner UI crashes without a TTY, reproduced on a real deploy. Use `scripts/run-migrations.mjs` there instead — `drizzle-kit migrate`'s CLI is fine for a human running it interactively at a real terminal, never for an automated, non-TTY pipeline.
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
