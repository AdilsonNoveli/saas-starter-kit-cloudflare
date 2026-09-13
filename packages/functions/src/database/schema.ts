// Aggregator for the Drizzle schema. From Phase 2 each Nuxt layer appends its
// own `export * from "../../../layers/<name>/server/database/schema";` line
// here; `packages/app/server/utils/db.ts` keeps importing this file unchanged.
export * from "./core-schema";

// Layer schemas. Unconditional on purpose — NOT gated by `layers.features` in
// config.ts. Turning a feature layer off removes its pages/components from the
// Nuxt bundle; it never removes its tables from the database or from the typed
// Drizzle client. See _docs/REFATORE_ARCHITETURE.md §4 ("dado órfão"): disabling
// means "out of the UI", not "erased".
//
// Unlike the tRPC composition (server/trpc/routers/.composition/), this file is
// hand-maintained: each new layer appends exactly one line here.
// Four levels up, not three: this file sits at
// packages/functions/src/database/, so `../../..` is `packages/`, not the repo
// root. (_docs/REFATORE_ARCHITETURE.md §4 shows three — that example is wrong;
// `tsc --noEmit` in this package is what catches it.)
export * from "../../../../layers/kanban/server/database/schema";
// Core layer (config.ts `layers.core`), not a feature layer — same one-line
// treatment either way: `Team`, `TeamMembership`, `TeamInvite`, `Role` and
// `Permission` live here now, and every consumer keeps importing them from
// `@nuxfire/functions/schema` exactly as before.
export * from "../../../../layers/teams/server/database/schema";
// Core layer (Fase 3 passo 2a): `Plan`, `Benefit`, `BenefitsOnPlan` and
// `Subscription`, relocated out of core-schema.ts — not new tables, which is
// why this line comes with no migration.
export * from "../../../../layers/billing/server/database/schema";
