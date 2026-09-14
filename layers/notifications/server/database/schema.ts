import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
// `User` stays in packages/functions core-schema. `notificationRelations` below
// joins to it, and `usersRelations` over there declares
// `notifications: many(notifications)` back into this file — the THIRD
// deliberate schema import cycle in this codebase, after
// core-schema.ts <-> layers/teams (Fase 3 passo 1a) and
// layers/teams <-> layers/billing (passo 2a).
//
// Note this pair is a Drizzle RELATION only, not a database foreign key:
// `userId` below is a bare `text()` with no `.references(...)`, which is why
// drizzle-kit reports `Notification ... 0 fks` — true before this move and
// after it. Do not "fix" that here; adding a real FK would generate a migration
// and this is a relocation.
//
// The cycle is safe for exactly the same single reason as the other two: every
// reference crossing the boundary sits inside a Drizzle callback —
// `relations(notifications, ({ one }) => ...)`'s body here, `many(notifications)`
// inside `relations(users, ({ many }) => ...)` there — so neither module
// dereferences the other's exports while it is still evaluating. Nothing in
// this file may read `users` at module top level, or the cycle turns into a TDZ
// crash at import time.
//
// PACKAGE SPECIFIER, never a relative path (`../../../../packages/functions/...`).
// A relative path resolves fine under tsc, vitest, drizzle-kit, nuxt build and
// even plain `esbuild --bundle` — none of which is the bundler that actually
// ships `packages/functions`. See the caution in
// packages/functions/src/database/schema.ts and _docs/AGENTS.md, "Nuxt Layers
// architecture", for the real deploy failure this rule comes from (d0dac0a).
// Requires `@nuxfire/functions: workspace:*` in this layer's own package.json,
// which every other layer already declares for the same reason.
import { users } from "@nuxfire/functions/database/core-schema";

export const notifications = pgTable("Notification", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  userId: text("userId").notNull(),
  data: jsonb("data"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
