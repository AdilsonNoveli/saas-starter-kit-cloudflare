import type Stripe from "stripe";
import type { sender } from "@nuxfire/functions/sender";
import { syncStripeSubscription } from "../stripe/subscription-sync";
import { mapStripeStatus } from "../stripe/status-map";
import { SubscriptionStatus } from "../../../shared/types/enums";
import { recordConfirmedSubscription } from "./pending-purchase-repository";
import { describeBuyerDestination } from "./buyer-provisioning";

// Kept in `server/utils/`, not inline in `server/api/webhooks/stripe.post.ts`:
// that file's own top-level `defineEventHandler(...)` call needs Nitro's
// auto-imports at module-eval time, which a plain Vitest run never provides —
// exactly the reason `subscription-sync.ts` and every other webhook-adjacent
// file already lives here instead of in `server/api/`. This is the same
// "thin handler, tested logic elsewhere" split, just drawn one file earlier.

export type SendEmail = ReturnType<typeof sender>;
export type DispatchOutcome = { ok: true } | { ok: false; reason: string };

/**
 * Event coverage, and why each one is here:
 * - `customer.subscription.*` (created/updated/deleted): the primary signal
 *   for every state change a subscription goes through, `deleted` included —
 *   without it, a subscription that reaches the end of its
 *   `cancel_at_period_end` window, or is canceled immediately via the API,
 *   never tells this app it ended, and the team keeps looking ACTIVE forever.
 * - `checkout.session.completed` / `.async_payment_succeeded`: required by
 *   Stripe's own integration guidance for delayed-notification payment
 *   methods (boleto, SEPA debit — relevant here since checkout accepts
 *   dynamic payment methods, not just cards). `completed` fires the instant
 *   the session finishes, but the payment can still be `unpaid` at that
 *   moment for those methods, so fulfillment is gated on `payment_status`.
 * - `invoice.payment_failed`: the subscription's own status usually follows
 *   a failed charge into `past_due` too, but this is the earlier, dedicated
 *   signal for it — reacting on the subscription event alone means waiting
 *   on whichever event Stripe happens to deliver first.
 * - `invoice.paid` is deliberately not handled separately: on renewal, Stripe
 *   also fires `customer.subscription.updated` (the period advances), which
 *   already re-reads `latest_invoice` and captures `lastPaymentDate` — a
 *   second handler for the same fact would be a second place to keep in sync.
 *
 * SPEC-0004: a customer created by `checkout.startBuyerCheckout` (a buyer
 * with no team yet) carries `pending_purchase_id` in its metadata instead of
 * `team_id`. `resolveOutcome` below is where that fork happens — every path
 * that reaches `syncStripeSubscription` stays exactly the team-upgrade
 * behavior this webhook already had.
 */
export async function dispatch(
  stripe: Stripe,
  stripeEvent: Stripe.Event,
  sendEmail: SendEmail,
  origin: string,
): Promise<DispatchOutcome> {
  switch (stripeEvent.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      return resolveOutcome(stripe, subscription.id, sendEmail, origin);
    }

    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "unpaid") {
        // Not a failure — a delayed payment method's session completing
        // before the money has actually moved. `async_payment_succeeded`
        // (or the subscription's own event once it activates) is what
        // finishes this.
        return { ok: true };
      }
      if (!session.subscription) {
        // This app's only Checkout modes are "subscription" (see
        // server/trpc/stripe.ts and server/trpc/checkout.ts), so every real
        // session has one — this only guards a session type this handler
        // doesn't expect.
        return { ok: false, reason: "Checkout session has no subscription" };
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      return resolveOutcome(stripe, subscriptionId, sendEmail, origin);
    }

    case "invoice.payment_failed": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      if (!invoice.subscription) {
        // A one-off invoice not tied to a subscription — nothing here to
        // reconcile against.
        return { ok: true };
      }
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription.id;
      // A failed payment is never a *confirmation* — a pending-purchase
      // customer whose first payment failed gets no claim e-mail and no
      // PendingPurchase write; the buyer simply never receives a link, and
      // the checkout's own expiry (FR-011) is what eventually surfaces it.
      // For an existing team's customer, this keeps the prior behavior
      // exactly: `syncStripeSubscription` reconciles the now-past_due state.
      return resolveOutcome(stripe, subscriptionId, sendEmail, origin, {
        confirmPendingPurchase: false,
      });
    }

    default:
      return { ok: true };
  }
}

/**
 * The one place `team_id` vs `pending_purchase_id` customers fork (SPEC-0004
 * FR-004). Re-fetches the subscription once (as `syncStripeSubscription`
 * always has) purely to read its customer and status for that routing
 * decision — the team path then delegates to the existing, unchanged
 * `syncStripeSubscription`, which re-fetches again for its own write. Two
 * fetches instead of one is the accepted cost of keeping that function's
 * own behavior untouched (FIND-ARCH-001).
 */
async function resolveOutcome(
  stripe: Stripe,
  subscriptionId: string,
  sendEmail: SendEmail,
  origin: string,
  options: { confirmPendingPurchase?: boolean } = {},
): Promise<DispatchOutcome> {
  const confirmPendingPurchase = options.confirmPendingPurchase ?? true;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return { ok: false, reason: "Customer was deleted" };

  const pendingPurchaseId = customer.metadata?.pending_purchase_id;
  if (!pendingPurchaseId) {
    // No pending_purchase_id: either a team_id customer (existing behavior,
    // unchanged) or a customer with neither, which syncStripeSubscription
    // already reports as a clear failure.
    return syncStripeSubscription(stripe, subscriptionId);
  }

  if (!confirmPendingPurchase) return { ok: true };

  const status = mapStripeStatus(subscription.status);
  if (status !== SubscriptionStatus.ACTIVE && status !== SubscriptionStatus.TRIALING) {
    // Created but not yet actually paying (e.g. `incomplete`) — no claim
    // e-mail yet, mirroring the checkout.session `unpaid` gate above.
    return { ok: true };
  }

  const { firstConfirmation } = await recordConfirmedSubscription(pendingPurchaseId, {
    providerSubscriptionId: subscription.id,
    providerCustomerId: customerId,
  });
  if (!firstConfirmation) return { ok: true };

  const pendingPurchase = await useDB().query.pendingPurchases.findFirst({
    where: (table, { eq }) => eq(table.id, pendingPurchaseId),
    with: { plan: true },
  });
  if (!pendingPurchase) {
    return { ok: false, reason: `No PendingPurchase found for id ${pendingPurchaseId}` };
  }

  await sendEmail(pendingPurchase.email, "PurchaseClaim", {
    planName: pendingPurchase.plan.name,
    destinationSummary: await describeBuyerDestination(pendingPurchase.plan),
    claimLink: `${origin}/claim/${pendingPurchase.id}`,
  });

  return { ok: true };
}
