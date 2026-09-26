import { z } from "zod";
// See the note in admin-plans.ts: layers reach the Composition Root's tRPC
// primitives explicitly; platformAdminProcedure is built on
// protectedProcedure, not on the tenant ability layer.
import { platformAdminProcedure, router } from "~~/server/trpc/trpc";
import { PENDING_PURCHASE_STATUSES } from "../../shared/types/enums";
import { listPendingPurchasesForAdmin } from "../utils/billing/pending-purchase-repository";

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
    .query(({ input }) => listPendingPurchasesForAdmin(input.status)),
});
