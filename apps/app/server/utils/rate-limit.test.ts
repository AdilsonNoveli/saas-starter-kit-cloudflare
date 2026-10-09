import { readFileSync } from "node:fs";
import { createError, type H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertNotRateLimited, rateLimit } from "./rate-limit";

// `hubKV`, `getRequestIP` and `createError` are Nitro auto-imports: Vitest runs
// this file as a plain module, so they are put on globalThis per test. The KV
// fake has the NuxtHub `get(key)` / `set(key, value, { ttl })` shape.
const event = {} as H3Event;
const WINDOW_START = 1_799_999_940_000; // windowId 29_999_999 for a 60 s window

function stubHubKv() {
  const data = new Map<string, unknown>();
  const writes: { key: string; value: unknown; ttl?: number }[] = [];
  vi.stubGlobal("hubKV", () => ({
    async get(key: string) {
      return data.has(key) ? data.get(key) : null;
    },
    async set(key: string, value: unknown, options?: { ttl?: number }) {
      writes.push({ key, value, ttl: options?.ttl });
      data.set(key, value);
    },
  }));
  return { writes };
}

describe("apps/app rate limit wrapper (AC-009)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(WINDOW_START);
    vi.stubGlobal("createError", createError);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // SPECSFY: US-002 FR-003 AC-009
  it("assertNotRateLimited throws 429 for the IP from getRequestIP once over the limit", async () => {
    const { writes } = stubHubKv();
    const getRequestIP = vi.fn(() => "203.0.113.7");
    vi.stubGlobal("getRequestIP", getRequestIP);
    const options = { limit: 1, windowSeconds: 300 };

    await expect(assertNotRateLimited(event, "mfa:verify", options)).resolves.toBeUndefined();
    const rejection = assertNotRateLimited(event, "mfa:verify", options);

    await expect(rejection).rejects.toMatchObject({
      statusCode: 429,
      statusMessage: "Too Many Requests",
    });
    expect(getRequestIP).toHaveBeenCalledWith(event, { xForwardedFor: true });
    expect(writes.map((w) => w.key)).toEqual([
      "ratelimit:mfa:verify:203.0.113.7:5999999",
      "ratelimit:mfa:verify:203.0.113.7:5999999",
    ]);
  });

  // SPECSFY: US-002 FR-003 AC-009
  it("assertNotRateLimited buckets callers without an IP under 'unknown' and lets them through under the limit", async () => {
    const { writes } = stubHubKv();
    vi.stubGlobal("getRequestIP", () => undefined);

    await expect(
      assertNotRateLimited(event, "checkout", { limit: 20, windowSeconds: 60 }),
    ).resolves.toBeUndefined();
    expect(writes).toEqual([
      { key: "ratelimit:checkout:unknown:29999999", value: 1, ttl: 60 },
    ]);
  });

  // SPECSFY: US-002 FR-003 AC-009
  it("keeps the rateLimit(key, rule) signature the existing callers use", async () => {
    const { writes } = stubHubKv();

    const first = await rateLimit("webhook:paddle", { limit: 1, windowSeconds: 10 });
    const second = await rateLimit("webhook:paddle", { limit: 1, windowSeconds: 10 });

    expect(first).toEqual({ allowed: true, count: 1, limit: 1 });
    expect(second).toEqual({ allowed: false, count: 2, limit: 1 });
    expect(writes[0]).toEqual({ key: "ratelimit:webhook:paddle:29999999", value: 1, ttl: 60 });
  });

  // SPECSFY: US-002 FR-003 AC-009
  it("delegates the fixed-window algorithm to @nuxfire/rate-limit instead of holding its own copy", () => {
    const source = readFileSync(new URL("./rate-limit.ts", import.meta.url), "utf8");

    expect(source).toMatch(/from\s+["']@nuxfire\/rate-limit["']/);
    expect(source).not.toMatch(/windowId/);
  });
});
