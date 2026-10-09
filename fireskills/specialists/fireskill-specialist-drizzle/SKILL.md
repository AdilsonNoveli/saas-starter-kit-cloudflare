---
name: fireskill-specialist-drizzle
description: Model and modify schemas, relations, migrations, and seeds with Drizzle ORM on PostgreSQL (Cloudflare Hyperdrive) in Nuxfire — per-layer tables, barrel `schema.ts`, deliberate schema cycles, `drizzle-kit generate`, the init-edit-and-reset database change policy (absolute), and `useDB()`. Use when touching `apps/functions/src/database/`, `layers/*/server/database/schema.ts`, or any Drizzle query; does not cover pure PostgreSQL tuning (postgres) or Worker per-request I/O lifecycle (cloudflare-workers).
---

# Drizzle ORM (PostgreSQL)

## When to Use

- Activate when creating/modifying tables, columns, relations, indexes, migrations, seeds, or when writing queries with `useDB()` or inside `apps/functions` Workers.
- Activate when creating a domain layer with persistent tables (barrel export entry).
- Do not activate for raw SQL tuning, extensions, and execution query plans: use `$fireskill-specialist-postgres`. For conceptual data modeling: use `$fireskill-specialist-data-modeling` and `$fireskill-specialist-domain-modeling`. For client lifecycle per request: use `$fireskill-specialist-cloudflare-workers`.
- Combine with `$fireskill-specialist-nuxfire-layers` (layer conventions), `$fireskill-specialist-trpc` (procedure usage), and `$fireskill-specialist-sst` (migrations and seeds executed during deployment).

## Database Change Policy (ABSOLUTE AND UNBREAKABLE — owner decision, 2026-09-30)

Read this before any database work; it overrides every older statement below and in the references. Canonical text: `.fireskills/RULES.md`.

1. **Isolation by history.** Base = only what makes login and the platform work; each layer with tables owns `layers/<name>/migrations/` and is toggled in `config.ts`. A layer that is off never runs its history.
2. **A new capability is a specific, direct step** — its own layer/history (or the history of the layer that owns it), only what it needs. No catch-all, nothing for work not being implemented now (extensions included: `pg_trgm`/`unaccent` with the people layer, `vector` with the AI layer).
3. **Adjustments edit the init and the database is reset.** Edit the `0000_*` init of the owning history by regenerating it (remove old init + `meta` snapshot + `_journal.json` entry, run `drizzle-kit generate`, re-add non-generated lines such as `CREATE EXTENSION`), then the responsible person resets the database and brings it up again from zero (guarded `bun run db:reset`, then `bun run deploy`). ALWAYS the standard until the application launches: no `0001_fix…`, no `ALTER` chains, no expand/contract, no bootstrap.
4. **New numbered init only on a version bump** (V02 → `001_init.sql`). The whole policy holds until the application launches; the post-launch policy is not defined yet.
5. **Agents never run destructive database commands**; the reset is the responsible person's. The reset is **not** part of `bun run deploy` (audit 2026-09-30); it is a separate guarded command (`bun run db:reset`, specified in SPEC-0007) — until it exists, the manual one in `RULES.md`.
6. Only a stage the owner declares as holding data that must survive is exempt, with per-action authorization.

## Workflow

1. Read [references/nuxfire-drizzle.md](references/nuxfire-drizzle.md).
2. Inspect adjacent schema files and follow established conventions: PascalCase SQL identifiers, `id` with cuid2, timestamps with timezone.
3. For new tables or layers, follow [references/new-table-recipe.md](references/new-table-recipe.md).
4. Regenerate the init of the owning history (policy above), **audit the SQL output** and confirm it matches the schema.
5. Validate against checks below. If barrel or `core-schema` changed, verify via `sst deploy` on a test stage.

## Key Rules

