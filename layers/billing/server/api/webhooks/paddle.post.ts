import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { sender } from "@nuxfire/functions/sender";
import {
  markEventProcessed,
  wasEventProcessed,
} from "../../utils/billing/event-ledger";
import { dispatch } from "../../utils/billing/paddle-webhook-dispatch";

/**
 * Deliberately thin: verify → dedupe → dispatch. All the actual state
 * resolution (which team, which plan, what changed — including SPEC-0004's
 * pending-purchase fork) lives in `paddle-webhook-dispatch.ts`, tested on its
 * own since this file's `defineEventHandler` needs Nitro's auto-imports at
 * module-eval time, which a plain Vitest run never provides.
 */
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

  const sendEmail = sender(event.context?.cloudflare?.env?.Emails);
  const origin = getRequestURL(event).origin;

  try {
    const outcome = await dispatch(paddle, eventData, secretKey, sendEmail, origin);
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
