import { eq } from "drizzle-orm";
import { permissions, roles } from "@nuxfire/functions/schema";
import { SYSTEM_ROLES } from "@nuxfire/functions/database/seed-data";

// `useDB()`, `InsertRole` and `InsertPermission` are unimported on purpose —
// Nitro auto-imports them, and its scan covers every active layer's `server/`
// dir, not only the Composition Root's. See the longer note in team-seats.ts.
//
// Kept in `server/utils/`, not `shared/utils/`: this is not framework-agnostic
// logic. It opens a database connection and writes rows; nothing client-side
// can or should call it.

async function insertSystemRole(
  role: InsertRole,
  rolePermissions: Omit<InsertPermission, "roleId">[],
) {
  const [inserted] = await useDB()
    .insert(roles)
    .values(role)
    .returning({ id: roles.id });
  if (!inserted) {
    throw new Error(`Failed to insert system role "${role.name}"`);
  }
  if (rolePermissions.length) {
    await useDB()
      .insert(permissions)
      .values(
        rolePermissions.map((permission) => ({
          ...permission,
          roleId: inserted.id,
        })),
      );
  }
  return inserted;
}

/**
 * Reactive safety net: creates Owner/Admin/Member the first time anything
 * needs one, in case Role is found empty at request time.
 *
 * The deterministic path is apps/functions/src/database/seed/index.ts, which
 * runs as part of every deploy with `app: true` (infra/utils/nuxt.ts), fresh
 * installs included — this only matters for the gap that leaves open: a
 * database reset independently of an app deploy (swapped instance, dropped
 * and re-migrated) between two deploys. Both paths import the same role
 * definitions from @nuxfire/functions/database/seed-data, so they
 * cannot drift apart.
 *
 * Guarded by the actual table state, not a flag that could outlive the rows
 * it describes — which is exactly the failure mode this replaced: db:seed's
 * old KV-flag guard stayed "done" across a database reset that emptied
 * Role, and nothing re-ran it. Existence of any system role is enough to
 * skip: seeding is all-or-nothing here (three roles created together as a
 * set), it's just re-checked against the source of truth.
 */
export async function ensureSystemRoles() {
  const [existing] = await useDB()
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.isSystemRole, true))
    .limit(1);
  if (existing) return;

  for (const { role, permissions: rolePermissions } of SYSTEM_ROLES) {
    await insertSystemRole(role, rolePermissions);
  }
}
