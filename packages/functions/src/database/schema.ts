import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";

export const users = pgTable("User", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
});

export const usersRelations = relations(users, ({ many }) => ({
  notifications: many(notifications),
}));

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
  planId: text("planId")
    .notNull()
    .references(() => plans.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const teamRelations = relations(teams, ({ one, many }) => ({
  // The plan a team is on. `planId` is a notNull foreign key, so this is
  // always present — it is what seat limits and quotas are read from.
  plan: one(plans, {
    fields: [teams.planId],
    references: [plans.id],
  }),
  memberships: many(teamMemberships),
  roles: many(roles),
  subscriptions: many(subscriptions),
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

export const benefits = pgTable("Benefit", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const benefitsRelations = relations(benefits, ({ many }) => ({
  BenefitsOnPlan: many(benefitsOnPlan),
}));

export const benefitsOnPlan = pgTable(
  "BenefitsOnPlan",
  {
    planId: text("planId").notNull(),
    benefitId: text("benefitId").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`)
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.planId, table.benefitId] })],
);

export const benefitsOnPlanRelations = relations(benefitsOnPlan, ({ one }) => ({
  plan: one(plans, {
    fields: [benefitsOnPlan.planId],
    references: [plans.id],
  }),
  benefit: one(benefits, {
    fields: [benefitsOnPlan.benefitId],
    references: [benefits.id],
  }),
}));

export const plans = pgTable("Plan", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: text("tier").default("FREE").notNull(),
  price: text("price").notNull(),
  period: text("period").notNull(),
  provider: text("provider"),
  providerPriceId: text("providerPriceId"),
  // null = unlimited seats. Nullable rather than a sentinel like 0 or -1, so
  // "this plan has no seat limit" and "this plan allows zero members" stay
  // distinguishable, and every plan that existed before this column keeps
  // behaving exactly as it did.
  maxSeats: integer("maxSeats"),
  // Open-ended bag for future quotas (storage, jobs, API calls). A jsonb
  // column means adding the next limit is a code change, not a migration.
  limits: jsonb("limits"),
  // Plans are archived, never deleted: Team.planId and Subscription.planId are
  // real foreign keys, so a physical delete would break rows that still point
  // here.
  isArchived: boolean("isArchived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const plansRelations = relations(plans, ({ many }) => ({
  benefits: many(benefitsOnPlan),
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

export const waitlistEmails = pgTable("WaitlistEmail", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const subscriptions = pgTable("Subscription", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  teamId: text("teamId")
    .notNull()
    .references(() => teams.id),
  status: text("status").default("ACTIVE").notNull(),
  provider: text("provider").notNull(),
  providerSubscriptionId: text("providerSubscriptionId").notNull(),
  planId: text("planId")
    .notNull()
    .references(() => plans.id),
  currentPeriodStart: timestamp("currentPeriodStart", { withTimezone: true }),
  currentPeriodEnd: timestamp("currentPeriodEnd", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  providerMetadata: jsonb("providerMetadata"),
  customerEmail: text("customerEmail"),
  lastPaymentDate: timestamp("lastPaymentDate", { withTimezone: true }),
  nextPaymentDate: timestamp("nextPaymentDate", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  team: one(teams, {
    fields: [subscriptions.teamId],
    references: [teams.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

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

export const logs = pgTable("Log", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  message: text("message").notNull(),
  jobId: text("jobId").default("cron"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const logRelations = relations(logs, ({ one }) => ({
  job: one(jobs, {
    fields: [logs.jobId],
    references: [jobs.id],
  }),
}));

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

// Platform authority — deliberately NOT an extension of the per-team
// Role/Permission RBAC above. A row here means "owner/operator of the SaaS
// itself", which is a different question from "what may this user do inside
// team X", and mixing the two would let a tenant-scoped role escalate into
// platform scope. Rows are only ever created by
// src/database/grant-platform-admin.ts (manual, never over HTTP, never on
// deploy).
export const platformRoleEnum = pgEnum("platform_role", [
  "SUPER_ADMIN",
  "SUPPORT",
]);

export const platformAdmins = pgTable("PlatformAdmin", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  // Unique: one platform-admin record per user. Revocation is a soft
  // `revokedAt`, so re-granting reactivates the existing row instead of
  // inserting a second one that would silently shadow the first.
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id),
  role: platformRoleEnum("role").notNull(),
  // TOTP secret, always stored encrypted (AES-GCM, see
  // packages/app/server/utils/platform-admin-crypto.ts) — never plaintext,
  // and never serialised to any client.
  mfaSecret: text("mfaSecret"),
  // null = MFA setup still pending; blocks platformAdminProcedure entirely.
  mfaEnabledAt: timestamp("mfaEnabledAt", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  // Soft-revoke instead of delete, so the audit trail keeps pointing at a
  // row that still exists.
  revokedAt: timestamp("revokedAt", { withTimezone: true }),
});

export const platformAdminRelations = relations(platformAdmins, ({ one }) => ({
  user: one(users, {
    fields: [platformAdmins.userId],
    references: [users.id],
  }),
}));

// Append-only trail of every platform-admin mutation. `actorUserId` is
// intentionally not a foreign key: the log has to survive the deletion of the
// user it refers to, which is the whole point of keeping it.
export const auditLogs = pgTable("AuditLog", {
  id: text("id")
    .$default(() => cuid())
    .primaryKey()
    .notNull(),
  actorUserId: text("actorUserId").notNull(),
  action: text("action").notNull(),
  targetType: text("targetType").notNull(),
  targetId: text("targetId"),
  metadata: jsonb("metadata"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// What lands in the JobDLQ after JobQueue exhausts its retries. Written only
// by src/dlq-consumer.ts, read only by the platform-admin queue module — the
// point is operator visibility for messages that would otherwise exist
// nowhere but the Cloudflare dashboard.
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
