// Creates the two demonstration accounts a starter-kit buyer logs in with:
// the platform owner (SUPER_ADMIN, reaches /admin) and a plain tenant client
// (member of a demo team, reaches nothing but their own team).
//
// MANUAL ONLY, for the same reason as grant-platform-admin.ts and then some:
// this script writes *known passwords*. Wiring it into infra/utils/nuxt.ts
// would put a published credential into every deploy. It also cannot run at
// deploy time even if you wanted it to — it needs the auth Worker's public URL,
// which only exists once that Worker is already deployed.
//
// It straddles two systems, so it needs both sets of variables:
//
//  - Postgres, the same DATABASE_* variables as seed.ts and drizzle.config.ts.
//  - The auth Worker, because credentials live in AuthKV, which is bound to
//    that Worker and nowhere else. This script POSTs to seedAccountPath
//    (config.ts) instead of writing the credential itself:
//      AUTH_URL          — the auth Worker's public URL. Same value infra/app.ts
//                          passes to the app as NUXT_PUBLIC_AUTH_URL (from
//                          `authUrl` in infra/dns.ts); that name is accepted as
//                          a fallback so it can be pasted straight across.
//      AUTH_ADMIN_SECRET — the shared secret guarding every /internal/identity/*
//                          route. Generated per stage by infra/auth.ts's
//                          `adminSecret` (random.RandomUuid, never in .env) and
//                          handed to the app as NUXT_AUTH_ADMIN_SECRET, which is
//                          likewise accepted as a fallback. Read it out of the
//                          deployed app Worker's variables.
//
//   cd packages/functions
//   bun run src/database/seed-demo-accounts.ts \
//     --owner-email=owner@nuxfire.com --owner-password=owner@12345678 \
//     --client-email=client@nuxfire.com --client-password=client@12345678
//
// Idempotent end to end: run it again and it resets the passwords, reuses the
// identity ids already in KV, and leaves a single demo team behind.
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { seedAccountPath } from "../../../../config";

const DEMO_TEAM_NAME = "Demo Company";
const DEMO_TEAM_SLUG = "demo-company";

function parseArgs() {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args.set(match[1], match[2]);
  }
  return {
    ownerEmail: args.get("owner-email") ?? "owner@nuxfire.com",
    ownerPassword: args.get("owner-password") ?? "owner@12345678",
    clientEmail: args.get("client-email") ?? "client@nuxfire.com",
    clientPassword: args.get("client-password") ?? "client@12345678",
  };
}

/**
 * Writes the credential and profile into AuthKV through the auth Worker, and
 * returns the identity id it filed them under — which becomes the OAuth
 * subject id, and therefore the User.id every Postgres row below must use.
 */
