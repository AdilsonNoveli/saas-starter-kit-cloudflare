import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
// `Team` and the rest of the multi-tenancy/RBAC tables live in the teams layer
// (Fase 3, passo 1a). `Job` and `DeadLetterRecord` below still hold foreign
// keys to `Team`, which is why this file imports back out of a layer — and the
// teams layer imports `User`/`Job` from here in turn. That two-file cycle is
// deliberate and safe: every reference
// crossing the boundary sits inside a Drizzle callback
// (`.references(() => teams.id)`, `relations(t, ({ one }) => ...)`), so neither
// module reads the other's exports while it is still evaluating. Never
// dereference `teams` at this file's top level.
//
// Relative, not `@nuxfire/layer-teams/...`, for the same reason schema.ts's
// barrel lines are relative: this package is the aggregator that reaches *down*
// into layers, so it must not gain a package.json dependency on each of them —
// layers already depend on `@nuxfire/functions`, and declaring the reverse
// would add one workspace dependency cycle per extracted layer. Four levels up,
// not three: this file sits in packages/functions/src/database/.
import { teams } from "../../../../layers/teams/server/database/schema";

export const users = pgTable("User", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  // Self-service TOTP, mirroring platformAdmins' own mfaSecret/mfaEnabledAt
  // pair below — always encrypted (AES-GCM, see
  // packages/app/server/utils/mfa-crypto.ts), never plaintext, never
  // selected by getUser()'s client-facing session query.
  mfaSecret: text("mfaSecret"),
  // null = not enrolled. protectedProcedure only demands a verified session
  // when this is set — a user who never opts in is unaffected.
  mfaEnabledAt: timestamp("mfaEnabledAt", { withTimezone: true }),
});

export const usersRelations = relations(users, ({ many }) => ({
  notifications: many(notifications),
}));

// `Team`, `TeamMembership` and `TeamInvite` moved to
// layers/teams/server/database/schema.ts — see the import at the top of this
// file. They are still exported from `@nuxfire/functions/schema`, which
// aggregates both.

// `Plan`, `Benefit`, `BenefitsOnPlan` and `Subscription` moved to
// layers/billing/server/database/schema.ts (Fase 3, passo 2a). Nothing left in
// this file references them, so — unlike `Team` — they are NOT imported back
// here; the only cycle core-schema still participates in is the one with
// layers/teams. They are still exported from `@nuxfire/functions/schema`,
// which aggregates all three files.

// `Role` and `Permission` — the per-tenant RBAC tables — moved to
// layers/teams/server/database/schema.ts alongside `Team`.

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
  // packages/app/server/utils/mfa-crypto.ts) — never plaintext,
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
