import type { KVNamespace } from "@cloudflare/workers-types";

/**
 * Fixed-window rate limiter for the auth Worker, backed by `AuthKV`.
 *
 * Same shape and semantics as `packages/app/server/utils/rate-limit.ts`, but
 * standalone: that one calls `hubKV()`, a NuxtHub helper that only exists
 * inside the app's Nitro runtime. This Worker has no Nitro and no NuxtHub, so
 * the namespace is passed in explicitly and the raw KV API (`get`/`put`) is
 * used instead of NuxtHub's `get`/`set` wrapper.
 */
export async function rateLimit(
  kv: KVNamespace,
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
) {
  // Cloudflare KV rejects a TTL under 60s, so the window can't be shorter.
  const window = Math.max(windowSeconds, 60);
  const windowId = Math.floor(Date.now() / 1000 / window);
  const kvKey = `ratelimit:${key}:${windowId}`;
  const count = ((await kv.get<number>(kvKey, "json")) ?? 0) + 1;
  await kv.put(kvKey, JSON.stringify(count), { expirationTtl: window });
  return { allowed: count <= limit, count, limit };
}

/**
 * The caller's address. `CF-Connecting-IP` is set by Cloudflare itself on
 * every request that reaches a Worker and cannot be spoofed by the client;
 * `X-Forwarded-For` is only a fallback for local `wrangler dev`, where the
 * former is absent.
 */
export function clientIp(request: Request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
