import { describe, expect, it } from "vitest";
import { SESSION_SLIDING_DAYS, buildSessionRecord } from "./session-registry";

// SPEC-0010 (Fase 3b), AC-016 and AC-018: the callback turns the token `sid`,
// the User-Agent and `event.context.cf` into one `UserSession` row. The row
// keeps country, region and city only; IP, coordinates and postal code never
// reach it.
const FIREFOX_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";
const NOW = new Date("2026-10-06T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const FIELDS = ["browser", "city", "country", "createdAt", "expiresAt", "id", "lastUsedAt", "os", "region", "userId"];
const FORBIDDEN_KEY = /(^ip$|ip_?address|client_?ip|latitude|longitude|postal)/iu;

describe("buildSessionRecord, login", () => {
  // SPECSFY: US-004 FR-001 FR-010 NFR-002 AC-016
  it("records sid, browser, system, place, creation, last use and validity, and no IP", () => {
    const record = buildSessionRecord({
      sid: "sid_1",
      userId: "user_1",
      userAgent: FIREFOX_WINDOWS,
      cf: { country: "BR", region: "SP", city: "São Paulo", clientTcpRtt: 12, asOrganization: "Example ISP" },
      now: NOW,
    });
    expect(record).toEqual({
      id: "sid_1",
      userId: "user_1",
      browser: "Firefox",
      os: "Windows",
      country: "BR",
      region: "SP",
      city: "São Paulo",
      createdAt: NOW,
      lastUsedAt: NOW,
      expiresAt: new Date(NOW.getTime() + 30 * DAY_MS),
    });
    expect(Object.keys(record).sort()).toEqual(FIELDS);
    for (const key of Object.keys(record)) expect(key, key).not.toMatch(FORBIDDEN_KEY);
    expect(SESSION_SLIDING_DAYS).toBe(30);
  });
});

describe("buildSessionRecord, missing place and coordinates", () => {
  // SPECSFY: US-004 FR-010 NFR-002 AC-018
  it("stores null for a missing place and never copies latitude, longitude or postal code", () => {
    const cf = { country: "BR", region: "SP", latitude: "-23.55052", longitude: "-46.63331", postalCode: "01310-100" };
    const record = buildSessionRecord({ sid: "sid_2", userId: "user_1", userAgent: FIREFOX_WINDOWS, cf, now: NOW });
    expect(record.country).toBe("BR");
    expect(record.region).toBe("SP");
    expect(record.city).toBeNull();
    expect(Object.keys(record).sort()).toEqual(FIELDS);
    const serialized = JSON.stringify(record);
    for (const value of [cf.latitude, cf.longitude, cf.postalCode]) expect(serialized).not.toContain(value);

    // Boundary: no `cf` at all, or one with non-text fields, leaves the place null.
    for (const missing of [undefined, null, {}, { country: 76, region: null, city: ["São Paulo"] }]) {
      const row = buildSessionRecord({ sid: "sid_3", userId: "user_1", userAgent: undefined, cf: missing, now: NOW });
      expect({ country: row.country, region: row.region, city: row.city }, JSON.stringify(missing)).toEqual({
        country: null,
        region: null,
        city: null,
      });
      expect(row.browser).toBe("Navegador desconhecido");
      expect(row.os).toBe("Sistema desconhecido");
    }
  });
});
