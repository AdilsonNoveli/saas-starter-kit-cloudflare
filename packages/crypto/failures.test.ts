import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  fromBase64,
  hashRecoveryCode,
  hmacSha256,
  toBase64,
  verifyHmacSha256,
} from "@nuxfire/crypto";
import vectors from "./golden-vectors.json";

// The message mfa-crypto.ts and mfa-recovery.ts threw at the commit in golden-vectors.json.
const MISSING_KEY = "MFA encryption key is not configured";
const [golden] = vectors.aesGcm;
if (!golden) throw new Error("golden-vectors.json has no AES-GCM vector");

function flipFirstByte(part: string) {
  const bytes = fromBase64(part);
  bytes[0] = (bytes[0] ?? 0) ^ 1;
  return toBase64(bytes);
}

describe("crypto primitives fail like the original code", () => {
  // SPECSFY: US-001 FR-001 NFR-001 NFR-004 AC-003
  it("rejects an empty encryption key with the original message", async () => {
    await expect(encryptSecret("seed", "")).rejects.toThrow(MISSING_KEY);
    await expect(decryptSecret(golden.ciphertext, "")).rejects.toThrow(MISSING_KEY);
    await expect(hashRecoveryCode("", "user", "u1", "ABCDEFGHJKMN")).rejects.toThrow(MISSING_KEY);
  });

  // SPECSFY: US-001 FR-001 NFR-001 NFR-004 AC-003
  it("rejects a ciphertext without both parts as malformed before touching the key", async () => {
    for (const malformed of ["", "no-separator", "onlyiv.", ".onlydata"]) {
      await expect(decryptSecret(malformed, golden.key)).rejects.toThrow(
        "malformed encrypted secret",
      );
    }
    await expect(decryptSecret("no-separator", "")).rejects.toThrow("malformed encrypted secret");
  });

  // SPECSFY: US-001 FR-001 NFR-001 NFR-004 AC-003
  it("rejects a tampered ciphertext, a tampered IV and a wrong key without returning text", async () => {
    const [ivPart = "", dataPart = ""] = golden.ciphertext.split(".");
    const attempts: Array<[string, string]> = [
      [`${ivPart}.${flipFirstByte(dataPart)}`, golden.key],
      [`${flipFirstByte(ivPart)}.${dataPart}`, golden.key],
      [golden.ciphertext, `${golden.key}-wrong`],
    ];
    for (const [ciphertext, key] of attempts) {
      await expect(decryptSecret(ciphertext, key)).rejects.toMatchObject({
        name: "OperationError",
      });
    }
  });

  // SPECSFY: US-001 FR-001 NFR-001 NFR-004 AC-003
  it("rejects an empty HMAC secret and never verifies with it", async () => {
    await expect(hmacSha256("", "nuxfire:any-message")).rejects.toThrow();
    const signature = await hmacSha256("a-FAKE-secret", "nuxfire:any-message");
    const verified = await verifyHmacSha256("", "nuxfire:any-message", signature).catch(
      () => false,
    );
    expect(verified).toBe(false);
  });
});
