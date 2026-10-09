import type { H3Event } from "h3";
import { afterEach, describe, expect, it, vi } from "vitest";

// SPEC-0007 (Fase 0): same rule for the platform admin console's authenticator issuer.
// The schema barrel is heavy to load and irrelevant here: only the issuer lookup is under test.
vi.mock("@nuxfire/functions/schema", () => ({ platformAdmins: {} }));

// Importing the module can take longer than the 5 s default when the whole suite runs in parallel.
const IMPORT_TIMEOUT = 30_000;

const event = {} as H3Event;

afterEach(() => vi.unstubAllGlobals());

describe("platform admin MFA issuer", () => {
  // SPECSFY: US-003 FR-007 NFR-001 AC-014
  it(
    "uses the configured brand name as the TOTP issuer",
    async () => {
      vi.stubGlobal("useRuntimeConfig", () => ({ brandName: "Serelius" }));
      const { platformAdminIssuer } = await import("./platform-admin");
      expect(platformAdminIssuer(event)).toBe("Serelius");
    },
    IMPORT_TIMEOUT,
  );
});
