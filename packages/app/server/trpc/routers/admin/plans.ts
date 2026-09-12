import { TRPCError } from "@trpc/server";
import type { H3Event } from "h3";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { platformAdminProcedure, router } from "../../trpc";
import { plans, teams } from "@nuxfire/functions/schema";
import {
  PaymentProvider,
  PLAN_BILLING_INTERVALS,
  STRIPE_PLAN_CURRENCIES,
} from "~~/types/enums";
import {
  STRIPE_CANCEL_CONFIG_KV_KEY,
  createStripeCancelConfiguration,
} from "~~/server/utils/stripe-portal";
import {
  formatPlanPrice,
  planCatalogNeedsSync,
  syncStripePlanCatalog,
} from "~~/server/utils/stripe-catalog";

/**
 * The editable surface of a plan, defined once and reused by both mutations:
 * `createPlan` takes it as-is, `updatePlan` takes `.partial()` of it. Two
 * separate schemas would drift the moment a column is added.
 *
 * `tier` stays a free-form string on purpose — the column has no enum and the
 * app compares it as text ("FREE"/"PRO"), so narrowing it here would reject
 * plans the database itself accepts.
 *
 * `amount`/`currency` are not `.refine()`d as required-when-Stripe here: that
 * would break `.partial()` for `updatePlan` (Zod refinements can't be made
 * partial), and a partial edit needs the *merged* provider/amount/currency —
 * existing row plus this payload — to judge, not the payload alone. That
 * check lives in `resolvePlanPricing` below instead.
 */
const planFieldsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  tier: z.string().trim().min(1).max(50),
  // Display string. No `.min(1)` here on purpose: a Stripe-managed plan
  // derives this server-side from amount+currency (see resolvePlanPricing)
  // and submits it empty, so "must be non-empty" only actually applies to a
  // non-Stripe plan — enforced in resolvePlanPricing, where the effective
  // provider (merged with the existing row) is known, not here.
  price: z.string().trim().max(50),
  // Constrained to what Stripe's `recurring.interval` accepts (and what
  // billing.vue's monthly/yearly toggle compares against exactly): a plan
  // saved with any other spelling used to make the toggle silently drop it.
  period: z.enum(PLAN_BILLING_INTERVALS),
  // Closed set rather than free text. As free text, a plan saved as "stripe"
  // matched no branch in the checkout UI and its buy button silently did
  // nothing. Restricted to the providers that actually have a checkout path —
  // accepting a value with no implementation just recreates that failure under
  // a different string.
  provider: z
    .enum([PaymentProvider.STRIPE, PaymentProvider.PADDLE])
    .nullable()
    .optional(),
  // Manual entry path — still how a Paddle plan's price gets set (Paddle's
  // catalog isn't managed from here), and the escape hatch for a Stripe price
  // that predates this router. Ignored for a Stripe-managed plan in favor of
  // whatever syncing amount/currency produces.
  providerPriceId: z.string().trim().max(200).nullable().optional(),
  // Decimal, major-unit amount (e.g. 179 for R$179,00) — converted to
  // Stripe's minor-unit `unitAmount` server-side. Required, together with
  // `currency`, only when the effective provider is Stripe.
  amount: z.number().nonnegative().nullable().optional(),
  currency: z.enum(STRIPE_PLAN_CURRENCIES).nullable().optional(),
  // null = unlimited. A limit of zero would be a plan nobody can use, so the
  // floor is 1 and "no limit" is expressed by the null, not by a number.
  maxSeats: z.number().int().positive().nullable().optional(),
  limits: z.record(z.string(), z.unknown()).nullable().optional(),
});

type PlanRow = typeof plans.$inferSelect;

interface ResolvedPlanPricing {
  price: string;
  providerPriceId: string | null;
  providerProductId: string | null;
  unitAmount: number | null;
  currency: string | null;
}

/**
 * Decides what a plan's price-related columns should hold after a create or
 * update, syncing with Stripe when the effective provider is Stripe and an
 * amount/currency/period actually changed. `effective*` values are already
 * merged with the existing row by the caller — this function only needs the
 * final, resolved picture, not which fields the request happened to include.
 */
