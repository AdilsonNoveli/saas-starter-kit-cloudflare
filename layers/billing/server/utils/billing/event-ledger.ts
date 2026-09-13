// Comfortably longer than Stripe's own retry window (~3 days) and Paddle's,
// so a legitimate retry is never mistaken for a fresh event; short enough
// that the KV namespace doesn't grow unbounded.
const EVENT_LEDGER_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Shared idempotency ledger for both webhook endpoints. Signature
 * verification proves a request came from the provider; it says nothing
 * about whether this exact event was already processed. Providers retry on
 * anything but a fast 2xx, and Stripe explicitly documents that the same
 * event can be delivered more than once — without this, a retried
 * `customer.subscription.updated` re-runs the same upsert twice, which is
 * harmless, but a future handler that has a side effect per event (an email,
 * a queued job) would fire it twice.
 */
export async function wasEventProcessed(
  provider: "stripe" | "paddle",
  eventId: string,
): Promise<boolean> {
  return (
    (await hubKV().get<boolean>(`webhook-event:${provider}:${eventId}`)) ===
    true
  );
}

/** Marked only after the event's handler completes — a failed attempt must stay retryable. */
export async function markEventProcessed(
  provider: "stripe" | "paddle",
  eventId: string,
): Promise<void> {
  await hubKV().set(`webhook-event:${provider}:${eventId}`, true, {
    ttl: EVENT_LEDGER_TTL_SECONDS,
  });
}