async function seedIdentity(
  authUrl: string,
  adminSecret: string,
  body: { email: string; password: string; name: string },
) {
  const response = await fetch(`${authUrl}${seedAccountPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-secret": adminSecret,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `auth Worker refused to seed ${body.email}: ${response.status} ${await response.text()}`,
    );
  }
  return (await response.json()) as {
    id: string;
    email: string;
    created: boolean;
  };
}

async function main() {
  const { ownerEmail, ownerPassword, clientEmail, clientPassword } =
    parseArgs();

  const authUrl = (
    process.env.AUTH_URL ??
    process.env.NUXT_PUBLIC_AUTH_URL ??
    ""
  ).replace(/\/$/, "");
  const adminSecret =
    process.env.AUTH_ADMIN_SECRET ?? process.env.NUXT_AUTH_ADMIN_SECRET ?? "";
  if (!authUrl || !adminSecret) {
    throw new Error(
      "AUTH_URL and AUTH_ADMIN_SECRET must be set — see the header comment for where each value comes from",
    );
  }

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
    // --- platform owner -----------------------------------------------------
    const owner = await seedIdentity(authUrl, adminSecret, {
      email: ownerEmail,
      password: ownerPassword,
      name: "Platform Owner",
    });
    await upsertUser(db, owner.id, ownerEmail, "Platform Owner");

    // Same idempotent shape as grant-platform-admin.ts: PlatformAdmin.userId is
    // unique, and a soft-revoked row is restored rather than replaced so the
    // audit trail keeps pointing at the same id.
    const [existingAdmin] = await db
      .select()
      .from(schema.platformAdmins)
      .where(eq(schema.platformAdmins.userId, owner.id));
    if (existingAdmin) {
      if (existingAdmin.revokedAt || existingAdmin.role !== "SUPER_ADMIN") {
        await db
          .update(schema.platformAdmins)
          .set({ role: "SUPER_ADMIN", revokedAt: null })
          .where(eq(schema.platformAdmins.id, existingAdmin.id));
      }
    } else {
      await db
        .insert(schema.platformAdmins)
        .values({ userId: owner.id, role: "SUPER_ADMIN" });
    }

    // --- demo client --------------------------------------------------------
    const client = await seedIdentity(authUrl, adminSecret, {
      email: clientEmail,
      password: clientPassword,
      name: "Demo Client",
    });
    await upsertUser(db, client.id, clientEmail, "Demo Client");

    const [freePlan] = await db
      .select({ id: schema.plans.id })
      .from(schema.plans)
      .where(eq(schema.plans.tier, "FREE"));
    if (!freePlan) {
      throw new Error(
        "no FREE plan found — run src/database/seed.ts first (it runs on every deploy)",
      );
    }
    const [ownerRole] = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(
        and(
          eq(schema.roles.name, "Owner"),
          eq(schema.roles.isSystemRole, true),
        ),
      );
    if (!ownerRole) {
      throw new Error(
        "no system Owner role found — run src/database/seed.ts first",
      );
    }

    // Matched on the slug, which is what makes a second run reuse the team
    // instead of stacking up another "Demo Company" beside it.
    let [team] = await db
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(eq(schema.teams.slug, DEMO_TEAM_SLUG));
    if (!team) {
      [team] = await db
        .insert(schema.teams)
        .values({
          name: DEMO_TEAM_NAME,
          slug: DEMO_TEAM_SLUG,
          description: "Sample tenant for the demo client account.",
          planId: freePlan.id,
        })
        .returning({ id: schema.teams.id });
    }

    // (teamId, userId) is unique, so this is the natural idempotent insert.
    await db
      .insert(schema.teamMemberships)
      .values({ teamId: team.id, userId: client.id, roleId: ownerRole.id })
      .onConflictDoNothing();

    console.log("seed-demo-accounts: done");
    console.log(`  platform owner : ${ownerEmail} / ${ownerPassword}`);
    console.log(`  demo client    : ${clientEmail} / ${clientPassword}`);
    console.log(`  demo team      : ${DEMO_TEAM_NAME} (${DEMO_TEAM_SLUG})`);
    console.log(
      "seed-demo-accounts: the owner still has to enrol in MFA on first login at /admin — a platform-admin row alone opens nothing",
    );
  } finally {
    await sql.end();
  }
}

/**
 * Keyed on the identity id, never on the email — the same rule the login
 * callback follows (packages/app/server/api/auth/callback.ts), and for the same
 * reason: the address is an attribute of the identity and can change, the
 * subject id cannot.
 *
 * A unique-violation on `email` here means a *different* id already owns that
 * address, which only happens if AuthKV was wiped independently of Postgres.
 * Failing is the correct outcome: silently rewriting the id would orphan every
 * TeamMembership pointing at the old one.
 */
function upsertUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  id: string,
  email: string,
  name: string,
) {
  return db
    .insert(schema.users)
    .values({ id, email, name })
    .onConflictDoUpdate({ target: schema.users.id, set: { email, name } });
}

main().catch((error) => {
  console.error("seed-demo-accounts: failed", error);
  process.exit(1);
});
