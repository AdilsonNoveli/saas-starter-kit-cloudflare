import type Stripe from "stripe";
import { createStripeClient } from "~~/server/utils/stripe";
import { syncStripeSubscription } from "~~/server/utils/stripe/subscription-sync";
import {
  markEventProcessed,
  wasEventProcessed,
} from "~~/server/utils/billing/event-ledger";

/**
 * Deliberately thin: verify → dedupe → dispatch. All the actual state
 * resolution (which team, which plan, what changed) lives in
 * `syncStripeSubscription`, shared by every event type below instead of
 * duplicated per case.
 *
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
 */
export default defineEventHandler(async (event) => {
  await assertNotRateLimited(event, "webhook:stripe", {
    limit: 60,
    windowSeconds: 60,
  });

  const { stripeWebhookSecretKey } = useRuntimeConfig(event);

  const body = (await readRawBody(event)) || "";
  const signature = getHeader(event, "stripe-signature");

  if (!body) {
    return { error: "Invalid request body" };
  }
  if (!signature) {
    return { error: "Invalid stripe-signature" };
  }

  const stripe = createStripeClient(event);
  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      stripeWebhookSecretKey,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid webhook payload",
    });
  }

  if (await wasEventProcessed("stripe", stripeEvent.id)) {
    return { status: "success", deduped: true };
  }

  try {
    const outcome = await dispatch(stripe, stripeEvent);
    if (!outcome.ok) {
      console.error(`Stripe webhook ${stripeEvent.type}: ${outcome.reason}`);
      return { status: "error", message: outcome.reason };
    }

    await markEventProcessed("stripe", stripeEvent.id);
    return { status: "success" };
  } catch (error) {
    // Deliberately not marked processed: a thrown error means Stripe should
    // retry this exact event, and the dedupe check above is what makes that
    // retry safe rather than a source of duplicate side effects.
    console.error("Stripe webhook handler error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Webhook handler failed",
    });
  }
});

async function dispatch(
  stripe: Stripe,
  stripeEvent: Stripe.Event,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  switch (stripeEvent.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      return syncStripeSubscription(stripe, subscription.id);
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
        // This app's only Checkout mode is "subscription" (see
        // server/trpc/routers/stripe.ts), so every real session has one —
        // this only guards a session type this handler doesn't expect.
        return { ok: false, reason: "Checkout session has no subscription" };
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      return syncStripeSubscription(stripe, subscriptionId);
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
      return syncStripeSubscription(stripe, subscriptionId);
    }

    default:
      return { ok: true };
  }
}
