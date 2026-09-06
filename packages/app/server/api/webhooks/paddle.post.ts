import { Environment, EventName, Paddle } from "@paddle/paddle-node-sdk";
import { eq } from "drizzle-orm";
import { PaymentProvider, SubscriptionStatus } from "~~/types/enums";
import { plans, subscriptions } from "@nuxfire/functions/schema";

export default defineEventHandler(async (event) => {
  await assertNotRateLimited(event, "webhook:paddle", {
    limit: 60,
    windowSeconds: 60,
  });

  const { paddleApiKey, paddleWebhookSecret, paddleSandbox } =
    useRuntimeConfig(event);
  const paddle = new Paddle(paddleApiKey || "", {
    environment: paddleSandbox ? Environment.sandbox : Environment.production,
  });
  const signature = getRequestHeader(event, "paddle-signature") || "";
  const rawBody = (await readRawBody(event)) || "";
  const secretKey = paddleWebhookSecret || "";

  try {
    const eventData = await paddle.webhooks.unmarshal(
      rawBody,
      secretKey,
      signature,
    );
    switch (eventData?.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        {
          const subscriptionEvent = eventData.data;
          const teamId = (subscriptionEvent.customData as { team_id: string })
            ?.team_id;
          const priceId = subscriptionEvent.items[0]?.price?.id;
          if (!teamId) {
            return { status: "error", message: "Missing team ID" };
          }

          if (!priceId) {
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

          const customer = await paddle.customers.get(
            subscriptionEvent.customerId,
          );
          const subscriptionData = {
            teamId,
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
    console.error("Paddle webhook error:", error);
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid webhook payload",
    });
  }
});

function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    paused: SubscriptionStatus.PAUSED,
    canceled: SubscriptionStatus.CANCELED,
    expired: SubscriptionStatus.UNPAID,
  };

  return statusMap[paddleStatus] || SubscriptionStatus.INCOMPLETE;
}
