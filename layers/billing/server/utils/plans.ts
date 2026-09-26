import { and, eq } from "drizzle-orm";
import { plans } from "@nuxfire/functions/schema";
import { FREE_PLAN } from "@nuxfire/functions/database/seed-data";
import { formatPlanPrice } from "./stripe-catalog";

export { FREE_PLAN };

/**
 * Reactive safety net — see the matching doc comment on ensureSystemRoles()
 * in layers/teams/server/utils/roles.ts. The deterministic path is
 * apps/functions/src/database/seed/index.ts, which runs on every deploy with
 * `app: true` (infra/utils/nuxt.ts, right after migrations); this only
 * covers a database reset independently of an app deploy.
 */
export async function ensureFreePlan() {
  const [existingFreePlan] = await useDB()
    .select()
    .from(plans)
    .where(eq(plans.tier, "FREE"));

  if (!existingFreePlan) {
    // Without .returning(), postgres.js hands back an empty result for an
    // INSERT with no RETURNING clause — callers (teams.create) then read
    // `.id` off that and insert a team with planId: undefined, which Plan's
    // NOT NULL constraint rejects. Reproduced against the database: this is
    // exactly what made every team creation fail on a fresh install, where
    // Plan starts empty.
    const [newFreePlan] = await useDB()
      .insert(plans)
      .values(FREE_PLAN)
      .returning();
    return newFreePlan;
  }

  return existingFreePlan;
}

export interface PublicOfferPlan {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  period: string;
}

/**
 * The plan advertised on apps/web's landing page Buy CTA, or `null` while the
 * admin has not designated one (or it was archived without a replacement
 * being set). Read live by `server/api/public/offer.get.ts` — no caller
 * needs to already know a `planId`, unlike `checkout.getPlanSummary`.
 */
export async function getPublicOfferPlan(): Promise<PublicOfferPlan | null> {
  const plan = await useDB().query.plans.findFirst({
    where: and(eq(plans.isPublicOffer, true), eq(plans.isArchived, false)),
  });
  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceLabel:
      plan.unitAmount !== null && plan.currency
        ? formatPlanPrice(plan.unitAmount, plan.currency)
        : plan.price,
    period: plan.period,
  };
}

/**
 * The single write path for enforcing "`isPublicOffer` is true on at most one
 * plan" (admin-plans.ts's create/update mutations) — the same way a "default
 * payment method" or "primary address" is usually kept unique: a
 * low-frequency, admin-driven write, not a hot path that needs a partial
 * unique index. Always call this inside the same transaction as, and right
 * before, the plan's own insert/update that sets `isPublicOffer: true` — the
 * final state only depends on that later write, so clearing every row first
 * (including the one about to be re-set) is simpler than excluding it and no
 * less correct within one transaction.
 */
export async function clearPublicOffer(
  tx: Pick<ReturnType<typeof useDB>, "update">,
): Promise<void> {
  await tx
    .update(plans)
    .set({ isPublicOffer: false })
    .where(eq(plans.isPublicOffer, true));
}

export async function addPlan(planDetails: {
  name: string;
  description: string;
  tier: string;
  period: string;
  price: string;
  provider: string;
  providerPriceId?: string;
}) {
  try {
    const newPlan = await useDB().insert(plans).values({
      name: planDetails.name,
      description: planDetails.description,
      tier: planDetails.tier,
      price: planDetails.price,
      period: planDetails.period,
      provider: planDetails.provider,
      providerPriceId: planDetails.providerPriceId,
    });
    console.log(`Created plan: ${planDetails.name}`);
    return newPlan;
  } catch (error) {
    console.error(`Error adding plan ${planDetails.name}:`, error);
    throw error;
  }
}
