import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
// `Team` moved out of `@nuxfire/functions/database/core-schema` and into the
// teams layer (Fase 3, passo 1a), so this import follows it. Never the
// `@nuxfire/functions/schema` barrel: that barrel re-exports this very file,
// so importing it from here would loop through the aggregator. A layer always
// imports the owning source file directly — which is also what makes
// `requires: ["teams"]` in this layer's manifest a real dependency, not just
// documentation.
import { teams } from "@nuxfire/layer-teams/server/database/schema";

export const kanbanBoards = pgTable("KanbanBoard", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  // Every board belongs to exactly one tenant — the layer declares
  // `requires: ["teams"]` for precisely this reason.
  teamId: text("teamId")
    .notNull()
    .references(() => teams.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const kanbanBoardRelations = relations(
  kanbanBoards,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [kanbanBoards.teamId],
      references: [teams.id],
    }),
    columns: many(kanbanColumns),
  }),
);

export const kanbanColumns = pgTable("KanbanColumn", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  boardId: text("boardId")
    .notNull()
    .references(() => kanbanBoards.id),
  name: text("name").notNull(),
  // Sparse ordering key. Plain integer with a default rather than a unique
  // constraint: a drag reorders several rows at once, and a uniqueness check
  // would reject the intermediate states of that batch.
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const kanbanColumnRelations = relations(
  kanbanColumns,
  ({ one, many }) => ({
    board: one(kanbanBoards, {
      fields: [kanbanColumns.boardId],
      references: [kanbanBoards.id],
    }),
    cards: many(kanbanCards),
  }),
);

export const kanbanCards = pgTable("KanbanCard", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  columnId: text("columnId")
    .notNull()
    .references(() => kanbanColumns.id),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const kanbanCardRelations = relations(kanbanCards, ({ one }) => ({
  column: one(kanbanColumns, {
    fields: [kanbanCards.columnId],
    references: [kanbanColumns.id],
  }),
}));
