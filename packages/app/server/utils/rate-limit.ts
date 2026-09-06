/**
 * Fixed-window rate limiter backed by the app's KV binding. Used to protect
 * public, unauthenticated endpoints (payment webhooks) from abuse/flood —
 * HMAC signature validation alone doesn't stop a high-volume replay of a
 * previously-valid (or leaked) signed payload.
 */
export async function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
) {
  // Cloudflare KV rejects a TTL under 60s, so the window can't be shorter.
  const window = Math.max(windowSeconds, 60);
  const kv = hubKV();
  const windowId = Math.floor(Date.now() / 1000 / window);
  const kvKey = `ratelimit:${key}:${windowId}`;
  const count = ((await kv.get<number>(kvKey)) ?? 0) + 1;
  await kv.set(kvKey, count, { ttl: window });
  return { allowed: count <= limit, count, limit };
}

export async function assertNotRateLimited(
  event: import("h3").H3Event,
  routeKey: string,
  options: { limit: number; windowSeconds: number },
) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  const { allowed } = await rateLimit(`${routeKey}:${ip}`, options);
  if (!allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
    });
  }
}
