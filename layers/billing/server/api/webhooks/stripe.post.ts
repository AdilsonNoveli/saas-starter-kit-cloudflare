import type Stripe from "stripe";
import { sender } from "@nuxfire/functions/sender";
import { createStripeClient } from "../../utils/stripe";
import {
  markEventProcessed,
  wasEventProcessed,
} from "../../utils/billing/event-ledger";
import { dispatch } from "../../utils/billing/stripe-webhook-dispatch";

/**
 * Deliberately thin: verify → dedupe → dispatch. All the actual state
 * resolution (which team, which plan, what changed — including SPEC-0004's
 * pending-purchase fork) lives in `stripe-webhook-dispatch.ts`, tested on its
 * own since this file's `defineEventHandler` needs Nitro's auto-imports at
 * module-eval time, which a plain Vitest run never provides.
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

  const sendEmail = sender(event.context?.cloudflare?.env?.Emails);
  const origin = getRequestURL(event).origin;

  try {
    const outcome = await dispatch(stripe, stripeEvent, sendEmail, origin);
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
