import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";
// Relative, not `@nuxfire/...`: drizzle-kit loads this file outside
// Nuxt/Vite's resolver (same reason apps/app/nuxt.config.ts imports it
// relatively — see the comment there).
import { layers } from "../../config";

// SPEC-0006: this migration history is BASE ONLY, and even within
// `layers.core` it's not "every core layer" — only the ones that don't
// self-manage their own migration history. A core or feature layer that
// owns a `drizzle.config.ts` (kanban, billing, admin, notifications, teams)
// applies its own migrations independently (`layers/<name>/drizzle.
// config.ts`, `layers/<name>/migrations/`), via its own `drizzle-kit
// migrate` invocation (`infra/utils/nuxt.ts`) — gated on
// `layers.features.<name>` for feature layers, always-on for core layers.
// `teams` got its own history same-day (2026-09-28): moving `Job`/
// `DeadLetterRecord` into `layers/teams/server/database/schema.ts` (they
// were the base's only physical FKs into `Team`) turned the previous
// bidirectional cycle with `core-schema.ts` into a one-directional one
// (`TeamInvite.invitedById` → `User`), the same shape every other core
// layer already had. Before SPEC-0006, this file derived its `schema`
// array from `layers.core` **and** active `layers.features`, so a feature's
// tables lived in the SAME migration history as the base; splitting them
// required a one-time snapshot surgery (removing their entries from `meta/
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

// A core layer folds into the base's own history only if it (a) owns a
// database schema at all (same allowance `scripts/compose-layers.ts` makes
// for a layer with no tRPC router) AND (b) has no `drizzle.config.ts` of its
// own — that file's presence is the single source of truth for "this layer
// self-manages its migrations," checked automatically so a future core
// layer with its own history needs zero edits here.
const coreLayerSchemas = layers.core
  .map((name) => ({
    name,
    schema: `../../layers/${name}/server/database/schema.ts`,
    ownConfig: `../../layers/${name}/drizzle.config.ts`,
  }))
  .filter(
    ({ schema, ownConfig }) =>
      existsSync(resolve(here, schema)) && !existsSync(resolve(here, ownConfig)),
  )
  .map(({ schema }) => schema);

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
