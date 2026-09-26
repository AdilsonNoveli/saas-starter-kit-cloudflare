import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { createId as cuid } from "@paralleldrive/cuid2";
// See the note in stripe.ts/billing.ts: layers reach the Composition Root's
// tRPC primitives and server utils by explicit import, never by Nitro's merge.
import { publicProcedure, protectedProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { plans } from "@nuxfire/functions/schema";
import { createStripeClient } from "../utils/stripe";
import { syncStripeSubscriptionForTeam } from "../utils/stripe/subscription-sync";
import {
  resolvePaddleSubscriptionInput,
} from "../utils/billing/paddle-webhook-dispatch";
import { upsertSubscription } from "../utils/billing/subscription-repository";
import { signPaddlePendingPurchase } from "../utils/billing/paddle-team-signature";
import {
  createPendingPurchase,
  getPendingPurchase,
  rejectPendingPurchase,
  evaluateClaimEligibility,
} from "../utils/billing/pending-purchase-repository";
import {
  provisionBuyerTeam,
  describeBuyerDestination,
  validateBuyerCheckoutPlan,
} from "../utils/billing/buyer-provisioning";
import { formatPlanPrice } from "../utils/stripe-catalog";
import { PaymentProvider, PlanBuyerTeamMode } from "../../shared/types/enums";

/**
 * SPEC-0004: a checkout for a buyer who has no team yet (and so cannot use
 * `stripe.createStripeCheckoutSession`, which requires one). Public on
 * purpose — this is the only billing entry point a signed-out visitor calls.
 */
export const checkoutRouter = router({
  // Public, read-only, and deliberately minimal: only what the Buy page
  // needs to render before the visitor commits to paying (section 10). Not
  // itself a distinct FR — supporting data for US-001's screen.
  getPlanSummary: publicProcedure
    .input(z.object({ planId: z.string().min(1) }))
    .query(async ({ input }) => {
      const plan = await useDB().query.plans.findFirst({
        where: eq(plans.id, input.planId),
      });
      if (!plan || plan.isArchived) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }
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
    }),

  startBuyerCheckout: publicProcedure
    .input(
      z.object({
        planId: z.string().min(1),
        email: z.string().email(),
        // Only meaningful for Stripe, which redirects back to it; Paddle's
        // checkout happens in-page via Paddle.js and never navigates away.
        redirectUrl: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx: { event, origin, runtimeConfig }, input }) => {
      await assertNotRateLimited(event, "checkout:start-buyer", {
        limit: 20,
        windowSeconds: 60,
      });

      const plan = await useDB().query.plans.findFirst({
        where: eq(plans.id, input.planId),
      });
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      const validation = await validateBuyerCheckoutPlan(plan);
      if (!validation.ok) {
        const message =
          validation.reason === "plan_archived"
            ? "This plan is no longer available"
            : validation.reason === "no_price" || validation.reason === "no_provider"
              ? "This plan has no price configured"
              : "This plan's destination is not available";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      // validateBuyerCheckoutPlan already confirmed these are non-null (its
      // "no_price"/"no_provider" branches); re-read into locals so
      // TypeScript narrows them too. The plan dictates its own provider —
      // never a caller-supplied choice, since a plan is configured for
      // exactly one.
      const providerPriceId = plan.providerPriceId;
      const provider = plan.provider;
      if (!providerPriceId || !provider) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Plan price missing" });
      }

      const pendingPurchaseId = cuid();

      if (provider === PaymentProvider.STRIPE) {
        const stripe = createStripeClient(event);
        const customer = await stripe.customers.create({
          email: input.email,
          metadata: { pending_purchase_id: pendingPurchaseId },
        });

        const successUrl = new URL(input.redirectUrl ?? "/", origin);
        successUrl.searchParams.set("checkout", "success");
        const cancelUrl = new URL(input.redirectUrl ?? "/", origin);
        cancelUrl.searchParams.set("checkout", "cancelled");

        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          billing_address_collection: "auto",
          line_items: [{ price: providerPriceId, quantity: 1 }],
          mode: "subscription",
          success_url: `${successUrl.toString()}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl.toString(),
        });
        if (!session.url) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Stripe returned a checkout session without a URL",
          });
        }

        await createPendingPurchase({
          id: pendingPurchaseId,
          email: input.email,
          planId: plan.id,
          provider: PaymentProvider.STRIPE,
          providerCheckoutId: session.id,
        });

        return { pendingPurchaseId, url: session.url, paddle: null };
      }

      // PADDLE: checkout runs entirely in the browser (Paddle.js), so there is
      // no server-created "session" to key providerCheckoutId on — the
      // pending purchase's own id stands in for it, prefixed to keep the two
      // providers' identifiers visually distinct in the admin listing.
      await createPendingPurchase({
        id: pendingPurchaseId,
        email: input.email,
        planId: plan.id,
        provider: PaymentProvider.PADDLE,
        providerCheckoutId: `paddle:${pendingPurchaseId}`,
      });

      const purchaseSig = await signPaddlePendingPurchase(
        runtimeConfig.paddleWebhookSecret ?? "",
        pendingPurchaseId,
      );

      return {
        pendingPurchaseId,
        url: null,
        paddle: {
          priceId: providerPriceId,
          customData: { pending_purchase_id: pendingPurchaseId, purchase_sig: purchaseSig },
        },
      };
    }),

  getPendingPurchase: protectedProcedure
    .input(z.object({ pendingPurchaseId: z.string().min(1) }))
    .query(async ({ ctx: { user }, input }) => {
      const purchase = await getPendingPurchase(input.pendingPurchaseId);
      const eligibility = evaluateClaimEligibility(purchase, user.email ?? "");
      // "not found" and "wrong e-mail" collapse to the same response
      // (NFR-001/AC-021): a foreign or non-existent claim link must look
      // identical from the outside.
      if (!eligibility.ok && (eligibility.reason === "not_found" || eligibility.reason === "wrong_email")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found or expired" });
      }

      const plan = await useDB().query.plans.findFirst({
        where: eq(plans.id, purchase!.planId),
      });

      return {
        status: purchase!.status,
        planName: plan?.name ?? "",
        destinationSummary: plan ? await describeBuyerDestination(plan) : "",
        needsTeamName: plan?.buyerTeamMode === PlanBuyerTeamMode.NEW_TEAM,
        ineligibleReason: eligibility.ok ? null : eligibility.reason,
      };
    }),

  claimPurchase: protectedProcedure
    .input(
      z.object({
        pendingPurchaseId: z.string().min(1),
        teamName: z.string().optional(),
        teamSlug: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx: { event, user }, input }) => {
      const purchase = await getPendingPurchase(input.pendingPurchaseId);
      const eligibility = evaluateClaimEligibility(purchase, user.email ?? "");
      if (!eligibility.ok) {
        if (eligibility.reason === "not_found" || eligibility.reason === "wrong_email" || eligibility.reason === "not_confirmed") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Link not found or expired" });
        }
        if (eligibility.reason === "already_claimed") {
          throw new TRPCError({ code: "CONFLICT", message: "This purchase has already been claimed" });
        }
        // eligibility.reason === "expired" or "rejected"
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            eligibility.reason === "expired"
              ? "This claim link has expired"
              : "This purchase could not be completed; contact support",
        });
      }

      const plan = await useDB().query.plans.findFirst({
        where: eq(plans.id, purchase!.planId),
      });
      if (!plan) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Plan no longer exists" });
      }

      const result = await provisionBuyerTeam({
        pendingPurchase: purchase!,
        plan: {
          id: plan.id,
          buyerTeamMode: plan.buyerTeamMode as PlanBuyerTeamMode,
          buyerTeamId: plan.buyerTeamId,
        },
        userId: user.id,
        teamName: input.teamName,
        teamSlug: input.teamSlug,
      });

      if (!result.ok) {
        if (result.reason === "destination_missing" || result.reason === "destination_suspended") {
          await rejectPendingPurchase(
            purchase!.id,
            result.reason === "destination_missing"
              ? "Destination team no longer exists"
              : "Destination team is suspended",
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This plan's destination is no longer available",
          });
        }
        if (result.reason === "already_claimed") {
          throw new TRPCError({ code: "CONFLICT", message: "This purchase has already been claimed" });
        }
        if (result.reason === "invalid_team_name") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Team name must be between 2 and 50 characters" });
        }
        if (result.reason === "invalid_team_slug") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Slug must be 2 to 50 lowercase letters, numbers, or hyphens",
          });
        }
        // result.reason === "slug_taken"
        throw new TRPCError({ code: "CONFLICT", message: "Team slug is already in use" });
      }

      // The team exists now: reuse the existing single write path for the
      // Subscription row, re-fetching live data rather than trusting a
      // stored snapshot (FR-009).
      if (purchase!.providerSubscriptionId) {
        if (purchase!.provider === PaymentProvider.STRIPE) {
          const stripe = createStripeClient(event);
          await syncStripeSubscriptionForTeam(stripe, purchase!.providerSubscriptionId, result.teamId);
        } else {
          const { paddleApiKey, paddleSandbox } = useRuntimeConfig(event);
          const paddle = new Paddle(paddleApiKey || "", {
            environment: paddleSandbox ? Environment.sandbox : Environment.production,
          });
          const subscription = await paddle.subscriptions.get(purchase!.providerSubscriptionId);
          const resolved = await resolvePaddleSubscriptionInput(paddle, subscription);
          if (resolved.ok) {
            await upsertSubscription({ ...resolved.input, teamId: result.teamId });
          }
        }
      }

      return { teamSlug: result.teamSlug };
    }),
});
