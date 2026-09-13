// Aggregator for the Drizzle schema. From Phase 2 each Nuxt layer appends its
// own `export * from "../../../layers/<name>/server/database/schema";` line
// here; `packages/app/server/utils/db.ts` keeps importing this file unchanged.
export * from "./core-schema";
