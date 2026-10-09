import type { KVNamespace } from "@cloudflare/workers-types";
import {
  kvNamespaceStore,
  rateLimit as fixedWindow,
  type RateLimitRule,
} from "@nuxfire/rate-limit";

/**
 * Fixed-window rate limit for the auth Worker, backed by `AuthKV`. Its
 * counters are separate from the app's: same algorithm, different namespace.
 */
export function rateLimit(kv: KVNamespace, key: string, rule: RateLimitRule) {
  return fixedWindow(kvNamespaceStore(kv), key, rule);
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
