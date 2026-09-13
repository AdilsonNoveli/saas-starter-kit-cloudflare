import type { H3Event } from "h3";
import { createStripeClient } from "./stripe";

/**
 * KV key holding the id of the Stripe Billing Portal configuration used by the
 * "Cancel Subscription" link. Exported so the writer (the admin setup
 * mutation) and the reader (`routers/billing.ts`) name the same key from one
 * place instead of repeating a string literal that has to match.
 */
export const STRIPE_CANCEL_CONFIG_KV_KEY = "config:stripeCancelConfigPortalId";

/**
 * Provisions the restricted Stripe Billing Portal configuration behind the
 * "Cancel Subscription" button: cancellation enabled, everything else off, so
 * the portal link cannot be used to change payment method, plan or customer
 * details.
 *
 * This used to run inside the `db:seed` Nitro task, which meant a
 * once-per-environment piece of Stripe setup was tangled up with database
 * seeding. It is now a deliberate action a platform admin triggers
 * (`admin.plans.setupStripeCancelConfiguration`); returning the id instead of
 * writing it anywhere keeps the Stripe call and the KV cache separable.
 */
export async function createStripeCancelConfiguration(event: H3Event) {
  const stripe = createStripeClient(event);
  const portalConfig = await stripe.billingPortal.configurations.create({
    features: {
      subscription_cancel: { enabled: true },
      payment_method_update: { enabled: false },
      customer_update: { enabled: false },
      subscription_update: { enabled: false },
      invoice_history: { enabled: false },
    },
  });
  return portalConfig.id;
}
