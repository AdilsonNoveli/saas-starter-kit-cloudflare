import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMAIL_CHANGE_MAX_ATTEMPTS,
  EMAIL_CHANGE_TTL_MINUTES,
  generateEmailChangeCode,
  hashEmailChangeCode,
  verifyEmailChangeCode,
} from "./email-change-code";

// SPEC-0010 (Fase 3b), AC-029: the two six-digit codes of an e-mail change are
// stored only as HMAC-SHA256 bound to the user, the new address and the side,
// and checked in constant time through @nuxfire/crypto (one source per
// primitive, SPEC-0009). Single use is the service's job: it deletes the
// request on success (layers/account/server/services/email-change.ts).
const KEY = "email-change-test-key-with-enough-length";
const BASE = { userId: "user_1", side: "current" as const, newEmail: "b@x.com", code: "042137" };

describe("e-mail change codes", () => {
  // SPECSFY: US-005 FR-014 NFR-001 AC-029
  it("keeps only a bound HMAC, refuses a code on the other side and compares in constant time", async () => {
    const codes = Array.from({ length: 300 }, generateEmailChangeCode);
    for (const code of codes) expect(code).toMatch(/^\d{6}$/u);
    expect(new Set(codes).size).toBeGreaterThan(250);

    const hash = await hashEmailChangeCode(KEY, BASE);
    expect(hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(hash).not.toContain(BASE.code);
    expect(await hashEmailChangeCode(KEY, BASE)).toBe(hash);
    expect(await hashEmailChangeCode("another-key-with-enough-length!!", BASE)).not.toBe(hash);
    expect(await hashEmailChangeCode(KEY, { ...BASE, userId: "user_2" })).not.toBe(hash);
    expect(await hashEmailChangeCode(KEY, { ...BASE, side: "new" })).not.toBe(hash);
    expect(await hashEmailChangeCode(KEY, { ...BASE, newEmail: "c@x.com" })).not.toBe(hash);
    expect(await hashEmailChangeCode(KEY, { ...BASE, code: "042138" })).not.toBe(hash);

    expect(await verifyEmailChangeCode(KEY, { ...BASE, hash })).toBe(true);
    // The code sent to the current address is worthless on the new side.
    expect(await verifyEmailChangeCode(KEY, { ...BASE, side: "new", hash })).toBe(false);
    expect(await verifyEmailChangeCode(KEY, { ...BASE, code: "000000", hash })).toBe(false);
    expect(await verifyEmailChangeCode(KEY, { ...BASE, newEmail: "c@x.com", hash })).toBe(false);
    expect(await verifyEmailChangeCode(KEY, { ...BASE, userId: "user_2", hash })).toBe(false);

    expect(EMAIL_CHANGE_MAX_ATTEMPTS).toBe(5);
    expect(EMAIL_CHANGE_TTL_MINUTES).toBe(15);

    // One source per primitive: the HMAC and the constant-time comparison come
    // from @nuxfire/crypto, never a local Web Crypto key or a plain `===`.
    const source = readFileSync(join(import.meta.dirname, "email-change-code.ts"), "utf8");
    expect(source).toMatch(/import\s*\{[^}]*\bhmacSha256\b[^}]*\}\s*from\s*["']@nuxfire\/crypto["']/u);
    expect(source).toMatch(/import\s*\{[^}]*\bsecretsMatch\b[^}]*\}\s*from\s*["']@nuxfire\/crypto["']/u);
    expect(source).toMatch(/\bsecretsMatch\(/u);
    expect(source).not.toMatch(/\bimportKey\b/u);
    expect(source).not.toMatch(/crypto\.subtle/u);
  });
});
