# Recipe: Adding or Modifying a Database Table

Based on `layers/kanban/server/database/schema.ts` (a feature layer) and
rules documented in `nuxfire-drizzle.md`. Since SPEC-0006 (2026-09-28) there
are **three independent migration histories** — base and one per feature
layer that owns tables — never a single shared one. Which recipe below
applies depends entirely on whether the layer you're touching is in
`config.ts`'s `layers.core` or `layers.features`.

## New Table in an Existing Layer

1. Declare in `layers/<layer>/server/database/schema.ts`, matching file conventions
   (PascalCase in SQL, `id` with cuid2, timezone-aware timestamps, FK in callback):

```ts
import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
import { teams } from "@nuxfire/layer-teams/server/database/schema";

export const myTable = pgTable("MyTable", {
  id: text("id").$default(() => cuid()).primaryKey().notNull(),
  teamId: text("teamId").notNull().references(() => teams.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const myTableRelations = relations(myTable, ({ one }) => ({
  team: one(teams, { fields: [myTable.teamId], references: [teams.id] }),
}));
```

2. Every tenant table requires `teamId`, and queries must filter by it (see
   `$fireskill-specialist-trpc`, "tenant scoping"). `teamId` may FK a base
   table (`Team`) from a feature layer — never the reverse.
3. Import foreign layer tables using the **owner file** and **package specifier**;
   declare `@nuxfire/layer-<x>: workspace:*` in layer `package.json` (and `requires: [...]` in manifest).
4. **Generate the migration from the table's own layer directory** — see
   "Which config to generate from" below, this is the step that most
   commonly goes wrong. **Inspect the generated SQL.**
5. Run `bun run test` (Vitest) and server typechecks (`bunx vue-tsc --noEmit -p server/tsconfig.json`
   in `apps/app`) — `nuxt typecheck` does not cover `server/**`.

## Which config to generate from (the rule that matters most)

There is no single `drizzle.config.ts` that "sees everything" anymore.
Before running `drizzle-kit generate`, know which of the three histories the
table belongs to and run it **from that history's own directory**:

| Layer is in... | Generate from | Config | Migrations land in |
| --- | --- | --- | --- |
| `config.ts`'s `layers.core` | `apps/functions/` | `apps/functions/drizzle.config.ts` | `apps/functions/src/database/migrations/` |
| `config.ts`'s `layers.features`, owns tables | `layers/<name>/` | `layers/<name>/drizzle.config.ts` | `layers/<name>/migrations/` |

Running `drizzle-kit generate` from the wrong directory either sees nothing
(base's config only reads `layers.core` schemas — a feature table never
shows up there, ever, even if the feature is active) or, if you mistakenly
point a config at the wrong schema, can generate a migration that redefines
a table another history already owns. **When in doubt, `cat` the
`schema:` field of the `drizzle.config.ts` you're about to run against —
never assume it globs everything.**

## Adding a New Feature Layer That Owns Tables (e.g. a new `layers/crm/`)

This is the step that must never regress to "one shared history" again —
follow it exactly, every time, no exceptions:

1. Create `layers/<name>/server/database/schema.ts` (same conventions as
   above). Export it in the layer's `package.json`:
   `"./server/database/schema": "./server/database/schema.ts"`.
2. Add the layer to `config.ts`'s `layers.features` (`true`/`false`), **not**
   `layers.core`, unless every installation of this product genuinely needs
   it (see "New Core Layer" below if it truly belongs there).
3. Add **one line** to the barrel file `apps/functions/src/database/schema.ts`:
   `export * from "@nuxfire/layer-<name>/server/database/schema";` — this
   feeds the runtime typed client only (`useDB()`/`tables`), stays
   unconditional even when the feature is off, and is unrelated to migration
   generation.
4. Add `@nuxfire/layer-<name>: workspace:*` to `apps/functions/package.json`
   and run `bun install`.
