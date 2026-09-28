# Recipe: Adding or Modifying a Database Table

Based on `layers/kanban/server/database/schema.ts` (a feature layer) and
rules documented in `nuxfire-drizzle.md`. Since SPEC-0006 (2026-09-28,
extended the same day to `admin`/`notifications`, then to `teams`) there
are **six independent migration histories** — base and one per layer that
owns tables and has its own `drizzle.config.ts` — never a single shared
one. Which layers get their own history is **not** simply "core vs.
feature" — see "Can this layer's history be independent?" below, the
decision that matters most.

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
   table (`Team`) from a layer with its own migration history — never the
   reverse.
3. Import foreign layer tables using the **owner file** and **package specifier**;
   declare `@nuxfire/layer-<x>: workspace:*` in layer `package.json` (and `requires: [...]` in manifest).
4. **Generate the migration from the table's own history's directory** — see
   "Which config to generate from" below, this is the step that most
   commonly goes wrong. **Inspect the generated SQL.**
5. Run `bun run test` (Vitest) and server typechecks (`bunx vue-tsc --noEmit -p server/tsconfig.json`
   in `apps/app`) — `nuxt typecheck` does not cover `server/**`.

## Can this layer's history be independent? (the decision that matters most)

**Not** determined by core vs. feature. Determined by the shape of the
layer's foreign keys against `core-schema.ts`:

| FK shape against `core-schema.ts` | Can split? | Examples |
| --- | --- | --- |
| One-directional (layer → base only), or none at all | **Yes** | `admin` (`PlatformAdmin.userId` → `User`, one-directional), `notifications` (`Notification.userId` has no physical FK, relation only), `teams` (`TeamInvite.invitedById` → `User`, one-directional, since the 2026-09-28 split below), `kanban`, `billing` (feature layers, FK → `Team`/`User`/`Plan` only) |
| Bidirectional (base also FKs the layer) | **No** — not without a schema change first | None today. `teams` used to be the example: `core-schema.ts`'s `Job.teamId`/`DeadLetterRecord.teamId` → `Team`, **and** `teams`' own `TeamInvite.invitedById` → `User`. No single migration ordering across two independent histories can satisfy both directions — fixed (SPEC-0006, 2026-09-28) by moving `Job`/`DeadLetterRecord` into `layers/teams/server/database/schema.ts`, since they were always team-scoped concepts (`teamId` required on both), not base-agnostic infrastructure. |

If bidirectional, the layer stays folded into the base history until fixed
— same mechanism `apps/functions/drizzle.config.ts` uses to decide, per
`layers.core` entry (`existsSync(layers/<name>/drizzle.config.ts)`),
whether base includes that layer's schema. The prerequisite to split such
a layer is moving whichever base tables create the reverse direction into
the layer itself — a real schema change, not a migration-tooling exercise,
and not something to do casually. See the `teams` split (`MIGRATIONS.md`'s
"teams split" note, 2026-09-28) for a worked example of doing this for
real.

**Before adding a new table to an existing layer, or a new layer, check
this table for the layer in question — do not assume "core layers never
split" or "feature layers always do."**

## Which config to generate from

There is no single `drizzle.config.ts` that "sees everything." Before
running `drizzle-kit generate`, know which history the table belongs to and
run it **from that history's own directory**:

| Layer is in... | Has independent history? | Generate from | Config |
| --- | --- | --- | --- |
| `layers.core`, one-directional FK (or none) to base | Yes (`admin`, `notifications`, `teams`) | `layers/<name>/` | `layers/<name>/drizzle.config.ts` |
| `layers.core`, bidirectional FK with base | No (none today) | `apps/functions/` | `apps/functions/drizzle.config.ts` |
| `layers.features`, owns tables | Yes (`kanban`, `billing`) | `layers/<name>/` | `layers/<name>/drizzle.config.ts` |

