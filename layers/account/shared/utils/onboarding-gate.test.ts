import { describe, expect, it } from "vitest";
import { onboardingRedirect } from "./onboarding-gate";

// SPEC-0010 (Fase 3b), AC-001 and AC-005: the onboarding gate is a pure function
// of the session (`preferences` already comes with it, so no extra server call)
// and the path. `apps/app/app/middleware/2.onboarding.global.ts` only calls it.
const PREFERENCES = {
  locale: "pt-br",
  timeZone: "America/Sao_Paulo",
  theme: "system",
  dateFormat: "DMY",
  nameOrder: "WESTERN",
};
const APP_PAGES = ["/", "/acme/dashboard", "/account-settings", "/account-settings/security", "/select-team"];
const EXEMPT = ["/api/trpc/account.me", "/api/auth/callback", "/buy/pro", "/claim/abc123", "/invite/inv_1", "/invite"];

describe("onboardingRedirect, first access", () => {
  // SPECSFY: US-001 FR-003 FR-004 NFR-003 AC-001
  it("sends a person whose session has no preferences from every app page to /onboarding, synchronously", () => {
    for (const path of APP_PAGES) {
      const result = onboardingRedirect({ preferences: null, path });
      // A plain value, not a promise: the decision needs nothing beyond the session.
      expect(result, path).toBe("/onboarding");
    }
    // Boundary: already on the onboarding page, no redirect loop.
    expect(onboardingRedirect({ preferences: null, path: "/onboarding" })).toBeNull();
  });
});

describe("onboardingRedirect, both directions and exempt routes", () => {
  // SPECSFY: US-001 FR-003 NFR-003 AC-005
  it("sends a person with preferences away from /onboarding, keeps them elsewhere and never touches /api, /buy, /claim or /invite", () => {
    expect(onboardingRedirect({ preferences: PREFERENCES, path: "/onboarding" })).toBe("/");
    for (const path of APP_PAGES) {
      expect(onboardingRedirect({ preferences: PREFERENCES, path }), path).toBeNull();
    }
    for (const path of EXEMPT) {
      expect(onboardingRedirect({ preferences: null, path }), `no preferences: ${path}`).toBeNull();
      expect(onboardingRedirect({ preferences: PREFERENCES, path }), `with preferences: ${path}`).toBeNull();
    }
    // Boundary: the exemption is per path segment, so a Space slug that merely
    // starts with an exempt word is still an app page.
    expect(onboardingRedirect({ preferences: null, path: "/buyers/dashboard" })).toBe("/onboarding");
    expect(onboardingRedirect({ preferences: null, path: "/invitees/dashboard" })).toBe("/onboarding");
  });
});
