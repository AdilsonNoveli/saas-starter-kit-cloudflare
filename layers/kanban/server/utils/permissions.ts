import { and, eq } from "drizzle-orm";
import { permissions, roles } from "@nuxfire/functions/schema";
import { KANBAN_PERMISSIONS } from "../../shared/utils/permissions";

// `useDB()` is auto-imported by Nitro from the Composition Root's server/ dir.

type KanbanPermissionEntry = {
  title: string;
  action: string;
};

/** Permissions each system role should receive for the kanban layer. */
const ROLE_KANBAN_PERMISSIONS: Record<string, KanbanPermissionEntry[]> = {
  Owner: [
    { title: "View Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.VIEW },
    { title: "Create Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.CREATE },
    { title: "Update Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.UPDATE },
    { title: "Delete Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.DELETE },
    { title: "Create Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.CREATE },
    { title: "Update Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.UPDATE },
    { title: "Move Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.MOVE },
    { title: "Delete Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.DELETE },
  ],
  Admin: [
    { title: "View Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.VIEW },
    { title: "Create Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.CREATE },
    { title: "Update Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.UPDATE },
    { title: "Delete Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.DELETE },
    { title: "Create Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.CREATE },
    { title: "Update Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.UPDATE },
    { title: "Move Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.MOVE },
    { title: "Delete Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.DELETE },
  ],
  Member: [
    { title: "View Kanban Boards", action: KANBAN_PERMISSIONS.BOARDS.VIEW },
    { title: "Create Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.CREATE },
    { title: "Update Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.UPDATE },
    { title: "Move Kanban Cards", action: KANBAN_PERMISSIONS.CARDS.MOVE },
  ],
};

/**
 * Ensures all system roles have the kanban permissions they need.
 *
 * Safe to call on every request: the Permission table has a composite primary
 * key on (action, roleId), so `onConflictDoNothing()` turns duplicate inserts
 * into no-ops. The in-process flag short-circuits after the first successful
 * backfill so we pay one extra SELECT per process startup, not one per request.
 *
 * This is the kanban-layer counterpart to `ensureSystemRoles()` in
 * layers/teams/server/utils/roles.ts — both are reactive safety nets for
 * databases that were seeded before this layer existed.
 */
let kanbanPermissionsEnsured = false;

export async function ensureKanbanPermissions() {
  if (kanbanPermissionsEnsured) return;

  // Fast path: if any kanban permission already exists, the backfill ran.
  const [existing] = await useDB()
    .select({ action: permissions.action })
    .from(permissions)
    .where(eq(permissions.action, KANBAN_PERMISSIONS.BOARDS.VIEW))
    .limit(1);

  if (existing) {
    kanbanPermissionsEnsured = true;
    return;
  }

  // Fetch each system role by name and insert missing kanban permissions.
  for (const [roleName, rolePerms] of Object.entries(ROLE_KANBAN_PERMISSIONS)) {
    const role = await useDB().query.roles.findFirst({
      where: and(eq(roles.name, roleName), eq(roles.isSystemRole, true)),
    });
    if (!role || rolePerms.length === 0) continue;

    await useDB()
      .insert(permissions)
      .values(rolePerms.map((p) => ({ ...p, roleId: role.id })))
      .onConflictDoNothing();
  }

  kanbanPermissionsEnsured = true;
}
