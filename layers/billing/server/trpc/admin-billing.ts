import { desc, eq } from "drizzle-orm";
import { z } from "zod";
// See the note in admin-plans.ts: layers reach the Composition Root's tRPC
// primitives explicitly; platformAdminProcedure is built on
// protectedProcedure, not on the tenant ability layer.
import { platformAdminProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { pendingPurchases } from "@nuxfire/functions/schema";
import { PENDING_PURCHASE_STATUSES } from "../../shared/types/enums";

/**
 * Read-only surface for US-003: a paid purchase that never turned into
 * access (rejected `EXISTING_TEAM` destination, or simply never claimed)
 * takes money without granting anything, so the platform admin needs to see
 * it — this is the only place that happens (FR-011).
 */
export const adminBillingRouter = router({
  listPendingPurchases: platformAdminProcedure
    .input(
      z.object({
        status: z.enum(PENDING_PURCHASE_STATUSES).optional(),
      }),
    )
    .query(async ({ input }) => {
      const rows = await useDB().query.pendingPurchases.findMany({
        where: input.status ? eq(pendingPurchases.status, input.status) : undefined,
        orderBy: desc(pendingPurchases.createdAt),
        with: { plan: { columns: { name: true } } },
        limit: 200,
      });

      return rows.map((row) => ({
        id: row.id,
        email: row.email,
        planName: row.plan.name,
        provider: row.provider,
        status: row.status,
        failureReason: row.failureReason,
        createdAt: row.createdAt,
        claimedAt: row.claimedAt,
        expiresAt: row.expiresAt,
      }));
    }),
});
