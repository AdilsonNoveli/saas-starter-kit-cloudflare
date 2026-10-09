// Grants (or restores) platform-owner authority to an existing user.
//
// MANUAL ONLY. Unlike seed.ts, this is deliberately NOT wired into
// infra/utils/nuxt.ts or any other deploy step: a script like this running on
// every deploy turns one forgotten environment variable into a permanent
// super-admin nobody remembers creating. Run it by hand, from
// apps/functions, against the same DATABASE_* variables as seed.ts:
//
//   bun run src/database/grant-platform-admin.ts --email=you@example.com --role=SUPER_ADMIN
//
// Granting only creates the row. The account still cannot reach anything
// under `platformAdminProcedure` until it enrols in MFA via
// POST /api/admin/mfa/setup and /verify.
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const PLATFORM_ROLES = schema.platformRoleEnum.enumValues;
type PlatformRole = (typeof PLATFORM_ROLES)[number];

function parseArgs() {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args.set(match[1], match[2]);
  }

  const email = args.get("email");
  const role = args.get("role");
  const usage =
    "usage: bun run src/database/grant-platform-admin.ts --email=<email> --role=<SUPER_ADMIN|SUPPORT>";

  if (!email) {
    throw new Error(`missing --email\n${usage}`);
  }
  if (!role || !PLATFORM_ROLES.includes(role as PlatformRole)) {
    throw new Error(
      `--role must be one of ${PLATFORM_ROLES.join(" | ")}\n${usage}`,
    );
  }
  return { email, role: role as PlatformRole };
}

async function main() {
  const { email, role } = parseArgs();

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
    const [user] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email));
    if (!user) {
      // The user has to have signed in at least once: this script grants
      // authority to an existing identity, it never creates one.
      throw new Error(`no user found with email ${email}`);
    }

    const [existing] = await db
      .select()
      .from(schema.platformAdmins)
      .where(eq(schema.platformAdmins.userId, user.id));

    if (existing) {
      if (!existing.revokedAt && existing.role === role) {
        console.log(
          `grant-platform-admin: ${email} is already a ${role}, nothing to do`,
        );
        return;
      }
      // `PlatformAdmin.userId` is unique, so there is no second row to insert
      // — and a soft-revoked row is meant to be restored rather than replaced,
      // keeping the audit trail pointing at the same id.
      await db
        .update(schema.platformAdmins)
        .set({ role, revokedAt: null })
        .where(eq(schema.platformAdmins.id, existing.id));
      console.log(
        existing.revokedAt
          ? `grant-platform-admin: reactivated ${email} as ${role}`
          : `grant-platform-admin: changed ${email} from ${existing.role} to ${role}`,
      );
    } else {
      await db.insert(schema.platformAdmins).values({ userId: user.id, role });
      console.log(`grant-platform-admin: granted ${role} to ${email}`);
    }

    console.log(
      "grant-platform-admin: MFA enrolment (POST /api/admin/mfa/setup) is still required before this account can use any platform-admin endpoint",
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("grant-platform-admin: failed", error);
  process.exit(1);
});
