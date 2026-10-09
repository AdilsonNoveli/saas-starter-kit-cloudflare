import { and, count, eq, isNull } from "drizzle-orm";
import { mfaRecoveryCodes } from "@nuxfire/functions/schema";

/**
 * Single-use recovery codes for a lost authenticator. "user" backs
 * User.mfaSecret and "platform" backs PlatformAdmin.mfaSecret: independent
 * factors, so each keeps its own set. Auto-imported by the Nitro routes of
 * every layer, like mfa-crypto.ts.
 *
 * Only a keyed hash reaches the database. The key is the factor's own
 * encryption key (USER_MFA_ENCRYPTION_KEY / PLATFORM_ADMIN_ENCRYPTION_KEY), so a
 * leaked table alone cannot be brute-forced offline, and the hash is bound to
 * the user so a code is only ever valid for the account it was issued to.
 */
export type MfaRecoveryScope = "user" | "platform";

export const RECOVERY_CODE_COUNT = 10;

// Crockford base32: no I, L, O or U, so a code read off paper cannot be
// mistyped as another character. 32 symbols divide 256, so masking a random
// byte is unbiased. 12 symbols = 60 bits of entropy.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 12;

const encoder = new TextEncoder();

export function generateRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((byte) => ALPHABET[byte & 31]).join("");
}

/** `ABCD-EFGH-JKMN`, the form shown to the person. */
export function formatRecoveryCode(code: string) {
  return code.match(/.{1,4}/gu)?.join("-") ?? code;
}

/**
 * Canonical form of whatever was typed: case, dashes and spaces are ignored and
 * the letters Crockford treats as look-alikes are folded. Null when the input
 * cannot be a recovery code at all, so the caller skips the database.
 */
export function normalizeRecoveryCode(input: string) {
  const folded = input
    .toUpperCase()
    .replace(/[\s-]/gu, "")
    .replace(/O/gu, "0")
    .replace(/[IL]/gu, "1");
  return new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`, "u").test(folded)
    ? folded
    : null;
}

export async function hashRecoveryCode(
  key: string,
  scope: MfaRecoveryScope,
  userId: string,
  normalizedCode: string,
) {
  if (!key) throw new Error("MFA encryption key is not configured");
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(`nuxfire:mfa-recovery:${scope}:${userId}:${normalizedCode}`),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Replaces the whole set, so an old sheet stops working the moment a new one is
 * issued. Delete and insert share a transaction: a failure never leaves the
 * account with no codes. Returns the plaintext codes, the only time they exist.
 */
export async function replaceRecoveryCodes(
  key: string,
  scope: MfaRecoveryScope,
  userId: string,
) {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  const rows = await Promise.all(
    codes.map(async (code) => ({
      userId,
      scope,
      codeHash: await hashRecoveryCode(key, scope, userId, code),
    })),
  );
  await useDB().transaction(async (tx) => {
    await tx
      .delete(mfaRecoveryCodes)
      .where(
        and(
          eq(mfaRecoveryCodes.userId, userId),
          eq(mfaRecoveryCodes.scope, scope),
        ),
      );
    await tx.insert(mfaRecoveryCodes).values(rows);
  });
  return codes.map(formatRecoveryCode);
}

export async function countRecoveryCodes(
  scope: MfaRecoveryScope,
  userId: string,
) {
  const [row] = await useDB()
    .select({ remaining: count() })
    .from(mfaRecoveryCodes)
    .where(
      and(
        eq(mfaRecoveryCodes.userId, userId),
        eq(mfaRecoveryCodes.scope, scope),
        isNull(mfaRecoveryCodes.usedAt),
      ),
    );
  return row?.remaining ?? 0;
}

/**
 * Redeems a code. The `usedAt IS NULL` guard sits inside the UPDATE itself, so
 * two concurrent requests presenting the same code cannot both succeed.
 */
export async function consumeRecoveryCode(
  key: string,
  scope: MfaRecoveryScope,
  userId: string,
  input: string,
) {
  const normalized = normalizeRecoveryCode(input);
  if (!normalized) return false;
  const codeHash = await hashRecoveryCode(key, scope, userId, normalized);
  const redeemed = await useDB()
    .update(mfaRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(mfaRecoveryCodes.userId, userId),
        eq(mfaRecoveryCodes.scope, scope),
        eq(mfaRecoveryCodes.codeHash, codeHash),
        isNull(mfaRecoveryCodes.usedAt),
      ),
    )
    .returning({ id: mfaRecoveryCodes.id });
  return redeemed.length > 0;
}
