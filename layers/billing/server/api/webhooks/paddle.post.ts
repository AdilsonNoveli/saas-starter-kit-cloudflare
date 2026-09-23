import { Environment, EventName, Paddle } from "@paddle/paddle-node-sdk";
import { eq } from "drizzle-orm";
import { PaymentProvider, SubscriptionStatus } from "../../../shared/types/enums";
import { plans } from "@nuxfire/functions/schema";
import {
  upsertSubscription,
  type SubscriptionUpsertInput,
} from "../../utils/billing/subscription-repository";
import { verifyPaddleTeam } from "../../utils/billing/paddle-team-signature";
import {
  markEventProcessed,
  wasEventProcessed,
} from "../../utils/billing/event-ledger";

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

  let eventData: Awaited<ReturnType<typeof paddle.webhooks.unmarshal>>;
  try {
    eventData = await paddle.webhooks.unmarshal(rawBody, secretKey, signature);
  } catch (error) {
    console.error("Paddle webhook signature verification failed:", error);
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid webhook payload",
    });
  }

  if (!eventData) {
    return { status: "error", message: "Empty webhook payload" };
  }

  // Paddle event ids are unique per delivery, same as Stripe's — sharing the
  // ledger under a distinct provider prefix keeps the two namespaces apart
  // without needing two separate KV stores.
  if (await wasEventProcessed("paddle", eventData.eventId)) {
    return { status: "success", deduped: true };
  }

  try {
    const outcome = await dispatch(paddle, eventData, secretKey);
    if (!outcome.ok) {
      console.error(`Paddle webhook ${eventData.eventType}: ${outcome.reason}`);
      return { status: "error", message: outcome.reason };
    }

    await markEventProcessed("paddle", eventData.eventId);
    return { status: "success" };
  } catch (error) {
    console.error("Paddle webhook handler error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Webhook handler failed",
    });
  }
});

async function dispatch(
  paddle: Paddle,
  eventData: Awaited<ReturnType<Paddle["webhooks"]["unmarshal"]>>,
  secretKey: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  switch (eventData.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled: {
      const subscriptionEvent = eventData.data;
      const customData = subscriptionEvent.customData as {
        team_id?: string;
        team_sig?: string;
      } | null;
      const teamId = customData?.team_id;
      if (!teamId) {
        return { ok: false, reason: "Missing team ID" };
      }
      // team_id comes from the browser that opened the checkout; only a value
      // signed by createPaddleCheckoutData (after a membership check) is trusted.
      if (!(await verifyPaddleTeam(secretKey, teamId, customData?.team_sig ?? ""))) {
        return { ok: false, reason: "Invalid team signature" };
      }

      const priceId = subscriptionEvent.items[0]?.price?.id;
      if (!priceId) {
        return { ok: false, reason: "Invalid product" };
      }

      const plan = await useDB().query.plans.findFirst({
        where: eq(plans.providerPriceId, priceId),
      });
      if (!plan) {
        return {
          ok: false,
          reason: `No plan found for product ID: ${priceId}`,
        };
      }

      const customer = await paddle.customers.get(subscriptionEvent.customerId);

      const input: SubscriptionUpsertInput = {
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

      await upsertSubscription(input);
      return { ok: true };
    }

    default:
      return { ok: true };
  }
}

function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    trialing: SubscriptionStatus.TRIALING,
    past_due: SubscriptionStatus.PAST_DUE,
    paused: SubscriptionStatus.PAUSED,
    canceled: SubscriptionStatus.CANCELED,
  };

  return statusMap[paddleStatus] ?? SubscriptionStatus.INCOMPLETE;
}
