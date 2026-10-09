import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RECOVERY_CODE_COUNT,
  createWsTicket,
  formatRecoveryCode,
  fromBase64Url,
  fromHex,
  generateRecoveryCode,
  hashRecoveryCode,
  hmacSha256,
  normalizeRecoveryCode,
  toBase64Url,
  toHex,
  verifyHmacSha256,
} from "@nuxfire/crypto";
import vectors from "./golden-vectors.json";

const encoder = new TextEncoder();

afterEach(() => {
  vi.useRealTimers();
});

describe("HMAC-SHA256 matches the vectors of the old code byte for byte", () => {
  // SPECSFY: US-001 FR-001 NFR-001 AC-002
  it("reproduces the MFA recovery hashes as lowercase hex", async () => {
    for (const vector of vectors.recoveryHashes) {
      const scope = vector.scope === "platform" ? "platform" : "user";
      expect(await hashRecoveryCode(vector.key, scope, vector.userId, vector.normalizedCode)).toBe(
        vector.hex,
      );
      expect(toHex(await hmacSha256(vector.key, vector.message))).toBe(vector.hex);
    }
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-002
  it("reproduces the Paddle team and pending-purchase signatures as hex and verifies them", async () => {
    for (const vector of [...vectors.paddleTeam, ...vectors.paddlePendingPurchase]) {
      const signature = await hmacSha256(vector.secret, vector.message);
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(toHex(signature)).toBe(vector.hex);
      const bytes = fromHex(vector.hex);
      expect(bytes).not.toBeNull();
      expect(await verifyHmacSha256(vector.secret, vector.message, bytes ?? new Uint8Array())).toBe(
        true,
      );
    }
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-002
  it("reproduces the WebSocket ticket, payload key order included, in base64url", async () => {
    for (const vector of vectors.wsTickets) {
      expect(toBase64Url(encoder.encode(vector.payloadJson))).toBe(vector.payloadB64);
      expect(new TextDecoder().decode(fromBase64Url(vector.payloadB64))).toBe(vector.payloadJson);
      expect(toBase64Url(await hmacSha256(vector.secret, vector.payloadB64))).toBe(
        vector.signatureB64Url,
      );

      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(vector.nowMs);
      const ticket = await createWsTicket(vector.secret, vector.user);
      vi.useRealTimers();

      expect(ticket).toBe(vector.ticket);
      expect(Object.keys(JSON.parse(vector.payloadJson))).toEqual([
        "id",
        "email",
        "name",
        "image",
        "exp",
      ]);
    }
  });
});

describe("encodings keep the old edge behavior", () => {
  // SPECSFY: US-001 FR-001 NFR-001 AC-002
  it("rejects what the old fromHex rejected and round-trips what it accepted", () => {
    const bytes = Uint8Array.from([0, 1, 15, 16, 127, 128, 254, 255]);
    expect(toHex(bytes)).toBe("00010f107f80feff");
    expect(toHex(bytes.buffer)).toBe("00010f107f80feff");
    expect(fromHex("00010f107f80feff")).toEqual(bytes);
    expect(fromHex("")).toBeNull();
    expect(fromHex("abc")).toBeNull();
    expect(fromHex("not-hex")).toBeNull();
    expect(fromHex("AA")).toBeNull();
  });

  // SPECSFY: US-001 FR-001 NFR-001 AC-002
  it("writes base64url without padding and reads it back for every remainder length", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 32]) {
      const bytes = Uint8Array.from({ length }, (_, index) => (index * 67 + 251) % 256);
      const encoded = toBase64Url(bytes);
      expect(encoded).not.toMatch(/[+/=]/u);
      expect(fromBase64Url(encoded)).toEqual(bytes);
    }
    expect(toBase64Url(Uint8Array.from([251, 255, 191]))).toBe("-_-_");
  });
});

describe("recovery codes (pure part) keep the old format", () => {
  // SPECSFY: US-001 FR-001 NFR-001 AC-002
  it("formats and normalizes exactly like the old mfa-recovery", () => {
    expect(RECOVERY_CODE_COUNT).toBe(10);
    for (const vector of vectors.recoveryCodeFormat) {
      expect(formatRecoveryCode(vector.code)).toBe(vector.formatted);
    }
    for (const vector of vectors.recoveryCodeNormalize) {
      expect(normalizeRecoveryCode(vector.input)).toBe(vector.normalized);
    }
    const generated = generateRecoveryCode();
    expect(generated).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/u);
    expect(normalizeRecoveryCode(formatRecoveryCode(generated))).toBe(generated);
  });
});