5. **Create `layers/<name>/drizzle.config.ts`** — copy `layers/kanban/drizzle.config.ts`
   verbatim and change three things: `schema` stays `"./server/database/schema.ts"`
   (no change needed), and `migrations.table` becomes
   `"__drizzle_migrations_<name>"` (this exact naming convention —
   `infra/utils/nuxt.ts`'s deploy loop derives it automatically from the
   layer's folder name; a different name silently breaks that derivation).
6. Add `drizzle-kit` as a `devDependency` and a `"generate-migrations":
   "drizzle-kit generate"` script to `layers/<name>/package.json` (match
   `layers/kanban/package.json`'s exact convention).
7. Generate the layer's first migration **from `layers/<name>/`**:
   `cd layers/<name> && DATABASE_HOST=... bunx drizzle-kit generate --name <name>`
   — produces `layers/<name>/migrations/0000_<name>.sql`. Name it after the
   layer (`0000_<name>.sql`), never drizzle-kit's default `0000_init.sql` —
   a flat listing, editor search, or review diff must show at a glance which
   history a file belongs to (SPEC-0006, DEC-008). Inspect the generated
   SQL: it must reference base tables **by name only** (e.g.
   `REFERENCES "Team"(id)`), never redefine them.
8. **Do not touch `infra/utils/nuxt.ts`.** Its deploy loop already iterates
   every `Object.entries(layers.features)` entry and checks for a
   `migrations/` folder — a new feature layer with one is picked up
   automatically, gated on its own `true`/`false`, no code change needed
   there. If you find yourself editing that file to "add" a new feature's
   migration command, stop — that file's generic loop is the whole point of
   SPEC-0006 and should never need a per-feature `if` branch again.
9. **Real Verification Gate**: run `bunx drizzle-kit generate` from the new
   layer's directory a second time and confirm "No schema changes, nothing
   to migrate" (proves the config is stable), then execute `sst deploy`
   against a test stage (or at minimum `bunx esbuild <handler> --bundle
   --platform=node` for each `handler:` in `infra/*.ts`) — nothing executed
   purely locally replaces this for barrel files or deploy-pipeline changes.
   Verify the migration under the **exact spawn conditions** the deploy uses
   (no TTY — see `nuxfire-sst.md`, R-008/R-009), not just by running it
   interactively.

## New Core Layer (Database Schema)

Rare — only for something every installation of this product genuinely
needs, with no toggle. Same as steps 1, 3, 4 above, except: add the layer
name to `config.ts`'s `layers.core` (not `layers.features`), and **do not**
create a `drizzle.config.ts`/`migrations/` for it — `apps/functions/drizzle.config.ts`
already globs every `layers.core` layer's `schema.ts` automatically (filtered
by `existsSync`), so its tables fold into the base's own next generated
migration with no further setup.

## Modifying an Existing Feature Layer's Schema

Generate from that layer's own directory (`cd layers/<name>`), exactly as in
"New Table in an Existing Layer" above. The new migration lands in
`layers/<name>/migrations/` as `0001_<something>.sql`, `0002_...`, etc. —
never touches the base history, never touches another feature's history.

## Modifying Existing Columns or Tables

- Adding a nullable column or column with defaults: additive migration, completely safe.
- Renaming, deleting, altering column types, or adding `NOT NULL`: **expand/contract**
  across two migrations and two deployments (see `nuxfire-drizzle.md` §5).
- Never edit an already-applied `.sql` file or its `meta/*_snapshot.json`/`_journal.json`
  entries by hand — the two documented, empirically-verified exceptions
  (SPEC-0006's snapshot surgery; the later full base consolidation, safe
  only because this environment could be reset) are in `nuxfire-drizzle.md`
  and `apps/functions/src/database/MIGRATIONS.md`; never repeat either
  without the same before/after verification (real `drizzle-kit generate`
  diff, then a real database check).
- Never "fix" schema cycles by converting existing `relations()` into real foreign key constraints.

## Checklist

- [ ] SQL table name in PascalCase; `id`/timestamps adhere to project conventions.
- [ ] Foreign keys and relations defined strictly inside callback functions.
- [ ] Barrel file imports use package specifiers; workspace dependency declared.
- [ ] Migration generated from the **correct history's own directory** (base vs. the owning feature layer) — never assumed.
- [ ] A new feature layer with tables has its own `drizzle.config.ts` (with `migrations.table: "__drizzle_migrations_<name>"`), its own `migrations/` folder, and its first migration named `0000_<name>.sql`.
- [ ] `infra/utils/nuxt.ts` was **not** edited to "add" the new feature's migration step — its generic loop already covers it.
- [ ] Generated SQL reviewed; destructive changes separated.
- [ ] `teamId` present on all multi-tenant tables.
- [ ] No table drops data belonging to disabled layers.
- [ ] `sst deploy` (or bundling verification) executed whenever barrel, `core-schema`, or `infra/*.ts` changes — verified under the actual non-TTY spawn conditions the deploy uses, not just interactively.
