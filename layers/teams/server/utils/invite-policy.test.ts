import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AC-007: the invite page requires a session (the global auth middleware sends
// an anonymous visitor to login and back), the accept failure is shown instead
// of swallowed, and the invite e-mail is compared without case difference.
const layerRoot = join(import.meta.dirname, "..", "..");
const read = (relative: string) =>
  readFileSync(join(layerRoot, relative), "utf8");

describe("invite policy (AC-007)", () => {
  // SPECSFY: US-006 FR-005 FR-016 AC-007
  it("matches the invite e-mail to the signed-in user without case difference", async () => {
    const { inviteMatchesUser } = await import("./invite-policy");

    expect(
      inviteMatchesUser(
        { email: "Maria.Silva@Example.com" },
        { email: "maria.silva@example.com" },
      ),
    ).toBe(true);
    expect(
      inviteMatchesUser({ email: "ana@example.com" }, { email: "ANA@EXAMPLE.COM" }),
    ).toBe(true);
    // Boundary: case folding never turns two different addresses into a match.
    expect(
      inviteMatchesUser({ email: "ana@example.com" }, { email: "ana2@example.com" }),
    ).toBe(false);
  });

  // SPECSFY: US-006 FR-005 FR-016 AC-007
  it("protects the invite page, surfaces the accept error and compares through inviteMatchesUser", () => {
    const page = read("app/pages/invite/[[id]].vue");
    // A public page lets an anonymous visitor reach the accept button; without
    // `auth: false` the global auth middleware sends them to login and back.
    expect(page).not.toMatch(/\bauth\s*:\s*false\b/);

    const catches = [...page.matchAll(/catch\s*(?:\([^)]*\))?\s*\{([\s\S]*?)\}\s*finally/g)];
    expect(catches.length).toBeGreaterThan(0);
    for (const [, body] of catches) {
      const statements = (body ?? "")
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim();
      expect(statements, "the accept catch must show the error, not swallow it").not.toBe("");
    }

    const invites = read("server/trpc/invites.ts");
    expect(invites).toMatch(/\binviteMatchesUser\s*\(/);
    expect(invites).not.toMatch(/invite\.email\s*!==\s*user\.email/);
  });
});
