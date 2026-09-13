import { eq } from "drizzle-orm";
import { plans } from "@nuxfire/functions/schema";
import { FREE_PLAN } from "@nuxfire/functions/database/seed-data";

export { FREE_PLAN };

/**
 * Reactive safety net — see the matching doc comment on ensureSystemRoles()
 * in layers/teams/server/utils/roles.ts. The deterministic path is
 * packages/functions/src/database/seed.ts, which runs on every deploy with
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
