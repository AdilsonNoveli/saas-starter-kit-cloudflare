import type { permissions, plans, roles } from "./schema";

type InsertRole = typeof roles.$inferInsert;
type InsertPermission = typeof permissions.$inferInsert;
type InsertPlan = typeof plans.$inferInsert;

// Mirrored from packages/app/shared/utils/permissions.ts as plain string
// literals rather than imported: this package has no dependency on the
// app's Nuxt-specific shared/ directory, and these are just the opaque
// action strings nuxt-authorization's ability checks compare against. If
// one side changes a value, the other has to change with it.
const ACTIONS = {
  TEAMS_UPDATE: "teams:update",
  TEAMS_DELETE: "teams:delete",
  MEMBERS_LIST: "teams:members:list",
  MEMBERS_UPDATE: "teams:members:update",
  MEMBERS_REMOVE: "teams:members:remove",
  INVITE_CREATE: "teams:invite:create",
  INVITE_UPDATE: "teams:invite:update",
  INVITE_DELETE: "teams:invite:delete",
  BILLING_VIEW: "teams:billing:view",
} as const;

export const FREE_PLAN: InsertPlan = {
  name: "Free Tier",
  tier: "FREE",
  description: "Get started quickly.",
  price: "$0",
  period: "month",
};

/**
 * The three built-in team roles. Single source of truth, imported by both:
 *
 *  - layers/teams/server/utils/roles.ts's ensureSystemRoles(), the reactive
 *    path that self-heals if Role is ever found empty at request time (e.g. a
 *    database swapped or reset independently of a full app deploy).
 *  - database/seed.ts, the deploy-time path that guarantees these exist
 *    deterministically on every deploy, fresh installs included, rather
 *    than waiting for the first request that happens to need one.
 */
export const SYSTEM_ROLES: {
  role: InsertRole;
  permissions: Omit<InsertPermission, "roleId">[];
}[] = [
  {
    role: {
      name: "Owner",
      description: "Team owner with full system permissions",
      isSystemRole: true,
      isDefault: false,
    },
    permissions: [
      { title: "Full Teams Access", action: ACTIONS.TEAMS_UPDATE },
      { title: "Full Teams Deletion", action: ACTIONS.TEAMS_DELETE },
      { title: "Manage Team Members", action: ACTIONS.MEMBERS_LIST },
      { title: "Update Team Members", action: ACTIONS.MEMBERS_UPDATE },
      { title: "Remove Team Members", action: ACTIONS.MEMBERS_REMOVE },
      { title: "Manage Team Invites", action: ACTIONS.INVITE_CREATE },
      { title: "Update Team Invites", action: ACTIONS.INVITE_UPDATE },
      { title: "Delete Team Invites", action: ACTIONS.INVITE_DELETE },
      { title: "View Billing", action: ACTIONS.BILLING_VIEW },
    ],
  },
  {
    role: {
      name: "Admin",
      description: "Team administrator with most system permissions",
      isSystemRole: true,
      isDefault: false,
    },
    permissions: [
      { title: "Manage Teams", action: ACTIONS.TEAMS_UPDATE },
      { title: "Team Members List", action: ACTIONS.MEMBERS_LIST },
      { title: "Update Team Members", action: ACTIONS.MEMBERS_UPDATE },
      { title: "Remove Team Members", action: ACTIONS.MEMBERS_REMOVE },
      { title: "Manage Team Invites", action: ACTIONS.INVITE_CREATE },
      { title: "Update Team Invites", action: ACTIONS.INVITE_UPDATE },
      { title: "Delete Team Invites", action: ACTIONS.INVITE_DELETE },
    ],
  },
  {
    role: {
      name: "Member",
      description: "Team member with limited read permissions",
      isSystemRole: true,
      isDefault: true,
    },
    permissions: [{ title: "List Team Members", action: ACTIONS.MEMBERS_LIST }],
  },
];
