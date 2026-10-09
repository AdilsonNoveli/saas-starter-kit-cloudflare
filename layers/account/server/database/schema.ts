import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
// Deliberately `core-schema`, NOT the `@nuxfire/functions/schema` barrel: the
// barrel re-exports this very file, so importing it from here would loop
// through the aggregator. The only FK out of this layer is `userId` → `User`,
// one-directional, which is what lets it own its history
// (`layers/account/migrations/`, SPEC-0010).
import { users } from "@nuxfire/functions/database/core-schema";

// One row per person. Its absence is what sends a signed-in person to
// /onboarding, so `onboardedAt` is never null. `locale`, `theme`, `dateFormat`
// and `nameOrder` are plain text like every status-like column of the schema,
// not pgEnums; `parsePreferences` (server/utils/preferences.ts) is the only
// writer's gate.
export const userPreferences = pgTable("UserPreference", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  locale: text("locale").notNull(),
  timeZone: text("timeZone").notNull(),
  theme: text("theme").notNull().default("system"),
  dateFormat: text("dateFormat").notNull(),
  nameOrder: text("nameOrder").notNull(),
  onboardedAt: timestamp("onboardedAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

// One row per sign-in, keyed by the token's `sid`. Metadata only: the issuer's
// refresh records decide which sessions are still alive. Approximate place
// only (country, region, city): no network address and no finer location,
// ever (AC-016, AC-018).
export const userSessions = pgTable(
  "UserSession",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    browser: text("browser").notNull(),
    os: text("os").notNull(),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    // Both move on token renewal, never per request (DEC-008).
    lastUsedAt: timestamp("lastUsedAt", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  },
  (table) => [
    // The session list reads by person.
    index("UserSession_userId_idx").on(table.userId),
    // The hourly purge deletes rows 90 days past `expiresAt`.
    index("UserSession_expiresAt_idx").on(table.expiresAt),
  ],
);

// At most one pending e-mail change per person; a new request replaces it.
// Only the HMAC of each code is kept (server/utils/email-change-code.ts).
export const emailChangeRequests = pgTable("EmailChangeRequest", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Lower case, normalized before it gets here.
  newEmail: text("newEmail").notNull(),
  currentCodeHash: text("currentCodeHash").notNull(),
  newCodeHash: text("newCodeHash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