- Source schemas are `core-schema.ts` (platform/non-domain) + per-layer `schema.ts`; `apps/functions/src/database/schema.ts` is an aggregate **barrel** importing each layer **exclusively by package specifier** (`@nuxfire/layer-<x>/…`), never relative paths.
- Inside a domain layer, import tables directly from their **owning file**, never from the aggregator barrel `@nuxfire/functions/schema`.
- Inter-file foreign key references must live **strictly inside callbacks** (`.references(() => t.id)`, `relations(t, ({ one }) => …)`); never evaluate imported table bindings at top-level module scope (prevents TDZ).
- There are exactly two deliberate schema dependency cycles (core<->teams, core<->notifications), both relation-only in both directions now — no physical FK crosses either boundary except `TeamInvite.invitedById` -> `User` (teams->base, one-directional; `core-schema.ts`'s `logRelations` imports `jobs` back from `layers/teams` for a relation only, `Log.jobId` has no `.references()`). `teams<->billing` used to be a third cycle; SPEC-0005 broke it one-directional (billing->teams only — `Team.planId` has no FK/relation back to `Plan`, since a base layer must never import a feature layer). Do not introduce a new bidirectional physical-FK cycle without necessity; `notifications` and (since SPEC-0006's teams split) `core-schema.ts`'s side of `teams` both use `relations()` without a physical FK constraint.
- Never rename existing columns or "normalize" existing `camelCase`/`snake_case` column identifiers: triggers destructive data migrations.
- State fields that expand over time use `text` with default value, not `pgEnum`.
- Tenant-scoped tables include `teamId` and all queries filter by it.
- Migrations (SPEC-0006, extended same-day to admin/notifications, then to teams): seven independent histories — base (`apps/functions`, only `core-schema.ts`: `User`, `MfaRecoveryCode`, `WaitlistEmail`, `Log`) plus one per layer that owns tables and has its own `drizzle.config.ts`: `layers/admin`, `layers/notifications`, `layers/teams` (`layers.core`, always applied), `layers/kanban`, `layers/billing` (`layers.features`, gated). Base decides its own scope by checking `existsSync(layers/<name>/drizzle.config.ts)` per `layers.core` entry — present means self-managed, absent means folded into base; every `layers.core` entry is self-managed today. Generate (`drizzle-kit generate`, interactive, human-run only) inside the owning directory with `DATABASE_*` credentials in environment; apply **exclusively** during deployment via `scripts/run-migrations.mjs` (never `bunx drizzle-kit migrate` — its spinner CLI crashes without a TTY, which is how `command.local.Command` always runs it), base first, then every core layer with its own history, then every active feature layer with its own history (`infra/utils/nuxt.ts`). No rollbacks, no patch migrations and no expand/contract: adjustments edit the init and the database is reset (policy above).
- Deployment seed is idempotent and creates only Free tier plans and system roles; admin assignment is explicit (`grant-platform-admin.ts`), never automatic.
- A feature that is `false` in `config.ts` **never runs its migration history at all** — its tables never exist in that installation's database (SPEC-0006). This is a deploy-time skip, not a schema diff: flipping an already-active feature off does not retroactively drop its tables — nothing diffs the independent histories against each other; the tables simply stop being migrated or seeded.
- Moving `pgTable` definitions between files produces zero migration diffs; if a diff appears, schema was unintentionally mutated.
- PostgreSQL error code `23505` indicates unique key constraint violation.

## Anti-patterns

- Using relative imports (`export * from "../../../layers/<x>/…"`) in the database barrel — fails bundling during `sst deploy`.
- Importing `@nuxfire/functions/schema` from inside a layer schema (circular loop through aggregator).
- Accessing `teams`, `users`, or `plans` at top-level module scope across cyclic dependencies.
- Adding physical foreign key constraints to complete the `notifications` cycle.
- Hand-editing `meta/*` snapshots or journals (regenerate the init with `drizzle-kit generate` instead); patch migrations (`0001_fix…`), `ALTER` chains, expand/contract and bootstrap scripts — all forbidden by the database change policy. Regenerating the init is the **standard**, not an exception; the one-time "snapshot surgery" of the SPEC-0006 split stays in `MIGRATIONS.md` as history.
- Changing the shape of a table without changing, in the same change, every consumer of the old shape (the reset makes the old shape disappear at once).
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
