import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, fromBase64 } from "@nuxfire/crypto";
import vectors from "./golden-vectors.json";

const KEY = "aes-test-FAKE-key-not-a-secret";
const FORMAT = /^[A-Za-z0-9+/]+={0,2}\.[A-Za-z0-9+/]+={0,2}$/u;

// The decryption half of apps/app/server/utils/mfa-crypto.ts at the commit in
// golden-vectors.json, kept as the fixed reference the package output must keep
// satisfying: SHA-256 of the key string, AES-GCM, `base64(iv).base64(ciphertext)`.
async function openWithReferenceDecryptor(ciphertext: string, key: string) {
  const [ivPart, dataPart] = ciphertext.split(".");
  if (!ivPart || !dataPart) throw new Error("malformed encrypted secret");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const aesKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
  const bytes = (part: string) => Uint8Array.from(atob(part), (char) => char.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes(ivPart) },
    aesKey,
    bytes(dataPart),
  );
  return new TextDecoder().decode(plaintext);
}

describe("encryptSecret / decryptSecret", () => {
  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("opens every ciphertext produced by the old mfa-crypto", async () => {
    expect(vectors.aesGcm.length).toBeGreaterThan(0);
    for (const vector of vectors.aesGcm) {
      expect(await decryptSecret(vector.ciphertext, vector.key)).toBe(vector.plaintext);
    }
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("produces base64(iv).base64(text) that the reference decryptor of the old code opens", async () => {
    for (const plaintext of ["JBSWY3DPEHPK3PXP", "FAKE TOTP SEED áç 🔐"]) {
      const ciphertext = await encryptSecret(plaintext, KEY);
      expect(ciphertext).toMatch(FORMAT);
      const [ivPart, dataPart] = ciphertext.split(".");
      expect(fromBase64(ivPart ?? "")).toHaveLength(12);
      expect(fromBase64(dataPart ?? "")).toHaveLength(new TextEncoder().encode(plaintext).length + 16);
      expect(await openWithReferenceDecryptor(ciphertext, KEY)).toBe(plaintext);
      expect(await decryptSecret(ciphertext, KEY)).toBe(plaintext);
    }
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-001
  it("draws a fresh IV per call and round-trips the empty plaintext", async () => {
    const first = await encryptSecret("same seed", KEY);
    const second = await encryptSecret("same seed", KEY);
    expect(first).not.toBe(second);
    expect(first.split(".")[0]).not.toBe(second.split(".")[0]);

    const empty = await encryptSecret("", KEY);
    expect(empty).toMatch(FORMAT);
    expect(await decryptSecret(empty, KEY)).toBe("");
    expect(await openWithReferenceDecryptor(empty, KEY)).toBe("");
  });
});
