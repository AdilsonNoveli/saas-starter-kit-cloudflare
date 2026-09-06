import { TRPCError } from "@trpc/server";
import type { H3Event } from "h3";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { platformAdminProcedure, router } from "../../trpc";
import { plans, teams } from "@nuxfire/functions/schema";
import {
  STRIPE_CANCEL_CONFIG_KV_KEY,
  createStripeCancelConfiguration,
} from "~~/server/utils/stripe-portal";

/**
 * The editable surface of a plan, defined once and reused by both mutations:
 * `createPlan` takes it as-is, `updatePlan` takes `.partial()` of it. Two
 * separate schemas would drift the moment a column is added.
 *
 * `tier` stays a free-form string on purpose — the column has no enum and the
 * app compares it as text ("FREE"/"PRO"), so narrowing it here would reject
 * plans the database itself accepts.
 */
const planFieldsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  tier: z.string().trim().min(1).max(50),
  price: z.string().trim().min(1).max(50),
  period: z.string().trim().min(1).max(50),
  provider: z.string().trim().max(50).nullable().optional(),
  providerPriceId: z.string().trim().max(200).nullable().optional(),
  // null = unlimited. A limit of zero would be a plan nobody can use, so the
  // floor is 1 and "no limit" is expressed by the null, not by a number.
  maxSeats: z.number().int().positive().nullable().optional(),
  limits: z.record(z.string(), z.unknown()).nullable().optional(),
});

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
      const [plan] = await useDB().insert(plans).values(input).returning();

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

      const [plan] = await useDB()
        .update(plans)
        .set(changes)
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
