# Recipe: Adding or Modifying a Database Table

Based on `layers/kanban/server/database/schema.ts` (the canonical feature layer)
and rules documented in `nuxfire-drizzle.md`.

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
   `$fireskill-specialist-trpc`, "tenant scoping").
3. Import foreign layer tables using the **owner file** and **package specifier**;
   declare `@nuxfire/layer-<x>: workspace:*` in layer `package.json` (and `requires: [...]` in manifest).
4. Generate the migration and **inspect the generated SQL**.
5. Run `bun run test` (Vitest) and server typechecks (`bunx vue-tsc --noEmit -p server/tsconfig.json`
   in `apps/app`) — `nuxt typecheck` does not cover `server/**`.

## New Layer (Database Schema)

1. Create `layers/<name>/server/database/schema.ts`.
2. Export it in the layer's `package.json`:
   `"./server/database/schema": "./server/database/schema.ts"`.
3. Add **one line** to the barrel file `apps/functions/src/database/schema.ts`:
   `export * from "@nuxfire/layer-<name>/server/database/schema";`
4. Add `@nuxfire/layer-<name>: workspace:*` to `apps/functions/package.json` and run `bun install`.
5. The glob pattern in `drizzle.config.ts` automatically discovers the new file.
6. **Real Verification Gate**: Execute `sst deploy` against a test stage (or at minimum
   run `bunx esbuild <handler> --bundle --platform=node` for each `handler:` declared in `infra/*.ts`).
   Nothing executed purely locally replaces this verification for barrel files.

## Modifying Existing Columns or Tables

- Adding a nullable column or column with defaults: additive migration, completely safe.
- Renaming, deleting, altering column types, or adding `NOT NULL`: **expand/contract**
  across two migrations and two deployments (see `nuxfire-drizzle.md` §5).
- Never edit `0000_init.sql` or `meta/` manually.
- Never "fix" schema cycles by converting existing `relations()` into real foreign key constraints.

## Checklist

- [ ] SQL table name in PascalCase; `id`/timestamps adhere to project conventions.
- [ ] Foreign keys and relations defined strictly inside callback functions.
- [ ] Barrel file imports use package specifiers; workspace dependency declared.
- [ ] Generated SQL reviewed; destructive changes separated.
- [ ] `teamId` present on all multi-tenant tables.
- [ ] No table drops data belonging to disabled layers.
- [ ] `sst deploy` (or bundling verification) executed whenever barrel or `core-schema` changes.
