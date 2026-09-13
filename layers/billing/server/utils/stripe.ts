import Stripe from "stripe";
import type { H3Event } from "h3";

// Pinned rather than left to the SDK's default: an unpinned client silently
// changes payload shape when the `stripe` dependency is bumped, which is how
// the removal of the legacy `plan` field went unnoticed here. The SDK's types
// are generated for exactly one version, so this constant and the dependency
// have to move together.
const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-02-24.acacia";

export const createStripeClient = (event: H3Event) =>
  new Stripe(useRuntimeConfig(event).stripeSecretKey, {
    apiVersion: STRIPE_API_VERSION,
  });
