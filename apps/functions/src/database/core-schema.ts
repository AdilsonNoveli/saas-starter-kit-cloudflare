// `pgEnum` is gone from this import with `platform_role`, the only enum this
// file ever declared — it left for layers/admin in Fase 3 passo 4.
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
  unique,
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
// Package specifier, NOT relative — a relative `../../../../layers/teams/...`
// resolves fine under tsc/vitest/drizzle-kit/plain esbuild, but fails SST's own
// Cloudflare Worker bundler at actual deploy time ("Could not resolve
// ../../../../layers/teams/server/database/schema"), since cron.ts/
// jobs-consumer.ts/dlq-consumer.ts import this file and are bundled by SST
// directly, not by Nitro/Vite. A workspace-dependency cycle here (this package
// gaining a dependency on a layer that already depends on it) is NOT the
// problem it looks like — `layers/teams` <-> `layers/billing` already do this
// today and `bun install` resolves it as plain symlinks with no complaint. See
// nuxfire-layers.md for the full incident.
import { teams } from "@nuxfire/layer-teams/server/database/schema";
// `Notification` moved to layers/notifications (Fase 3, passo 3). This file
// still needs it for `usersRelations` below (`notifications: many(...)`), while
// that file needs `users` from here for `notificationRelations` — the THIRD
// deliberate schema cycle, same shape and same single safety rule as the two
// above: BOTH references live inside a `relations()` callback body and neither
// is dereferenced at its module's top level. (A Drizzle relation only, not a
// database FK — `Notification.userId` carries no `.references(...)`, hence
// drizzle-kit's `Notification ... 0 fks`.) Package specifier for the same
// deploy reason spelled out above — never `../../../../layers/notifications/...`.
import { notifications } from "@nuxfire/layer-notifications/server/database/schema";

export const users = pgTable("User", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  // Self-service TOTP, mirroring platformAdmins' own mfaSecret/mfaEnabledAt
  // pair (now in layers/admin/server/database/schema.ts) — always encrypted
  // (AES-GCM, see
  // apps/app/server/utils/mfa-crypto.ts), never plaintext, never
  // selected by getUser()'s client-facing session query.
  mfaSecret: text("mfaSecret"),
  // null = not enrolled. protectedProcedure only demands a verified session
  // when this is set — a user who never opts in is unaffected.
  mfaEnabledAt: timestamp("mfaEnabledAt", { withTimezone: true }),
});

// Single-use recovery codes for a lost authenticator. One set per (user, scope):
// "user" backs User.mfaSecret, "platform" backs PlatformAdmin.mfaSecret — two
// independent factors, so each keeps its own codes. Only a keyed hash is stored
// (see apps/app/server/utils/mfa-recovery.ts); the plaintext code exists once,
// in the response that generates it. `usedAt` is set atomically on redemption.
export const mfaRecoveryCodes = pgTable(
  "MfaRecoveryCode",
  {
    id: text("id")
      .$default(() => cuid())
      .primaryKey()
      .notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    codeHash: text("codeHash").notNull(),
    usedAt: timestamp("usedAt", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    unique().on(table.userId, table.scope, table.codeHash),
    index("MfaRecoveryCode_userId_scope_idx").on(table.userId, table.scope),
  ],
);

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

// `Notification` and `notificationRelations` moved to
// layers/notifications/server/database/schema.ts (Fase 3, passo 3) — see the
// import at the top of this file. They are still exported from
// `@nuxfire/functions/schema`, which aggregates both.

// `platformRoleEnum`, `PlatformAdmin`, `platformAdminRelations` and `AuditLog`
// moved to layers/admin/server/database/schema.ts (Fase 3, passo 4 — the last
// one). Unlike `Team`, `Notification` and the billing tables before them, they
// left NO import behind in this file: nothing here referenced either table, so
// this file does not import layers/admin at all and the extraction added no
// fourth schema cycle. They are still exported from `@nuxfire/functions/schema`,
// which aggregates every file.

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
