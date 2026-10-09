import { TRPCError } from "@trpc/server";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@nuxfire/functions/schema";
import { teamMemberships, teams } from "../database/schema";
import { ensureSystemRoles } from "./roles";

// Explicit imports only, no Nitro global: besides teams.create and billing
// (apps/app), the manual demo seed (apps/functions, a plain Bun script)
// creates its Space through this function too.

/**
 * The handle this function writes through: a transaction from
 * `useDB().transaction(...)` (apps/app) or from the seed's own drizzle client.
 * Taking it as an argument is what lets a caller compose the Space creation
 * with its own writes in one transaction (the onboarding, the billing claim).
 */
export type TeamCreationTx = Pick<
  PostgresJsDatabase<typeof schema>,
  "insert" | "select" | "query"
>;

export interface CreateTeamWithOwnerInput {
  name: string;
  slug: string;
  description?: string;
  ownerUserId: string;
  // Billing-only fields (a paid Space): `layers/teams` never decides them.
  planId?: string;
  maxSeats?: number | null;
  stripeCustomerId?: string | null;
}

export type Team = typeof teams.$inferSelect;

const SLUG_UNIQUE_CONSTRAINT = "Team_slug_unique";

/**
 * True for the Postgres unique-violation (23505) of `Team.slug`, whether the
 * driver error comes bare or wrapped by drizzle in `cause`. postgres.js names
 * the constraint `constraint_name`; `constraint` covers other drivers.
 */
function isSlugUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current && typeof current === "object") {
    const record = current as Record<string, unknown>;
    const constraint = record.constraint_name ?? record.constraint;
    if (record.code === "23505" && constraint === SLUG_UNIQUE_CONSTRAINT) {
      return true;
    }
    current = record.cause;
  }
  return false;
}

/**
 * FR-006, DEC-001: the only code that inserts into `teams`. Creates the Space
 * and its Owner membership through the given transaction, so no Space is ever
 * left without an Owner. The unique index on `Team.slug` decides a race; the
 * loser gets `CONFLICT "slug_taken"`. The slug is expected to be validated
 * already (`validateSlug` in shared/utils/slug.ts).
 */
export async function createTeamWithOwner(
  tx: TeamCreationTx,
  input: CreateTeamWithOwnerInput,
): Promise<Team> {
  await ensureSystemRoles(tx);
  const ownerRole = await tx.query.roles.findFirst({
    where: (role, { and, eq }) =>
      and(eq(role.name, "Owner"), eq(role.isSystemRole, true)),
  });
  if (!ownerRole) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Owner role could not be found or created",
    });
  }

  let team: Team | undefined;
  try {
    [team] = await tx
      .insert(teams)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        planId: input.planId,
        maxSeats: input.maxSeats,
        stripeCustomerId: input.stripeCustomerId,
      })
      .returning();
  } catch (error) {
    if (isSlugUniqueViolation(error)) {
      throw new TRPCError({ code: "CONFLICT", message: "slug_taken", cause: error });
    }
    throw error;
  }
  if (!team) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create team",
    });
  }

  await tx.insert(teamMemberships).values({
    teamId: team.id,
    userId: input.ownerUserId,
    roleId: ownerRole.id,
  });

  return team;
}
