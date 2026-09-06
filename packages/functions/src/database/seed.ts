// Deploy-time database seed. Run directly with `bun run` against
// DATABASE_HOST/PORT/USER/PASSWORD/NAME (same variables and dbCredentials
// shape as drizzle.config.ts) — see infra/utils/nuxt.ts, where this runs as
// a command:local:Command right after migrations, for every deploy that has
// `app: true`, fresh installs included.
//
// This is the deterministic counterpart to server/utils/roles.ts's
// ensureSystemRoles() and server/utils/plans.ts's ensureFreePlan(), which
// exist as a reactive safety net for the case this file doesn't cover: a
// database reset independently of an app deploy (swapped instance, dropped
// and re-migrated) between two deploys. Both paths import the same data
// from ./seed-data.ts so they can't drift apart.
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { FREE_PLAN, SYSTEM_ROLES } from "./seed-data";

async function main() {
  const sql = postgres({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: "require",
    max: 1,
  });
  const db = drizzle(sql, { schema });

  try {
    const [existingPlan] = await db
      .select({ id: schema.plans.id })
      .from(schema.plans)
      .where(eq(schema.plans.tier, "FREE"));
    if (existingPlan) {
      console.log("seed: free plan already exists, skipping");
    } else {
      await db.insert(schema.plans).values(FREE_PLAN);
      console.log("seed: created free plan");
    }

    const [existingRole] = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.isSystemRole, true))
      .limit(1);
    if (existingRole) {
      console.log("seed: system roles already exist, skipping");
    } else {
      for (const { role, permissions } of SYSTEM_ROLES) {
        const [inserted] = await db
          .insert(schema.roles)
          .values(role)
          .returning({ id: schema.roles.id });
        if (permissions.length) {
          await db
            .insert(schema.permissions)
            .values(permissions.map((p) => ({ ...p, roleId: inserted.id })));
        }
      }
      console.log("seed: created system roles (Owner, Admin, Member)");
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("seed: failed", error);
  process.exit(1);
});
