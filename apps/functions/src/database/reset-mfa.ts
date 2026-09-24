// Break-glass reset of a lost second factor: the last resort once both the
// authenticator and every recovery code are gone.
//
// MANUAL ONLY, for the same reason as grant-platform-admin.ts: never wired into
// a deploy step. It removes the TOTP seed and the recovery codes of one factor,
// so the account enrols again from scratch, and writes an AuditLog row so the
// reset is never silent. Run it by hand, from apps/functions, against the same
// DATABASE_* variables as seed.ts, after confirming out of band that the person
// asking really owns the account:
//
//   bun run src/database/reset-mfa.ts --email=you@example.com --scope=user
//   bun run src/database/reset-mfa.ts --email=you@example.com --scope=platform
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const SCOPES = ["user", "platform"] as const;
type Scope = (typeof SCOPES)[number];

function parseArgs() {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args.set(match[1], match[2]);
  }

  const email = args.get("email");
  const scope = args.get("scope");
  const usage =
    "usage: bun run src/database/reset-mfa.ts --email=<email> --scope=<user|platform>";

  if (!email) {
    throw new Error(`missing --email\n${usage}`);
  }
  if (!scope || !SCOPES.includes(scope as Scope)) {
    throw new Error(`--scope must be one of ${SCOPES.join(" | ")}\n${usage}`);
  }
  return { email, scope: scope as Scope };
}

async function main() {
  const { email, scope } = parseArgs();

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
      throw new Error(`no user found with email ${email}`);
    }

    let targetType: "user" | "platformAdmin" = "user";
    let targetId = user.id;

    if (scope === "platform") {
      const [admin] = await db
        .select({ id: schema.platformAdmins.id })
        .from(schema.platformAdmins)
        .where(eq(schema.platformAdmins.userId, user.id));
      if (!admin) {
        throw new Error(`${email} is not a platform admin`);
      }
      targetType = "platformAdmin";
      targetId = admin.id;
    }

    await db.transaction(async (tx) => {
      if (scope === "platform") {
        await tx
          .update(schema.platformAdmins)
          .set({ mfaSecret: null, mfaEnabledAt: null })
          .where(eq(schema.platformAdmins.id, targetId));
      } else {
        await tx
          .update(schema.users)
          .set({ mfaSecret: null, mfaEnabledAt: null })
          .where(eq(schema.users.id, user.id));
      }
      await tx
        .delete(schema.mfaRecoveryCodes)
        .where(
          and(
            eq(schema.mfaRecoveryCodes.userId, user.id),
            eq(schema.mfaRecoveryCodes.scope, scope),
          ),
        );
      await tx.insert(schema.auditLogs).values({
        actorUserId: "cli:reset-mfa",
        action: `${targetType}.mfa.reset`,
        targetType,
        targetId,
        metadata: { via: "reset-mfa.ts", scope },
      });
    });

    console.log(
      `reset-mfa: cleared the ${scope} second factor for ${email}; it must enrol again`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("reset-mfa: failed", error);
  process.exit(1);
});
