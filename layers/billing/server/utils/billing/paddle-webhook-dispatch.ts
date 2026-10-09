import { EventName, type Paddle } from "@paddle/paddle-node-sdk";
import { eq } from "drizzle-orm";
import type { sender } from "@nuxfire/functions/sender";
import { PaymentProvider, SubscriptionStatus } from "../../../shared/types/enums";
import { plans } from "@nuxfire/functions/schema";
import {
  upsertSubscription,
  type SubscriptionUpsertInput,
} from "./subscription-repository";
import { verifyPaddleTeam, verifyPaddlePendingPurchase } from "./paddle-team-signature";
import { recordConfirmedSubscription } from "./pending-purchase-repository";
import { describeBuyerDestination } from "./buyer-provisioning";

// Kept in `server/utils/`, not inline in `server/api/webhooks/paddle.post.ts` —
// same reason as `stripe-webhook-dispatch.ts`: that file's top-level
// `defineEventHandler(...)` needs Nitro's auto-imports at module-eval time,
// which a plain Vitest run never provides.

export type PaddleSendEmail = ReturnType<typeof sender>;
export type PaddleDispatchOutcome = { ok: true } | { ok: false; reason: string };

export function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    trialing: SubscriptionStatus.TRIALING,
    past_due: SubscriptionStatus.PAST_DUE,
    paused: SubscriptionStatus.PAUSED,
    canceled: SubscriptionStatus.CANCELED,
  };

  return statusMap[paddleStatus] ?? SubscriptionStatus.INCOMPLETE;
}

/**
 * The subset of a Paddle subscription notification this module reads.
 * `unmarshal`'s real return type is a discriminated union of every Paddle
 * notification kind (subscriptions, addresses, businesses, reports, …); the
 * `dispatch` switch below narrows to `EventName.Subscription*` before ever
 * reaching this shape, so a structural interface here — the same pragmatic
 * cast this file already applied to `customData` before this extraction —
 * avoids re-deriving that narrowing across a function boundary.
 */
interface PaddleSubscriptionEvent {
  id: string;
  customerId: string;
  status: string;
  customData: unknown;
  items: Array<{
    price?: { id?: string };
    previouslyBilledAt?: string | null;
    nextBilledAt?: string | null;
  }>;
  currentBillingPeriod: { startsAt?: string; endsAt?: string } | null;
}

/**
 * Everything a `SubscriptionUpsertInput` needs except `teamId` — extracted so
 * a buyer-provisioning claim, which resolves `teamId` from the just-created
 * team rather than from checkout-time `customData.team_id`, can build the
 * exact same shape (SPEC-0004 FR-009) instead of a second copy of this
 * mapping.
 */
export async function resolvePaddleSubscriptionInput(
  paddle: Paddle,
  subscriptionEvent: PaddleSubscriptionEvent,
): Promise<{ ok: true; input: Omit<SubscriptionUpsertInput, "teamId"> } | { ok: false; reason: string }> {
  const priceId = subscriptionEvent.items[0]?.price?.id;
  if (!priceId) return { ok: false, reason: "Invalid product" };

  const plan = await useDB().query.plans.findFirst({
    where: eq(plans.providerPriceId, priceId),
  });
  if (!plan) return { ok: false, reason: `No plan found for product ID: ${priceId}` };

  const customer = await paddle.customers.get(subscriptionEvent.customerId);

  return {
    ok: true,
    input: {
      status: mapPaddleStatus(subscriptionEvent.status),
      provider: PaymentProvider.PADDLE,
      providerSubscriptionId: subscriptionEvent.id,
      planId: plan.id,
      currentPeriodStart: subscriptionEvent.currentBillingPeriod?.startsAt
        ? new Date(subscriptionEvent.currentBillingPeriod.startsAt)
        : null,
      currentPeriodEnd: subscriptionEvent.currentBillingPeriod?.endsAt
        ? new Date(subscriptionEvent.currentBillingPeriod.endsAt)
        : null,
      cancelAtPeriodEnd: false,
      providerMetadata: subscriptionEvent,
      customerEmail: customer.email,
      lastPaymentDate: subscriptionEvent.items[0]?.previouslyBilledAt
        ? new Date(subscriptionEvent.items[0].previouslyBilledAt)
        : null,
      nextPaymentDate: subscriptionEvent.items[0]?.nextBilledAt
        ? new Date(subscriptionEvent.items[0].nextBilledAt)
        : null,
    },
  };
}

