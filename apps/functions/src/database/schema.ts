// Aggregator for the Drizzle schema. From Phase 2 each Nuxt layer appends its
// own `export * from "../../../layers/<name>/server/database/schema";` line
// here; `apps/app/server/utils/db.ts` keeps importing this file unchanged.
export * from "./core-schema";

// Layer schemas. Unconditional on purpose for THIS file only — the runtime,
// typed Drizzle client (apps/app/server/utils/db.ts) keeps every layer's
// columns typed regardless of `layers.features` in config.ts, which costs
// nothing: a disabled layer's tRPC router is never mounted
// (scripts/compose-layers.ts), so no request path ever queries a table this
// gives a type for. Do NOT read this as "a disabled layer's tables stay in
// the database" — that used to be true but no longer is: migration
// GENERATION is gated by `layers.features`, in `apps/functions/drizzle.config.ts`
// (its own `schema` array is derived from the same `layers.core`/
// `layers.features` config, filtered to layers that are active). Turning a
// feature layer off and regenerating now diffs its tables as DROPs, the same
// weight as any other destructive migration — see MIGRATIONS.md.
//
// Unlike the tRPC composition (server/trpc/routers/.composition/), this file is
// hand-maintained: each new layer appends exactly one line here.
//
// Package specifier (`@nuxfire/layer-<name>/...`), NEVER a relative path
// (`../../../../layers/<name>/...`): a relative path resolves fine under tsc,
// vitest, drizzle-kit AND plain esbuild, but SST's own Cloudflare Worker
// bundler (`Runtime.Build`, used to deploy apps/functions/src/cron.ts,
// jobs-consumer.ts, dlq-consumer.ts — all of which import this barrel) fails
// it with "Could not resolve ../../../../layers/teams/server/database/schema"
// at deploy time. Real deploy failure, not caught by any check that runs
// short of an actual `sst deploy` — see nuxfire-layers.md for the full incident. `layers/kanban`'s OWN schema file
// already used the package-specifier form to import `Team` from
// `@nuxfire/layer-teams` and never hit this — only this aggregator (and
// core-schema.ts's own cross-layer import) used the relative form. Requires
// `@nuxfire/layer-<name>: workspace:*` in this package's own package.json.
export * from "@nuxfire/layer-kanban/server/database/schema";
// Core layer (config.ts `layers.core`), not a feature layer — same one-line
// treatment either way: `Team`, `TeamMembership`, `TeamInvite`, `Role` and
// `Permission` live here now, and every consumer keeps importing them from
// `@nuxfire/functions/schema` exactly as before.
export * from "@nuxfire/layer-teams/server/database/schema";
// Core layer (Fase 3 passo 2a): `Plan`, `Benefit`, `BenefitsOnPlan` and
// `Subscription`, relocated out of core-schema.ts — not new tables, which is
// why this line comes with no migration.
export * from "@nuxfire/layer-billing/server/database/schema";
// Core layer (Fase 3 passo 3): `Notification` and its relation, relocated out
// of core-schema.ts — not a new table, which is why this line comes with no
// migration. core-schema.ts still imports `notifications` back from that layer
// for `usersRelations`, the third deliberate schema cycle.
export * from "@nuxfire/layer-notifications/server/database/schema";
// Core layer (Fase 3 passo 4, the last extraction): `platform_role`,
// `PlatformAdmin` and `AuditLog`, relocated out of core-schema.ts — not new
// tables, which is why this line comes with no migration. Unlike the three
// lines above it, this one created NO cycle: core-schema.ts does not import
// layers/admin back, because nothing left in it referenced either table.
export * from "@nuxfire/layer-admin/server/database/schema";
