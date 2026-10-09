import type { RateLimitStore } from "./core";

/** The calls the auth Worker makes on a Cloudflare `KVNamespace` binding. */
export interface KvNamespaceLike {
  get(key: string, type: "json"): Promise<number | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

/** The calls the app makes on the NuxtHub KV storage, which serializes values itself. */
export interface HubKvLike {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, options: { ttl: number }): Promise<void>;
}

export function kvNamespaceStore(kv: KvNamespaceLike): RateLimitStore {
  return {
    get: (key) => kv.get(key, "json"),
    set: (key, value, ttlSeconds) =>
      kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds }),
  };
}

export function hubKvStore(kv: HubKvLike): RateLimitStore {
  return {
    get: (key) => kv.get(key),
    set: (key, value, ttlSeconds) => kv.set(key, value, { ttl: ttlSeconds }),
  };
}