async function resolvePlanPricing(
  event: H3Event,
  effective: {
    provider: string | null;
    period: string;
    name: string;
    description: string;
    amount: number | null;
    currency: string | null;
    fallbackPrice: string;
  },
  existing: {
    unitAmount: number | null;
    currency: string | null;
    period: string | null;
    providerProductId: string | null;
    providerPriceId: string | null;
  },
): Promise<ResolvedPlanPricing> {
  if (effective.provider !== PaymentProvider.STRIPE) {
    if (!effective.fallbackPrice.trim()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Price is required",
      });
    }

    // Paddle's catalog is managed in Paddle's own dashboard, and a Free plan
    // has no catalog at all — both keep the manually-entered price/price ID
    // exactly as before this router could sync anything.
    return {
      price: effective.fallbackPrice,
      providerPriceId: existing.providerPriceId,
      providerProductId: existing.providerProductId,
      unitAmount: null,
      currency: null,
    };
  }

  if (effective.amount == null || !effective.currency) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Amount and currency are required for a Stripe-managed plan",
    });
  }

  if (!PLAN_BILLING_INTERVALS.includes(effective.period as never)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Period must be one of: ${PLAN_BILLING_INTERVALS.join(", ")}`,
    });
  }

  const unitAmount = Math.round(effective.amount * 100);

  const needsSync = planCatalogNeedsSync(
    {
      unitAmount: existing.unitAmount,
      currency: existing.currency,
      period: existing.period,
    },
    { unitAmount, currency: effective.currency, period: effective.period },
  );

  const { providerProductId, providerPriceId } = needsSync
    ? await syncStripePlanCatalog(
        event,
        {
          name: effective.name,
          description: effective.description,
          unitAmount,
          currency: effective.currency,
          interval: effective.period as (typeof PLAN_BILLING_INTERVALS)[number],
        },
        {
          providerProductId: existing.providerProductId,
          providerPriceId: existing.providerPriceId,
        },
      )
    : {
        providerProductId: existing.providerProductId,
        providerPriceId: existing.providerPriceId,
      };

  return {
    price: formatPlanPrice(unitAmount, effective.currency),
    providerPriceId,
    providerProductId,
    unitAmount,
    currency: effective.currency,
  };
}

/**
 * Plan administration for the platform owner. Plans used to exist only as a
 * hardcoded seed script; this router is what replaces it, which is why
 * `archivePlan` is a soft delete: `Team.planId` and `Subscription.planId` are
 * real foreign keys, so removing a row would break tenants that still point at
 * it.
 */
export default router({
  listPlans: platformAdminProcedure
    .input(
      z
        .object({
          // Archived plans are hidden by default — they exist for referential
          // integrity, not for day-to-day management — but stay reachable so
          // the admin table can show them on demand.
          includeArchived: z.boolean().default(false),
        })
        .default({ includeArchived: false }),
    )
    .query(({ input }) =>
      // One grouped join instead of a count query per plan. `count(teams.id)`
      // over the joined column (not `count()` over the row) is what makes a
      // plan nobody uses come back as 0 rather than 1.
      useDB()
        .select({
          id: plans.id,
          name: plans.name,
          description: plans.description,
          tier: plans.tier,
          price: plans.price,
          period: plans.period,
          provider: plans.provider,
          providerPriceId: plans.providerPriceId,
          unitAmount: plans.unitAmount,
          currency: plans.currency,
          maxSeats: plans.maxSeats,
          limits: plans.limits,
          isArchived: plans.isArchived,
          createdAt: plans.createdAt,
          teamCount: count(teams.id),
        })
        .from(plans)
        .leftJoin(teams, eq(teams.planId, plans.id))
        .where(input.includeArchived ? undefined : eq(plans.isArchived, false))
        .groupBy(plans.id)
        .orderBy(desc(plans.createdAt)),
    ),

  createPlan: platformAdminProcedure
    .input(planFieldsSchema)
    .mutation(async ({ ctx, input }) => {
      const { amount, currency, ...fields } = input;

      const pricing = await resolvePlanPricing(
        ctx.event,
        {
          provider: input.provider ?? null,
          period: input.period,
          name: input.name,
          description: input.description,
          amount: amount ?? null,
          currency: currency ?? null,
          fallbackPrice: input.price,
        },
        {
          unitAmount: null,
          currency: null,
          period: null,
          providerProductId: null,
          providerPriceId: null,
        },
      );

      const [plan] = await useDB()
        .insert(plans)
        .values({ ...fields, ...pricing })
        .returning();

      if (!plan) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create plan",
        });
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        action: "admin.plans.createPlan",
        targetType: "plan",
        targetId: plan.id,
        metadata: { name: plan.name, tier: plan.tier },
        ip: getRequestIP(ctx.event, { xForwardedFor: true }) ?? null,
      });

      return plan;
    }),

  updatePlan: platformAdminProcedure
    .input(planFieldsSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;

      // Zod drops absent optional keys, so an entry surviving here was really
      // sent: an explicit `null` (clear the column) is a change, `undefined`
      // never reaches this point.
      if (!Object.keys(changes).length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields to update",
        });
      }

      const existing: PlanRow | undefined = await useDB().query.plans.findFirst(
        {
          where: eq(plans.id, id),
        },
      );

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      const { amount, currency, ...fields } = changes;

      const pricing = await resolvePlanPricing(
        ctx.event,
        {
          provider:
            "provider" in changes
              ? (changes.provider ?? null)
              : existing.provider,
          period: changes.period ?? existing.period,
          name: changes.name ?? existing.name,
          description: changes.description ?? existing.description,
          amount:
            amount !== undefined
              ? amount
              : existing.unitAmount != null
                ? existing.unitAmount / 100
                : null,
          currency: currency !== undefined ? currency : existing.currency,
          fallbackPrice: changes.price ?? existing.price,
        },
        {
          unitAmount: existing.unitAmount,
          currency: existing.currency,
          period: existing.period,
          providerProductId: existing.providerProductId,
          providerPriceId: existing.providerPriceId,
        },
      );

      const [plan] = await useDB()
        .update(plans)
        .set({ ...fields, ...pricing })
        .where(eq(plans.id, id))
        .returning();

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      await recordAuditLog({
        actorUserId: ctx.user.id,
        action: "admin.plans.updatePlan",
        targetType: "plan",
        targetId: plan.id,
        metadata: { changed: changes },
        ip: getRequestIP(ctx.event, { xForwardedFor: true }) ?? null,
      });

      return plan;
    }),

  archivePlan: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      setPlanArchived(ctx, input.id, true, "admin.plans.archivePlan"),
    ),

  // Symmetric with archivePlan: without this, archiving a plan by mistake is
  // permanent through the API even though the row itself is only soft-deleted.
  unarchivePlan: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      setPlanArchived(ctx, input.id, false, "admin.plans.unarchivePlan"),
    ),

  /**
   * One-off Stripe setup that used to ride along with the `db:seed` task. It
   * belongs to a human decision, not to every deploy, and re-running it simply
   * provisions a fresh configuration and repoints the cached id — the KV key
   * is the same one `routers/billing.ts` reads, so the existing "Cancel
   * Subscription" link keeps working either way.
   */
  setupStripeCancelConfiguration: platformAdminProcedure.mutation(
    async ({ ctx }) => {
      const configurationId = await createStripeCancelConfiguration(ctx.event);
      await hubKV().set(STRIPE_CANCEL_CONFIG_KV_KEY, configurationId);

      await recordAuditLog({
        actorUserId: ctx.user.id,
        action: "admin.plans.setupStripeCancelConfiguration",
        targetType: "billing",
        targetId: null,
        metadata: { configurationId },
        ip: getRequestIP(ctx.event, { xForwardedFor: true }) ?? null,
      });

      return { configurationId };
    },
  ),
});

/** Shared body for archivePlan/unarchivePlan — same statement, opposite value. */
async function setPlanArchived(
  ctx: { user: { id: string }; event: H3Event },
  id: string,
  isArchived: boolean,
  action: string,
) {
  const [plan] = await useDB()
    .update(plans)
    .set({ isArchived })
    .where(eq(plans.id, id))
    .returning();

  if (!plan) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
  }

  await recordAuditLog({
    actorUserId: ctx.user.id,
    action,
    targetType: "plan",
    targetId: plan.id,
    metadata: { name: plan.name },
    ip: getRequestIP(ctx.event, { xForwardedFor: true }) ?? null,
  });

  return plan;
}
