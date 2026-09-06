import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { PaymentProvider, SubscriptionStatus } from "~~/types/enums";
import { createStripeClient } from "~~/server/utils/stripe";
import { plans, subscriptions } from "@movimenta-bairro/functions/schema";

// stripe-node's Stripe.Subscription type dropped legacy fields (plan,
// current_period_start/end) that the raw webhook payload still sends for
// API versions pinned before Stripe's 2024 subscription-items migration —
// this documents exactly what we actually read off the payload instead of
// relying on `any`.
interface SubscriptionWebhookPayload {
  id: string;
  status: string;
  customer: string;
  plan?: { id: string } | null;
  latest_invoice: string;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
}

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

  try {
    const stripe = createStripeClient(event);

    const stripeEvent: Stripe.Event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      stripeWebhookSecretKey,
    );

    switch (stripeEvent?.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        {
          const subscriptionEvent = stripeEvent.data
            .object as unknown as SubscriptionWebhookPayload;
          const customer = (await stripe.customers.retrieve(
            subscriptionEvent.customer,
          )) as Stripe.Customer;

          const teamId = customer?.metadata?.team_id;
          const priceId = subscriptionEvent.plan?.id;
          if (!teamId) {
            console.error("No team ID found in subscription event");
            return { status: "error", message: "Missing team ID" };
          }
          if (!priceId) {
            console.error("No price ID found in subscription event");
            return { status: "error", message: "Invalid product" };
          }
          const plan = await useDB().query.plans.findFirst({
            where: eq(plans.providerPriceId, priceId),
          });
          if (!plan) {
            console.error(`No plan found for product ID: ${priceId}`);
            return { status: "error", message: "Invalid product" };
          }

          const existingSubscription =
            await useDB().query.subscriptions.findFirst({
              where: eq(
                subscriptions.providerSubscriptionId,
                subscriptionEvent.id,
              ),
            });

          const invoice = (await stripe.invoices.retrieve(
            subscriptionEvent.latest_invoice,
          )) as Stripe.Invoice;

          const lastPaymentDate = invoice?.status_transitions?.paid_at;

          const subscriptionData = {
            teamId,
            status: mapStripeStatus(subscriptionEvent.status),
            provider: PaymentProvider.STRIPE,
            providerSubscriptionId: subscriptionEvent.id,
            planId: plan.id,
            currentPeriodStart: subscriptionEvent.current_period_start
              ? new Date(subscriptionEvent.current_period_start * 1000)
              : null,
            currentPeriodEnd: subscriptionEvent.current_period_end
              ? new Date(subscriptionEvent.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: subscriptionEvent.cancel_at_period_end,
            providerMetadata: subscriptionEvent,
            customerEmail: customer.email,
            lastPaymentDate: lastPaymentDate
              ? new Date(lastPaymentDate * 1000)
              : null,
            nextPaymentDate:
              subscriptionEvent.current_period_end &&
              subscriptionEvent.canceled_at === null
                ? new Date(subscriptionEvent.current_period_end * 1000)
                : null,
          };

          if (existingSubscription) {
            await useDB()
              .update(subscriptions)
              .set(subscriptionData)
              .where(eq(subscriptions.teamId, teamId));
          } else {
            await useDB().insert(subscriptions).values(subscriptionData);
          }
        }
        break;
    }
    return { status: "success" };
  } catch (error) {
    console.error("Stripe webhook error:", error);
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid webhook payload",
    });
  }
});

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    paused: SubscriptionStatus.PAUSED,
    canceled: SubscriptionStatus.CANCELED,
    expired: SubscriptionStatus.UNPAID,
  };

  return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
}
