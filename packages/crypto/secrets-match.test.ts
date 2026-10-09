import { describe, expect, it } from "vitest";
import { secretsMatch } from "@nuxfire/crypto";

const SECRET = "admin-FAKE-secret-not-a-secret-0001";

describe("secretsMatch", () => {
  // SPECSFY: FR-001 NFR-004 AC-029
  it("returns true only for equal secrets", () => {
    expect(secretsMatch(SECRET, `${SECRET}`)).toBe(true);
    expect(secretsMatch("çã 🔐", "çã 🔐")).toBe(true);
    expect(secretsMatch("", "")).toBe(true);
  });

  // SPECSFY: FR-001 NFR-004 AC-029
  it("returns false for different secrets of the same size, wherever they differ", () => {
    const lastDiffers = `${SECRET.slice(0, -1)}2`;
    const firstDiffers = `b${SECRET.slice(1)}`;
    expect(lastDiffers).toHaveLength(SECRET.length);
    expect(firstDiffers).toHaveLength(SECRET.length);
    expect(secretsMatch(SECRET, lastDiffers)).toBe(false);
    expect(secretsMatch(SECRET, firstDiffers)).toBe(false);
    expect(secretsMatch("abc", "ABC")).toBe(false);
  });

  // SPECSFY: FR-001 NFR-004 AC-029
  it("returns false without throwing for secrets of different sizes, including empty and prefixes", () => {
    const pairs: Array<[string, string]> = [
      [SECRET, `${SECRET}x`],
      [`${SECRET}x`, SECRET],
      [SECRET, ""],
      ["", SECRET],
      [SECRET, SECRET.slice(0, 8)],
    ];
    for (const [a, b] of pairs) {
      expect(() => secretsMatch(a, b)).not.toThrow();
      expect(secretsMatch(a, b)).toBe(false);
    }
  });
});
