import Stripe from "stripe";
import type { H3Event } from "h3";

export const createStripeClient = (event: H3Event) =>
  new Stripe(useRuntimeConfig(event).stripeSecretKey);
