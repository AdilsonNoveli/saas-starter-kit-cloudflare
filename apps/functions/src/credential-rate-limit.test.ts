import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./auth";

// enforceCredentialRateLimit is private to auth.ts, so it is exercised through
// the Worker's own fetch: an over-limit POST to a credential route returns the
// 302 before the issuer is ever built. The fake AuthKV answers every read with
// the rule's limit, so the next attempt is the first one over it.
type WorkerEnv = Parameters<typeof worker.fetch>[1];

const WINDOW_START = 1_799_999_940_000; // 1_799_999_940 s, a multiple of 300 and 900

function fakeAuthKv(storedCount: number) {
  const writes: { key: string; value: string; expirationTtl?: number }[] = [];
  const kv = {
    async get(_key: string, _type: string) {
      return storedCount;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      writes.push({ key, value, expirationTtl: options?.expirationTtl });
    },
  };
  return { kv, writes };
}

function envWith(kv: ReturnType<typeof fakeAuthKv>["kv"], devUrl?: string): WorkerEnv {
  return { AuthKV: kv, DEV_URL: devUrl } as unknown as WorkerEnv;
}

function credentialPost(path: string, form: Record<string, string>) {
  return new Request(`https://auth.example.test${path}`, {
    method: "POST",
    headers: {
      "CF-Connecting-IP": "203.0.113.7",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form).toString(),
  });
}

const ctx = {} as ExecutionContext;

describe("auth Worker credential rate limit (AC-009)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(WINDOW_START);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // SPECSFY: US-002 FR-003 AC-009
  it("redirects an over-limit password reset to /forgot-password with Retry-After from the rule", async () => {
    const { kv, writes } = fakeAuthKv(5);

    const response = await worker.fetch(
      credentialPost("/password/change", { email: "Ana@Example.com" }),
      envWith(kv),
      ctx,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Retry-After")).toBe("900");
    const location = new URL(response.headers.get("Location") ?? "");
    expect(location.origin).toBe("https://auth.example.test");
    expect(location.pathname).toBe("/forgot-password");
    expect(location.searchParams.get("err")).toBe("too_many_requests");
    expect(location.searchParams.get("email")).toBe("ana@example.com");
    expect(writes).toEqual([
      {
        key: "ratelimit:auth:/password/change:203.0.113.7:ana@example.com:1999999",
        value: "6",
        expirationTtl: 900,
      },
    ]);
  });

  // SPECSFY: US-002 FR-003 AC-009
  it("takes the page and Retry-After of each route's own rule, and keeps one bucket per IP without email", async () => {
    const { kv, writes } = fakeAuthKv(5);

    const response = await worker.fetch(
      credentialPost("/password/authorize", { code: "123456" }),
      envWith(kv, "https://dev.example.test"),
      ctx,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Retry-After")).toBe("300");
    const location = new URL(response.headers.get("Location") ?? "");
    expect(location.origin).toBe("https://dev.example.test");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("origin")).toBe("https://auth.example.test");
    expect(location.searchParams.has("email")).toBe(false);
    expect(writes[0]?.key).toBe("ratelimit:auth:/password/authorize:203.0.113.7:-:5999999");
    expect(writes[0]?.expirationTtl).toBe(300);
  });

  // SPECSFY: US-002 FR-003 AC-009
  it("the Worker's rateLimit delegates to @nuxfire/rate-limit and keeps clientIp outside the core", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "rate-limit.ts"),
      "utf8",
    );

    expect(source).toMatch(/from\s+["']@nuxfire\/rate-limit["']/);
    expect(source).not.toMatch(/windowId/);
    expect(source).toMatch(/export\s+function\s+clientIp/);
  });
});
