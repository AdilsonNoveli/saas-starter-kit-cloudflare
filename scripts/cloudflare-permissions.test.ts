import { describe, expect, it, vi } from "vitest";
import {
  REDIRECT_ZONE_PERMISSIONS,
  probeZonePermissions,
} from "./cloudflare-permissions";

const answer = (status: number) => Promise.resolve(new Response("{}", { status }));
// Answers per request path, so each probe can be given its own status.
const byPath = (statuses: Record<string, number>) =>
  vi.fn((url: string | URL | Request) => {
    const path = String(url);
    const hit = Object.entries(statuses).find(([fragment]) => path.includes(fragment));
    return answer(hit ? hit[1] : 200);
  }) as unknown as typeof fetch;

describe("probeZonePermissions", () => {
  it("reports nothing when the token can reach every endpoint", async () => {
    const report = await probeZonePermissions({ token: "t", zoneId: "z", request: byPath({}) });
    expect(report).toEqual({ missing: [], unverified: [] });
  });

  it("names exactly the permission behind a 403 — the Page Rules failure of a real deploy", async () => {
    const report = await probeZonePermissions({
      token: "t",
      zoneId: "z",
      request: byPath({ "/pagerules": 403 }),
    });
    expect(report.missing).toEqual(["Page Rules → Edit"]);
  });

  it("names the DNS permission when only DNS is denied", async () => {
    const report = await probeZonePermissions({
      token: "t",
      zoneId: "z",
      request: byPath({ "/dns_records": 403 }),
    });
    expect(report.missing).toEqual(["DNS → Edit"]);
  });

  it("treats 401 like 403 and reports every missing permission at once", async () => {
    const report = await probeZonePermissions({
      token: "t",
      zoneId: "z",
      request: byPath({ "/dns_records": 401, "/pagerules": 403 }),
    });
    expect(report.missing).toEqual(["DNS → Edit", "Page Rules → Edit"]);
  });

  it("does not blame the token for an outage: 5xx and network errors are unverified, not missing", async () => {
    const request = vi
      .fn()
      .mockReturnValueOnce(answer(503))
      .mockRejectedValueOnce(new Error("ECONNRESET")) as unknown as typeof fetch;
    const report = await probeZonePermissions({ token: "t", zoneId: "z", request });
    expect(report).toEqual({
      missing: [],
      unverified: ["DNS → Edit", "Page Rules → Edit"],
    });
  });

  it("sends the token as a bearer and targets the given zone, read-only", async () => {
    const request = byPath({});
    await probeZonePermissions({ token: "secret-token", zoneId: "zone123", request });
    const calls = (request as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(REDIRECT_ZONE_PERMISSIONS.length);
    for (const [url, init] of calls) {
      expect(String(url)).toContain("/zones/zone123/");
      expect(init.headers).toEqual({ Authorization: "Bearer secret-token" });
      expect(init.method).toBeUndefined();
    }
  });
});