Running `drizzle-kit generate` from the wrong directory either sees nothing
(base's config only reads `core-schema.ts` + non-split `layers.core`
entries — a split layer's table never shows up there, ever) or, if you
mistakenly point a config at the wrong schema, can generate a migration
that redefines a table another history already owns. **When in doubt,
`cat` the `schema:` field of the `drizzle.config.ts` you're about to run
against — never assume it globs everything.**

## Adding a New Layer That Owns Tables (e.g. a new `layers/crm/`)

This is the step that must never regress to "one shared history" again —
follow it exactly, every time, no exceptions. Applies whether the new
layer is core or feature, as long as its FK shape against `core-schema.ts`
is splittable (see the decision table above — check this **before**
starting, ideally before the schema is even finalized):

1. Create `layers/<name>/server/database/schema.ts` (same conventions as
   above). Export it in the layer's `package.json`:
   `"./server/database/schema": "./server/database/schema.ts"`.
2. Add the layer to `config.ts`'s `layers.core` (always active) or
   `layers.features` (`true`/`false`, toggleable) — this decides
   *activation*, independent of whether its migration history is split.
3. Add **one line** to the barrel file `apps/functions/src/database/schema.ts`:
   `export * from "@nuxfire/layer-<name>/server/database/schema";` — this
   feeds the runtime typed client only (`useDB()`/`tables`), stays
   unconditional even when a feature is off, and is unrelated to migration
   generation.
4. Add `@nuxfire/layer-<name>: workspace:*` to `apps/functions/package.json`
   and run `bun install`.
5. **Create `layers/<name>/drizzle.config.ts`** — copy `layers/kanban/drizzle.config.ts`
   verbatim and change one thing: `migrations.table` becomes
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
   every `layers.core` entry (unconditionally) and every
   `Object.entries(layers.features)` entry (gated), checking each for a
   `migrations/` folder — a new layer with one is picked up automatically,
   no code change needed there. If you find yourself editing that file to
   "add" a new layer's migration command, stop — that file's generic loop
   is the whole point of SPEC-0006 and should never need a per-layer `if`
   branch again.
9. **Real Verification Gate**: run `bunx drizzle-kit generate` from the new
   layer's directory a second time and confirm "No schema changes, nothing
   to migrate" (proves the config is stable), then execute `sst deploy`
   against a test stage (or at minimum `bunx esbuild <handler> --bundle
   --platform=node` for each `handler:` in `infra/*.ts`) — nothing executed
   purely locally replaces this for barrel files or deploy-pipeline changes.
   Verify the migration under the **exact spawn conditions** the deploy uses
   (no TTY — see `nuxfire-sst.md`, R-008/R-009), not just by running it
   interactively.

## Adding a New Layer With a Bidirectional FK Cycle (rare — no current example; `teams` was the example until its 2026-09-28 split)

If the new layer's tables need base tables to FK *into them* (the reverse
of the normal direction), it cannot get an independent history without
first restructuring the schema. Options, in order of preference:

1. **Move the base tables that create the reverse FK into the new layer
   itself** — this is exactly what made `teams` splittable: `Job`/
   `DeadLetterRecord` used to live in `core-schema.ts` with a FK to `Team`;
   moving them into `layers/teams/server/database/schema.ts` (they were
   always team-scoped concepts, `teamId` required on both) collapsed the
   cycle down to `TeamInvite.invitedById` → `User`, one-directional. Then
   the layer only has one-directional FKs out to base, and can follow the
   recipe above.
2. **Accept the layer stays folded into the base history** until that
   restructuring happens — no `drizzle.config.ts` of its own;
   `apps/functions/drizzle.config.ts` includes it automatically via its
   `existsSync` filter. Document why, the way `MIGRATIONS.md`'s "teams
   split" note documents both the before and after for `teams`.

Never invent a "run base first, then re-run part of base again after the
layer" ordering hack to force independence anyway — that produces exactly
the interleaved, un-self-contained history this whole split exists to
avoid.

## Modifying an Existing Layer's Schema

Generate from that layer's own directory (`cd layers/<name>`) if it has an
independent history, or from `apps/functions/` if it's folded into the
base — exactly as in "New Table in an Existing Layer" above. The new
migration lands in that history's own `migrations/` folder as
`0001_<something>.sql`, `0002_...`, etc. — never touches another history.

## Modifying Existing Columns or Tables

- Adding a nullable column or column with defaults: additive migration, completely safe.
- Renaming, deleting, altering column types, or adding `NOT NULL`: **expand/contract**
  across two migrations and two deployments (see `nuxfire-drizzle.md` §5).
- Never edit an already-applied `.sql` file or its `meta/*_snapshot.json`/`_journal.json`
  entries by hand — the documented, empirically-verified exceptions (SPEC-0006's
  snapshot surgery; the two full base consolidations that followed it, safe
  only because this environment could be reset) are in `nuxfire-drizzle.md`
  and `apps/functions/src/database/MIGRATIONS.md`; never repeat either
  without the same before/after verification (real `drizzle-kit generate`
  diff, then a real database check).
- Never "fix" schema cycles by converting existing `relations()` into real foreign key constraints.

## Checklist

- [ ] SQL table name in PascalCase; `id`/timestamps adhere to project conventions.
- [ ] Foreign keys and relations defined strictly inside callback functions.
- [ ] Barrel file imports use package specifiers; workspace dependency declared.
- [ ] Checked the FK shape against `core-schema.ts` **before** assuming this layer can (or can't) have an independent migration history — never assumed from core-vs-feature status alone.
- [ ] Migration generated from the **correct history's own directory** — never assumed.
- [ ] A new layer with an independent history has its own `drizzle.config.ts` (with `migrations.table: "__drizzle_migrations_<name>"`), its own `migrations/` folder, and its first migration named `0000_<name>.sql`.
- [ ] `infra/utils/nuxt.ts` was **not** edited to "add" the new layer's migration step — its generic loop already covers it.
- [ ] Generated SQL reviewed; destructive changes separated.
- [ ] `teamId` present on all multi-tenant tables.
- [ ] No table drops data belonging to disabled layers.
- [ ] `sst deploy` (or bundling verification) executed whenever barrel, `core-schema`, or `infra/*.ts` changes — verified under the actual non-TTY spawn conditions the deploy uses, not just interactively.