export async function dispatchPaddleWebhook(
  paddle: Paddle,
  eventData: Awaited<ReturnType<Paddle["webhooks"]["unmarshal"]>>,
  secretKey: string,
  sendEmail: PaddleSendEmail,
  origin: string,
): Promise<PaddleDispatchOutcome> {
  switch (eventData.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled: {
      const subscriptionEvent = eventData.data as unknown as PaddleSubscriptionEvent;
      const customData = subscriptionEvent.customData as {
        team_id?: string;
        team_sig?: string;
        pending_purchase_id?: string;
        purchase_sig?: string;
      } | null;

      if (customData?.pending_purchase_id) {
        return resolvePendingPurchaseConfirmation(
          paddle,
          subscriptionEvent,
          customData.pending_purchase_id,
          customData.purchase_sig ?? "",
          secretKey,
          sendEmail,
          origin,
        );
      }

      const teamId = customData?.team_id;
      if (!teamId) {
        return { ok: false, reason: "Missing team ID" };
      }
      // team_id comes from the browser that opened the checkout; only a value
      // signed by createPaddleCheckoutData (after a membership check) is trusted.
      if (!(await verifyPaddleTeam(secretKey, teamId, customData?.team_sig ?? ""))) {
        return { ok: false, reason: "Invalid team signature" };
      }

      const resolved = await resolvePaddleSubscriptionInput(paddle, subscriptionEvent);
      if (!resolved.ok) return resolved;

      await upsertSubscription({ ...resolved.input, teamId });
      return { ok: true };
    }

    default:
      return { ok: true };
  }
}

/**
 * SPEC-0004: a buyer with no team yet carries `pending_purchase_id` (signed
 * with `signPaddlePendingPurchase` at checkout start) instead of `team_id`.
 * Mirrors the Stripe dispatch's confirmation gate — only a real `active`/
 * `trialing` status records the confirmation and, the first time, sends the
 * claim e-mail; no `Subscription` row is written yet (no team exists), that
 * happens at claim time via `resolvePaddleSubscriptionInput`.
 */
async function resolvePendingPurchaseConfirmation(
  paddle: Paddle,
  subscriptionEvent: PaddleSubscriptionEvent,
  pendingPurchaseId: string,
  purchaseSignature: string,
  secretKey: string,
  sendEmail: PaddleSendEmail,
  origin: string,
): Promise<PaddleDispatchOutcome> {
  if (!(await verifyPaddlePendingPurchase(secretKey, pendingPurchaseId, purchaseSignature))) {
    return { ok: false, reason: "Invalid purchase signature" };
  }

  const status = mapPaddleStatus(subscriptionEvent.status);
  if (status !== SubscriptionStatus.ACTIVE && status !== SubscriptionStatus.TRIALING) {
    return { ok: true };
  }

  const { firstConfirmation } = await recordConfirmedSubscription(pendingPurchaseId, {
    providerSubscriptionId: subscriptionEvent.id,
    providerCustomerId: subscriptionEvent.customerId,
  });
  if (!firstConfirmation) return { ok: true };

  const pendingPurchase = await useDB().query.pendingPurchases.findFirst({
    where: (table, { eq: eqCol }) => eqCol(table.id, pendingPurchaseId),
    with: { plan: true },
  });
  if (!pendingPurchase) {
    return { ok: false, reason: `No PendingPurchase found for id ${pendingPurchaseId}` };
  }

  await sendEmail(pendingPurchase.email, "PurchaseClaim", {
    planName: pendingPurchase.plan.name,
    destination: await describeBuyerDestination(pendingPurchase.plan),
    claimLink: `${origin}/claim/${pendingPurchase.id}`,
  });

  return { ok: true };
}
