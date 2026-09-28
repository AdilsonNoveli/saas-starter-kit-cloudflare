import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
// Deliberately `core-schema`, NOT the `@nuxfire/functions/schema` barrel: the
// barrel re-exports this very file, so importing it from here would loop
// through the aggregator. Layers only ever depend on the core tables directly.
//
// This import and `core-schema`'s own `import { teams } from
// "@nuxfire/layer-teams/server/database/schema"` form a real, deliberate
// two-file cycle: `Job`/`DeadLetterRecord` stay in core and hold FKs to
// `Team`, while `TeamMembership`/`TeamInvite` live here and hold FKs to
// `User`. It is safe because Drizzle takes *callbacks* everywhere a table
// crosses the boundary — `.references(() => users.id)` and
// `relations(t, ({ one }) => ...)` — so neither module dereferences the other's
// exports while it is still evaluating. Nothing below may read an imported
// binding at module top level; keep every cross-file reference inside a
// callback or the cycle turns into a TDZ crash at import time.
import { jobs, users } from "@nuxfire/functions/database/core-schema";

export const teams = pgTable("Team", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  logo: text("logo"),
  // "ACTIVE" | "SUSPENDED" — plain text with a default, like
  // Subscription.status, rather than a pgEnum: this file uses no enum for any
  // other status column and a suspension state is the kind of value that gains
  // members over time. The default matters as much as the column: every
  // existing team has to come out of the migration ACTIVE, or the suspension
  // check would read null and lock out tenants that were never suspended.
  status: text("status").notNull().default("ACTIVE"),
  // No `.references()` (SPEC-0005): a real FK would force this base layer to
  // import `@nuxfire/layer-billing` to reference `plans.id`, which is exactly
  // the dependency direction this schema no longer allows — same reasoning
  // already applied to `Notification.userId` (see nuxfire-drizzle.md, "column
  // only, without FK"). The query-time relation lives in billing's own
  // schema.ts instead (`teamBillingRelations`), which is allowed to import
  // this layer. Nullable: a team with billing disabled, or not yet on any
  // plan, has none.
  planId: text("planId"),
  // Denormalized from the team's current plan (SPEC-0005) so that seat-limit
  // enforcement here never has to look up `Plan` — billing writes this
  // alongside `planId` whenever it changes a team's plan
  // (`buyer-provisioning.ts`). `null` = unlimited, same meaning as a plan
  // whose own `maxSeats` is null.
  maxSeats: integer("maxSeats"),
  // Set on the team's first Stripe Checkout attempt, reused on every one
  // after. Without it, createStripeCheckoutSession had no way to look up a
  // team's customer, so it created a brand-new Stripe Customer object on
  // every single "Select Plan" click — including retries after an abandoned
  // or failed checkout — leaving orphaned customers in the Stripe dashboard.
  stripeCustomerId: text("stripeCustomerId"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

// `plan`/`subscriptions` relations moved to billing's own schema.ts
// (`teamBillingRelations`, SPEC-0005): this base layer no longer imports
// `plans`/`subscriptions` from billing, for either a FK or a query relation.
// Drizzle merges relation entries per table by name across every `relations()`
// call found in the schema, regardless of which file declares them, so
// `db.query.teams.findFirst({ with: { plan: ... } })` still works unchanged.
export const teamRelations = relations(teams, ({ many }) => ({
  memberships: many(teamMemberships),
  roles: many(roles),
  jobs: many(jobs),
}));

export const teamMemberships = pgTable(
  "TeamMembership",
  {
    id: text("id")
      .$default(() => cuid())
      .primaryKey()
      .notNull(),
    teamId: text("teamId").notNull(),
    userId: text("userId").notNull(),
    roleId: text("roleId")
      .notNull()
      .references(() => roles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.teamId, table.userId)],
);

export const teamMembershipsRelations = relations(
  teamMemberships,
  ({ one }) => ({
    role: one(roles, {
      fields: [teamMemberships.roleId],
      references: [roles.id],
    }),
    user: one(users, {
      fields: [teamMemberships.userId],
      references: [users.id],
    }),
    team: one(teams, {
      fields: [teamMemberships.teamId],
      references: [teams.id],
    }),
  }),
);

export const teamInvites = pgTable(
  "TeamInvite",
  {
    id: text("id")
      .$default(() => cuid())
      .primaryKey()
      .notNull(),
    email: text("email").notNull(),
    teamId: text("teamId")
      .notNull()
      .references(() => teams.id),
    invitedById: text("invitedById")
      .notNull()
      .references(() => users.id),
    roleId: text("roleId")
      .notNull()
      .references(() => roles.id),
    status: text("status").default("PENDING").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.teamId, table.email)],
);

export const teamInvitesRelations = relations(teamInvites, ({ one }) => ({
  team: one(teams, {
    fields: [teamInvites.teamId],
    references: [teams.id],
  }),

  invitedBy: one(users, {
    fields: [teamInvites.invitedById],
    references: [users.id],
  }),

  role: one(roles, {
    fields: [teamInvites.roleId],
    references: [roles.id],
  }),
}));

export const permissions = pgTable(
  "Permission",
  {
    title: text("title").notNull(),
    description: text("description"),
    action: text("action").notNull(),
    roleId: text("roleId")
      .notNull()
      .references(() => roles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.action, table.roleId] })],
);

export const roles = pgTable("Role", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  // Nullable on purpose: `teamId = null` means a SYSTEM role shared by every
  // team (Owner/Admin/Member, seeded once), not an unscoped bug. Making this
  // NOT NULL would delete that concept.
  teamId: text("teamId"),
  name: text("name").notNull(),
  description: text("description"),
  isSystemRole: boolean("isSystemRole").default(false).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(permissions),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  role: one(roles, {
    fields: [permissions.roleId],
    references: [roles.id],
  }),
}));
