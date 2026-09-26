import type Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { plans, teams } from "@nuxfire/functions/schema";
import { PaymentProvider } from "../../../shared/types/enums";
import { mapStripeStatus } from "./status-map";
import {
  upsertSubscription,
  type SubscriptionUpsertInput,
} from "../billing/subscription-repository";

export type SubscriptionSyncOutcome =
  { ok: true } | { ok: false; reason: string };

/**
 * Canonical handler for every Stripe event that can change a subscription's
 * state: created, updated, deleted, a completed/paid Checkout Session, and a
 * failed invoice. Always re-fetches the Subscription from the API instead of
 * trusting the webhook payload's own copy of it — a webhook payload is
 * shaped by whichever API version the Stripe account/endpoint is
 * configured with, invisible to this code, while `retrieve()` is shaped by
 * the version this SDK client pins (server/utils/stripe.ts). Reading the
 * payload directly is exactly how this handler once depended on a `plan`
 * field Stripe had already removed at the account's configured version.
 */
export async function syncStripeSubscription(
  stripe: Stripe,
  subscriptionId: string,
): Promise<SubscriptionSyncOutcome> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    return { ok: false, reason: "Customer was deleted" };
  }

  const teamId = customer.metadata?.team_id;
  if (!teamId) {
    return { ok: false, reason: "Customer has no team_id in metadata" };
  }

  return syncStripeSubscriptionForTeam(stripe, subscriptionId, teamId);
}

/**
 * The team-scoped half of `syncStripeSubscription` (SPEC-0004 FR-009):
 * extracted so a buyer-provisioning claim, which resolves `teamId` from the
 * just-created team rather than from `customer.metadata.team_id`, can reuse
 * the exact same write path instead of a second copy of it. Re-fetches the
 * subscription itself rather than accepting it as a parameter, for the same
 * reason the wrapper above always re-fetches: shaped by this SDK's pinned API
 * version, not by whatever the caller happened to have on hand.
 */
export async function syncStripeSubscriptionForTeam(
  stripe: Stripe,
  subscriptionId: string,
  teamId: string,
): Promise<SubscriptionSyncOutcome> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    return { ok: false, reason: "Customer was deleted" };
  }

  // Self-healing backfill for a team whose checkout predates the
  // `stripeCustomerId` column (or one created outside createStripeCheckoutSession):
  // without this, createStripeCheckoutSession's customer-reuse check would find
  // it null forever and keep creating a new Stripe Customer on every retry.
  await useDB()
    .update(teams)
    .set({ stripeCustomerId: customerId })
    .where(and(eq(teams.id, teamId), isNull(teams.stripeCustomerId)));

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    return { ok: false, reason: "Subscription has no price" };
  }

  const plan = await useDB().query.plans.findFirst({
    where: eq(plans.providerPriceId, priceId),
  });
  if (!plan) {
    return { ok: false, reason: `No plan configured for price ${priceId}` };
  }

  const invoice = subscription.latest_invoice
    ? await stripe.invoices.retrieve(
        typeof subscription.latest_invoice === "string"
          ? subscription.latest_invoice
          : subscription.latest_invoice.id,
      )
    : null;

  const periodEnd = new Date(subscription.current_period_end * 1000);

  const input: SubscriptionUpsertInput = {
    teamId,
    provider: PaymentProvider.STRIPE,
    providerSubscriptionId: subscription.id,
    status: mapStripeStatus(subscription.status),
    planId: plan.id,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    providerMetadata: subscription,
    customerEmail: customer.email,
    lastPaymentDate: invoice?.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : null,
    // Deleted/canceled subscriptions still resolve `current_period_end` to
    // their last period, so the null guard has to be `canceled_at`, not the
    // date itself — otherwise a canceled subscription looks like it still has
    // a next payment coming.
    nextPaymentDate: subscription.canceled_at === null ? periodEnd : null,
  };

  await upsertSubscription(input);
  return { ok: true };
}
