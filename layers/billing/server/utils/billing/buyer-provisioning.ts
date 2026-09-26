import { and, eq } from "drizzle-orm";
import {
  teams,
  teamMemberships,
  roles,
} from "@nuxfire/layer-teams/server/database/schema";
import { ensureSystemRoles } from "@nuxfire/layer-teams/server/utils/roles";
import { PlanBuyerTeamMode } from "../../../shared/types/enums";
import { claimPendingPurchase } from "./pending-purchase-repository";
import type { PendingPurchaseRow } from "./pending-purchase-repository";

export interface ProvisionBuyerTeamInput {
  pendingPurchase: PendingPurchaseRow;
  plan: {
    id: string;
    buyerTeamMode: PlanBuyerTeamMode;
    buyerTeamId: string | null;
  };
  userId: string;
  teamName?: string;
  teamSlug?: string;
}

export type ProvisionRejectionReason =
  | "invalid_team_name"
  | "invalid_team_slug"
  | "slug_taken"
  | "destination_missing"
  | "destination_suspended"
  | "already_claimed";

export type ProvisionResult =
  | { ok: true; teamId: string; teamSlug: string }
  | { ok: false; reason: ProvisionRejectionReason };

const NAME_PATTERN = /^.{2,50}$/;
const SLUG_PATTERN = /^[a-z0-9-]{2,50}$/;

/**
 * Orchestrates FR-006/FR-007/FR-008: resolves `Plan.buyerTeamMode` into a
 * real team/membership and, as the last statement of one transaction,
 * flips the pending purchase to CLAIMED (`claimPendingPurchase`). PR-001: if
 * anything below throws or the final claim loses the race, the whole
 * transaction rolls back — no team or membership is left half-created.
 */
export async function provisionBuyerTeam(
  input: ProvisionBuyerTeamInput,
): Promise<ProvisionResult> {
  return input.plan.buyerTeamMode === PlanBuyerTeamMode.EXISTING_TEAM
    ? provisionExistingTeam(input)
    : provisionNewTeam(input);
}

async function provisionNewTeam(
  input: ProvisionBuyerTeamInput,
): Promise<ProvisionResult> {
  const name = input.teamName?.trim() ?? "";
  const slug = input.teamSlug?.trim() ?? "";
  if (!NAME_PATTERN.test(name)) return { ok: false, reason: "invalid_team_name" };
  if (!SLUG_PATTERN.test(slug)) return { ok: false, reason: "invalid_team_slug" };

  const existingTeam = await useDB().query.teams.findFirst({
    where: eq(teams.slug, slug),
  });
  if (existingTeam) return { ok: false, reason: "slug_taken" };

  await ensureSystemRoles();
  const ownerRole = await useDB().query.roles.findFirst({
    where: and(eq(roles.name, "Owner"), eq(roles.isSystemRole, true)),
  });
  if (!ownerRole) throw new Error("Owner role could not be found or created");

  return useDB().transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name,
        slug,
        planId: input.plan.id,
        stripeCustomerId: input.pendingPurchase.providerCustomerId,
      })
      .returning();
    if (!team) throw new Error("Failed to create team");

    await tx.insert(teamMemberships).values({
      teamId: team.id,
      userId: input.userId,
      roleId: ownerRole.id,
    });

    const claimed = await claimPendingPurchase(
      tx,
      input.pendingPurchase.id,
      input.userId,
      team.id,
    );
    if (!claimed) return { ok: false, reason: "already_claimed" };

    return { ok: true, teamId: team.id, teamSlug: team.slug };
  });
}

async function provisionExistingTeam(
  input: ProvisionBuyerTeamInput,
): Promise<ProvisionResult> {
  const teamId = input.plan.buyerTeamId;
  if (!teamId) return { ok: false, reason: "destination_missing" };

  const team = await useDB().query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
  if (!team) return { ok: false, reason: "destination_missing" };
  if (team.status !== "ACTIVE") return { ok: false, reason: "destination_suspended" };

  await ensureSystemRoles();
  const memberRole = await useDB().query.roles.findFirst({
    where: and(eq(roles.name, "Member"), eq(roles.isSystemRole, true)),
  });
  if (!memberRole) throw new Error("Member role could not be found or created");

  return useDB().transaction(async (tx) => {
    const existingMembership = await tx.query.teamMemberships.findFirst({
      where: and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.userId, input.userId),
      ),
    });
    if (!existingMembership) {
      await tx.insert(teamMemberships).values({
        teamId,
        userId: input.userId,
        roleId: memberRole.id,
      });
    }

    await tx.update(teams).set({ planId: input.plan.id }).where(eq(teams.id, teamId));

    const claimed = await claimPendingPurchase(
      tx,
      input.pendingPurchase.id,
      input.userId,
      teamId,
    );
    if (!claimed) return { ok: false, reason: "already_claimed" };

    return { ok: true, teamId, teamSlug: team.slug };
  });
}
