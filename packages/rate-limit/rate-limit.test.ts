import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MIN_WINDOW_SECONDS,
  rateLimit,
  type RateLimitStore,
} from "@nuxfire/rate-limit";

// In-memory store that honours the port and records every write, so the key,
// the counter and the TTL handed to the store can be asserted directly.
function memoryStore() {
  const data = new Map<string, number>();
  const writes: { key: string; value: number; ttlSeconds: number }[] = [];
  const store: RateLimitStore = {
    async get(key) {
      return data.get(key);
    },
    async set(key, value, ttlSeconds) {
      writes.push({ key, value, ttlSeconds });
      data.set(key, value);
    },
  };
  return { store, writes };
}

// Exact start of a 60-second window: 1_799_999_940 / 60 = 29_999_999.
const WINDOW_START = 1_799_999_940_000;

describe("rateLimit core (AC-007)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // SPECSFY: US-002 FR-003 NFR-001 AC-007
  it("counts every call and stops allowing once the limit is passed", async () => {
    const { store, writes } = memoryStore();
    const rule = { limit: 2, windowSeconds: 60 };
    const clock = () => WINDOW_START + 1_000;

    const results = [
      await rateLimit(store, "login:203.0.113.7", rule, clock),
      await rateLimit(store, "login:203.0.113.7", rule, clock),
      await rateLimit(store, "login:203.0.113.7", rule, clock),
    ];

    expect(results).toEqual([
      { allowed: true, count: 1, limit: 2 },
      { allowed: true, count: 2, limit: 2 },
      { allowed: false, count: 3, limit: 2 },
    ]);
    expect(writes.map((w) => w.key)).toEqual([
      "ratelimit:login:203.0.113.7:29999999",
      "ratelimit:login:203.0.113.7:29999999",
      "ratelimit:login:203.0.113.7:29999999",
    ]);
    expect(writes.map((w) => w.value)).toEqual([1, 2, 3]);
  });

  // SPECSFY: US-002 FR-003 NFR-001 AC-007
  it("restarts the count when the window rolls over", async () => {
    const { store, writes } = memoryStore();
    const rule = { limit: 1, windowSeconds: 60 };
    let now = WINDOW_START + 59_999;
    const clock = () => now;

    await rateLimit(store, "k", rule, clock);
    const lastInWindow = await rateLimit(store, "k", rule, clock);
    now = WINDOW_START + 60_000;
    const firstInNext = await rateLimit(store, "k", rule, clock);

    expect(lastInWindow).toEqual({ allowed: false, count: 2, limit: 1 });
    expect(firstInNext).toEqual({ allowed: true, count: 1, limit: 1 });
    expect(writes.map((w) => w.key)).toEqual([
      "ratelimit:k:29999999",
      "ratelimit:k:29999999",
      "ratelimit:k:30000000",
    ]);
  });

  // SPECSFY: US-002 FR-003 NFR-001 AC-007
  it("floors both the window and the TTL at 60 seconds", async () => {
    expect(MIN_WINDOW_SECONDS).toBe(60);
    const { store, writes } = memoryStore();
    const shortRule = { limit: 5, windowSeconds: 10 };
    let now = WINDOW_START;
    const clock = () => now;

    await rateLimit(store, "short", shortRule, clock);
    // 30 s later would be a new 10-second window; with the floor it is the same one.
    now = WINDOW_START + 30_000;
    const second = await rateLimit(store, "short", shortRule, clock);
    await rateLimit(store, "long", { limit: 5, windowSeconds: 300 }, clock);

    expect(second.count).toBe(2);
    expect(writes[0]).toEqual({
      key: "ratelimit:short:29999999",
      value: 1,
      ttlSeconds: 60,
    });
    expect(writes[1]?.key).toBe("ratelimit:short:29999999");
    expect(writes[1]?.ttlSeconds).toBe(60);
    // A window above the floor is kept as is: 1_799_999_970 / 300 = 5_999_999.9.
    expect(writes[2]).toEqual({
      key: "ratelimit:long:5999999",
      value: 1,
      ttlSeconds: 300,
    });
  });

  // SPECSFY: US-002 FR-003 NFR-001 AC-007
  it("uses Date.now when no clock is injected", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(WINDOW_START + 60_000);
    const { store, writes } = memoryStore();

    const result = await rateLimit(store, "k", { limit: 3, windowSeconds: 60 });

    expect(result).toEqual({ allowed: true, count: 1, limit: 3 });
    expect(writes[0]?.key).toBe("ratelimit:k:30000000");
  });

  // SPECSFY: US-002 FR-003 NFR-001 AC-007
  it("propagates a store failure instead of swallowing it", async () => {
    const readFailure = new Error("kv read failed");
    const set = vi.fn<RateLimitStore["set"]>(async () => {});
    const failingRead: RateLimitStore = {
      get: async () => {
        throw readFailure;
      },
      set,
    };
    await expect(
      rateLimit(failingRead, "k", { limit: 1, windowSeconds: 60 }, () => WINDOW_START),
    ).rejects.toBe(readFailure);
    expect(set).not.toHaveBeenCalled();

    const writeFailure = new Error("kv write failed");
    const failingWrite: RateLimitStore = {
      get: async () => null,
      set: async () => {
        throw writeFailure;
      },
    };
    await expect(
      rateLimit(failingWrite, "k", { limit: 1, windowSeconds: 60 }, () => WINDOW_START),
    ).rejects.toBe(writeFailure);
  });
});
