import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";
// Relative, not `@nuxfire/...`: drizzle-kit loads this file outside
// Nuxt/Vite's resolver (same reason apps/app/nuxt.config.ts imports it
// relatively — see the comment there).
import { layers } from "../../config";

// SPEC-0006: this migration history is BASE ONLY — `layers.core` (always
// active), never `layers.features`. A feature layer (kanban, billing) owns
// its own independent migration history instead (`layers/<name>/drizzle.
// config.ts`, `layers/<name>/migrations/`), generated from that layer's
// schema alone and applied by its own `drizzle-kit migrate` invocation
// (`infra/utils/nuxt.ts`), gated on `layers.features.<name>` — so a feature
// that is off never reaches this database at all, not even as an empty
// table. Before SPEC-0006, this file derived its `schema` array from
// `layers.core` **and** active `layers.features`, so a feature's tables lived
// in the SAME migration history as the base; splitting them required a
// one-time snapshot surgery (removing their entries from `meta/
// 0003_snapshot.json` by hand, no new `.sql` file) so this file narrowing to
// base-only would not diff them as DROPs — see MIGRATIONS.md.
//
// `process.cwd()`, not `import.meta.dirname`/`fileURLToPath`: this file is
// loaded by drizzle-kit's own config loader (not run directly by Node/Bun),
// where `import.meta.dirname` came back `undefined` and `URL`/`fileURLToPath`
// collide with this package's `@cloudflare/workers-types` global `URL`.
// `process.cwd()` is reliable instead because every documented invocation of
// drizzle-kit already requires running from `apps/functions` (MIGRATIONS.md,
// and the deploy's own `command.local.Command` sets `dir: "apps/functions"`
// in infra/utils/nuxt.ts) — the same directory this config file lives in.
const here = process.cwd();

// Not every core layer necessarily owns a database schema (same allowance
// `scripts/compose-layers.ts` makes for a layer with no tRPC router) — only
// glob in the ones that do.
const coreLayerSchemas = layers.core
  .map((name) => `../../layers/${name}/server/database/schema.ts`)
  .filter((path) => existsSync(resolve(here, path)));

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/database/core-schema.ts", ...coreLayerSchemas],
  out: "./src/database/migrations",
  dbCredentials: {
    host: process.env.DATABASE_HOST!,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    ssl: "require",
  },
});
