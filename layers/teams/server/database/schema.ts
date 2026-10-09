import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
// Deliberately `core-schema`, NOT the `@nuxfire/functions/schema` barrel: the
// barrel re-exports this very file, so importing it from here would loop
// through the aggregator. Layers only ever depend on the core tables directly.
//
// `Job`/`DeadLetterRecord` moved into this file (SPEC-0006, teams migration
// split, 2026-09-28) — they used to live in core-schema.ts and hold FKs back
// to `Team`, which was the second half of a bidirectional cycle with this
// file's own `TeamInvite.invitedById` → `User`. Now only `users` crosses the
// boundary (teams → base, one-directional), which is what let this layer get
// its own `drizzle.config.ts`. `core-schema.ts` still imports `jobs` back
// from here, but only for `logRelations`, a relation with no physical FK
// (same shape as its existing `notifications` import) — not a cycle a
// migration needs to order.
import { users, logs } from "@nuxfire/functions/database/core-schema";

export const teams = pgTable("Team", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  name: text("name").notNull(),
  // Unique in the database, not only in `createTeamWithOwner`: two concurrent
  // creations with the same slug used to both pass the application check.
  slug: text("slug").notNull().unique(),
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

// Moved from apps/functions/src/database/core-schema.ts (SPEC-0006, teams
// migration split, 2026-09-28) — see the comment at the top of this file.
// Async-job-processing infrastructure, but always tenant-scoped (`teamId`
// required on both), which is what made it belong here rather than in base.
export const jobs = pgTable("Job", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  teamId: text("teamId")
    .notNull()
    .references(() => teams.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const jobRelations = relations(jobs, ({ one, many }) => ({
  team: one(teams, {
    fields: [jobs.teamId],
    references: [teams.id],
  }),
  logs: many(logs),
}));

// What lands in the JobDLQ after JobQueue exhausts its retries. Written only
// by apps/functions/src/dlq-consumer.ts, read only by the platform-admin
// queue module (layers/admin/server/trpc/admin-queue.ts) — the point is
// operator visibility for messages that would otherwise exist nowhere but
// the Cloudflare dashboard.
export const deadLetterRecords = pgTable("DeadLetterRecord", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  // The original Job object the queue delivered, kept whole: this is exactly
  // what `admin.queue.replayDeadLetter` sends back to JobQueue, so it has to
  // match the shape jobs-consumer.ts expects.
  message: jsonb("message").notNull(),
  error: text("error").notNull(),
  // Nullable: the team comes from the message itself, and the table still has
  // to accept a malformed message with no resolvable team rather than losing
  // the record entirely.
  teamId: text("teamId").references(() => teams.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  // null = never replayed. Set once and never cleared — the trace that a
  // message was already reprocessed is worth more than a reusable row (same
  // soft-state pattern as `revokedAt`/`isArchived` above).
  replayedAt: timestamp("replayedAt", { withTimezone: true }),
});

export const deadLetterRecordRelations = relations(
  deadLetterRecords,
  ({ one }) => ({
    team: one(teams, {
      fields: [deadLetterRecords.teamId],
      references: [teams.id],
    }),
  }),
);
