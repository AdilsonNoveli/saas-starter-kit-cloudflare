import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
  teams,
  teamMemberships,
  roles,
} from "@nuxfire/layer-teams/server/database/schema";
import { ensureSystemRoles } from "@nuxfire/layer-teams/server/utils/roles";
import { createTeamWithOwner } from "@nuxfire/layer-teams/server/utils/team-creation";
import { validateSlug } from "@nuxfire/layer-teams/shared/utils/slug";
import { PlanBuyerTeamMode } from "../../../shared/types/enums";
import { claimPendingPurchase } from "./pending-purchase-repository";
import type { PendingPurchaseRow } from "./pending-purchase-repository";

export type CheckoutStartRejectionReason =
  | "plan_archived"
  | "no_price"
  | "no_provider"
  | "destination_missing"
  | "destination_suspended";

export type CheckoutStartValidation =
  | { ok: true }
  | { ok: false; reason: CheckoutStartRejectionReason };

/**
 * FR-002: refuses a checkout before any provider is involved, for the same
 * reasons `provisionExistingTeam` refuses a claim — taking a payment for a
 * plan or destination already known to be dead is worse than refusing
 * upfront. Re-run again at claim time (`provisionBuyerTeam`) rather than
 * trusted from here, since the destination can change in between.
 *
 * `Plan.provider` is a single nullable column, not a pair of provider flags:
 * a plan is configured for exactly one provider (Stripe or Paddle), so
 * `startBuyerCheckout` derives which one to use from the plan itself rather
 * than trusting a caller-supplied choice.
 */
export async function validateBuyerCheckoutPlan(plan: {
  isArchived: boolean;
  provider: string | null;
  providerPriceId: string | null;
  buyerTeamMode: string;
  buyerTeamId: string | null;
}): Promise<CheckoutStartValidation> {
  if (plan.isArchived) return { ok: false, reason: "plan_archived" };
  if (!plan.provider) return { ok: false, reason: "no_provider" };
  if (!plan.providerPriceId) return { ok: false, reason: "no_price" };

  if (plan.buyerTeamMode === PlanBuyerTeamMode.EXISTING_TEAM) {
    if (!plan.buyerTeamId) return { ok: false, reason: "destination_missing" };
    const destination = await useDB().query.teams.findFirst({
      where: eq(teams.id, plan.buyerTeamId),
    });
    if (!destination) return { ok: false, reason: "destination_missing" };
    if (destination.status !== "ACTIVE") return { ok: false, reason: "destination_suspended" };
  }

  return { ok: true };
}

export interface ProvisionBuyerTeamInput {
  pendingPurchase: PendingPurchaseRow;
  plan: {
    id: string;
    buyerTeamMode: PlanBuyerTeamMode;
    buyerTeamId: string | null;
    // Denormalized onto `Team.maxSeats` alongside `planId` below (SPEC-0005):
    // `layers/teams` has no relation to `Plan` any more, so seat-limit
    // enforcement there reads this column directly instead of joining.
    maxSeats: number | null;
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
  // The one slug rule (layers/teams/shared/utils/slug.ts): a reserved slug is
  // as unusable here as a malformed one.
  if (validateSlug(slug) !== "ok") return { ok: false, reason: "invalid_team_slug" };

  // Fast path for the common case; the unique index on `Team.slug` still
  // decides a race, surfaced by createTeamWithOwner as "slug_taken" below.
  const existingTeam = await useDB().query.teams.findFirst({
    where: eq(teams.slug, slug),
  });
  if (existingTeam) return { ok: false, reason: "slug_taken" };

  try {
    return await useDB().transaction(async (tx) => {
      const team = await createTeamWithOwner(tx, {
        name,
        slug,
        ownerUserId: input.userId,
        planId: input.plan.id,
        maxSeats: input.plan.maxSeats,
        stripeCustomerId: input.pendingPurchase.providerCustomerId,
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
  } catch (error) {
    if (error instanceof TRPCError && error.message === "slug_taken") {
      return { ok: false, reason: "slug_taken" };
    }
    throw error;
  }
}

/**
 * Where the buyer lands, as a stable shape and never as a sentence (FR-004,
 * FR-016): the server does not know the reader's language, so the claim page
 * (`checkout.getPendingPurchase`) words it from `billing.claim.destination.*`
 * and the claim e-mail from its own texts in `packages/emails`.
 */
export type BuyerDestination =
  | { kind: "new_space" }
  | { kind: "existing_space"; name: string }
  | { kind: "missing_space" };

export async function describeBuyerDestination(plan: {
  // `string`, not `PlanBuyerTeamMode`: `Plan.buyerTeamMode` is a plain text
  // column (like every other status-like field in this schema), so callers
  // reading a row straight from the database hand this whatever string is
  // stored, not the narrowed write-side type.
  buyerTeamMode: string;
  buyerTeamId: string | null;
}): Promise<BuyerDestination> {
  if (plan.buyerTeamMode === PlanBuyerTeamMode.NEW_TEAM) {
    return { kind: "new_space" };
  }
  if (!plan.buyerTeamId) return { kind: "missing_space" };
  const team = await useDB().query.teams.findFirst({
    where: eq(teams.id, plan.buyerTeamId),
  });
  return team ? { kind: "existing_space", name: team.name } : { kind: "missing_space" };
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

  await ensureSystemRoles(useDB());
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

    await tx
      .update(teams)
      .set({ planId: input.plan.id, maxSeats: input.plan.maxSeats })
      .where(eq(teams.id, teamId));

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
