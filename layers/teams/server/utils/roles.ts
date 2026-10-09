import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { permissions, roles } from "@nuxfire/functions/schema";
import type * as schema from "@nuxfire/functions/schema";
import { SYSTEM_ROLES } from "@nuxfire/functions/database/seed-data";

// The database handle is a parameter, not the Nitro `useDB()` global:
// `createTeamWithOwner` runs this inside its own transaction, and the manual
// demo seed (apps/functions, a plain Bun script with no Nitro) reaches it
// through that function.
//
// Kept in `server/utils/`, not `shared/utils/`: this is not framework-agnostic
// logic. It opens a database connection and writes rows; nothing client-side
// can or should call it.

type RolesDatabase = Pick<PostgresJsDatabase<typeof schema>, "insert" | "select">;

async function insertSystemRole(
  db: RolesDatabase,
  role: typeof roles.$inferInsert,
  rolePermissions: Omit<typeof permissions.$inferInsert, "roleId">[],
) {
  const [inserted] = await db
    .insert(roles)
    .values(role)
    .returning({ id: roles.id });
  if (!inserted) {
    throw new Error(`Failed to insert system role "${role.name}"`);
  }
  if (rolePermissions.length) {
    await db
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
export async function ensureSystemRoles(db: RolesDatabase) {
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.isSystemRole, true))
    .limit(1);
  if (existing) return;

  for (const { role, permissions: rolePermissions } of SYSTEM_ROLES) {
    await insertSystemRole(db, role, rolePermissions);
  }
}
