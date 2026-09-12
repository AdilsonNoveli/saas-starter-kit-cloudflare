import type Stripe from "stripe";
import { SubscriptionStatus } from "~~/types/enums";

/**
 * Keyed by `Stripe.Subscription.Status` so the map stays exhaustive: a status
 * this SDK version doesn't know about fails to compile instead of silently
 * degrading every caller to INCOMPLETE. That silent fallback is what hid
 * `trialing` (making the TRIALING domain status unreachable) and `unpaid`,
 * while the map carried an `expired` key that was never a real Stripe status.
 *
 * `incomplete_expired` maps to CANCELED because it is terminal — the first
 * invoice went unpaid and was voided, so no further billing happens.
 */
const STRIPE_STATUS_MAP: Record<
  Stripe.Subscription.Status,
  SubscriptionStatus
> = {
  active: SubscriptionStatus.ACTIVE,
  trialing: SubscriptionStatus.TRIALING,
  past_due: SubscriptionStatus.PAST_DUE,
  paused: SubscriptionStatus.PAUSED,
  canceled: SubscriptionStatus.CANCELED,
  unpaid: SubscriptionStatus.UNPAID,
  incomplete: SubscriptionStatus.INCOMPLETE,
  incomplete_expired: SubscriptionStatus.CANCELED,
};

export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  return STRIPE_STATUS_MAP[status];
}
