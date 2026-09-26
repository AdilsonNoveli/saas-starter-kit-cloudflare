import { describe, expect, it } from "vitest";
import {
  signPaddleTeam,
  verifyPaddleTeam,
  signPaddlePendingPurchase,
  verifyPaddlePendingPurchase,
} from "./paddle-team-signature";

const SECRET = "test-webhook-secret-with-enough-length";

describe("paddle team signature", () => {
  it("accepts a signature made for the same team and secret", async () => {
    const signature = await signPaddleTeam(SECRET, "team_a");
    expect(await verifyPaddleTeam(SECRET, "team_a", signature)).toBe(true);
  });

  it("rejects a signature reused for a different team", async () => {
    const signature = await signPaddleTeam(SECRET, "team_a");
    expect(await verifyPaddleTeam(SECRET, "team_b", signature)).toBe(false);
  });

  it("rejects a signature made with a different secret", async () => {
    const signature = await signPaddleTeam("another-secret-of-similar-size!!", "team_a");
    expect(await verifyPaddleTeam(SECRET, "team_a", signature)).toBe(false);
  });

  it("rejects missing, malformed and tampered signatures", async () => {
    const signature = await signPaddleTeam(SECRET, "team_a");
    expect(await verifyPaddleTeam(SECRET, "team_a", "")).toBe(false);
    expect(await verifyPaddleTeam(SECRET, "team_a", "not-hex")).toBe(false);
    const tampered = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`;
    expect(await verifyPaddleTeam(SECRET, "team_a", tampered)).toBe(false);
  });

  it("fails closed when the secret is not configured", async () => {
    await expect(signPaddleTeam("", "team_a")).rejects.toThrow();
    expect(await verifyPaddleTeam("", "team_a", "aa")).toBe(false);
  });
});

describe("paddle pending-purchase signature", () => {
  it("SPECSFY: AC-011 accepts a signature made for the same pending purchase and secret", async () => {
    const signature = await signPaddlePendingPurchase(SECRET, "pp_a");
    expect(await verifyPaddlePendingPurchase(SECRET, "pp_a", signature)).toBe(true);
  });

  it("SPECSFY: AC-011 rejects a signature reused for a different pending purchase", async () => {
    const signature = await signPaddlePendingPurchase(SECRET, "pp_a");
    expect(await verifyPaddlePendingPurchase(SECRET, "pp_b", signature)).toBe(false);
  });

  it("SPECSFY: AC-011 rejects a tampered signature", async () => {
    const signature = await signPaddlePendingPurchase(SECRET, "pp_a");
    const tampered = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`;
    expect(await verifyPaddlePendingPurchase(SECRET, "pp_a", tampered)).toBe(false);
  });

  it("SPECSFY: AC-011 keeps the two domains separate: a team signature never verifies as a pending-purchase signature", async () => {
    const teamSignature = await signPaddleTeam(SECRET, "same_id");
    expect(await verifyPaddlePendingPurchase(SECRET, "same_id", teamSignature)).toBe(false);

    const purchaseSignature = await signPaddlePendingPurchase(SECRET, "same_id");
    expect(await verifyPaddleTeam(SECRET, "same_id", purchaseSignature)).toBe(false);
  });

  it("fails closed when the secret is not configured", async () => {
    await expect(signPaddlePendingPurchase("", "pp_a")).rejects.toThrow();
    expect(await verifyPaddlePendingPurchase("", "pp_a", "aa")).toBe(false);
  });
});
