import { pgTable, pgEnum, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
// `User` stays in packages/functions core-schema. `platformAdminRelations`
// below joins to it, and `PlatformAdmin.userId` carries a real foreign key to
// it.
//
// UNLIKE every previous extraction in this migration, this one introduces NO
// import cycle. The reference is one-directional — this layer reaches into
// core, core never reaches back — because nothing left in `core-schema.ts`
// mentions `platformAdmins` or `auditLogs` (`usersRelations` declares only
// `notifications`; `AuditLog.actorUserId` is deliberately not a foreign key, so
// it never needed a `users` binding on either side). That makes `admin` the
// first layer here whose schema participates in none of the three deliberate
// cycles documented in nuxfire-layers.md, and the TDZ rule those cycles exist to
// guard against is therefore moot in this file. Do not "restore symmetry" by
// adding a `platformAdmin` relation to `usersRelations` over there: it would
// manufacture a fourth cycle for no behavioural gain.
//
// PACKAGE SPECIFIER, never a relative path (`../../../../packages/functions/...`).
// A relative path resolves fine under tsc, vitest, drizzle-kit, nuxt build and
// even plain `esbuild --bundle` — none of which is the bundler that actually
// ships `packages/functions`. See the caution in
// packages/functions/src/database/schema.ts and nuxfire-layers.md for the real deploy failure this rule comes from (d0dac0a).
// Requires `@nuxfire/functions: workspace:*` in this layer's own package.json,
// which every other layer already declares for the same reason.
import { users } from "@nuxfire/functions/database/core-schema";

// Platform authority — deliberately NOT an extension of the per-team
// Role/Permission RBAC in layers/teams. A row here means "owner/operator of the
// SaaS itself", which is a different question from "what may this user do
// inside team X", and mixing the two would let a tenant-scoped role escalate
// into platform scope. Rows are only ever created by
// apps/functions/src/database/grant-platform-admin.ts (manual, never over
// HTTP, never on deploy).
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
  // packages/app/server/utils/mfa-crypto.ts — that helper is shared with
  // regular-user 2FA and stays in the Composition Root) — never plaintext,
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
