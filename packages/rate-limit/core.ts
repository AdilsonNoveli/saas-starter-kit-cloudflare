/**
 * Fixed-window rate limit over an injected counter store. Used to protect
 * public endpoints (payment webhooks, MFA, credential routes) from floods:
 * HMAC signature validation alone doesn't stop a high-volume replay of a
 * previously-valid (or leaked) signed payload.
 *
 * Read-increment-write is not atomic, so concurrent calls can undercount; the
 * limit is a brake, not an exact quota. Each store keeps its own counters.
 */
export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

export interface RateLimitStore {
  get(key: string): Promise<number | null | undefined>;
  set(key: string, value: number, ttlSeconds: number): Promise<void>;
}

// Cloudflare KV rejects a TTL under 60s, so the window can't be shorter.
export const MIN_WINDOW_SECONDS = 60;

export async function rateLimit(
  store: RateLimitStore,
  key: string,
  { limit, windowSeconds }: RateLimitRule,
  now: () => number = Date.now,
): Promise<RateLimitResult> {
  const window = Math.max(windowSeconds, MIN_WINDOW_SECONDS);
  const storeKey = `ratelimit:${key}:${Math.floor(now() / 1000 / window)}`;
  const count = ((await store.get(storeKey)) ?? 0) + 1;
  await store.set(storeKey, count, window);
  return { allowed: count <= limit, count, limit };
}
