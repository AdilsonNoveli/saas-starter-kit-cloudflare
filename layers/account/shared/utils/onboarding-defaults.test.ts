import { describe, expect, it } from "vitest";
import { onboardingDefaults } from "./onboarding-defaults";

// SPEC-0010 (Fase 3b), AC-004: with no name on record (password or code sign-in),
// step 1 suggests one from the e-mail local part and step 3 a Space name from it.
describe("onboardingDefaults", () => {
  // SPECSFY: US-001 FR-004 NFR-005 AC-004
  it("suggests a title-cased name from the e-mail and a Space name derived from it, keeping a name already on record", () => {
    const fromEmail = onboardingDefaults({ name: null, email: "maria.silva@exemplo.com" });
    expect(fromEmail.name).toBe("Maria Silva");
    expect(fromEmail.spaceName).toContain("Maria Silva");

    // Boundary: a blank name counts as no name.
    expect(onboardingDefaults({ name: "   ", email: "maria.silva@exemplo.com" }).name).toBe("Maria Silva");
    // Other usual separators of the local part.
    expect(onboardingDefaults({ name: null, email: "joao_pereira@exemplo.com" }).name).toBe("Joao Pereira");

    const existing = onboardingDefaults({ name: "Ana Costa", email: "maria.silva@exemplo.com" });
    expect(existing.name).toBe("Ana Costa");
    expect(existing.spaceName).toContain("Ana Costa");
  });
});
