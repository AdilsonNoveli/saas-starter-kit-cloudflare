import { hubKvStore, rateLimit as fixedWindow, type RateLimitRule } from "@nuxfire/rate-limit";

/** Fixed-window rate limit over the app's own KV binding. */
export function rateLimit(key: string, rule: RateLimitRule) {
  return fixedWindow(hubKvStore(hubKV()), key, rule);
}

export async function assertNotRateLimited(
  event: import("h3").H3Event,
  routeKey: string,
  options: RateLimitRule,
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
