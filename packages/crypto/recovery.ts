import { toHex } from "./encoding";
import { hmacSha256 } from "./hmac";

/**
 * Single-use recovery codes for a lost authenticator, the part that needs no
 * database. "user" backs User.mfaSecret and "platform" backs
 * PlatformAdmin.mfaSecret: independent factors, so each keeps its own set.
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
  return new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`, "u").test(folded) ? folded : null;
}

export async function hashRecoveryCode(
  key: string,
  scope: MfaRecoveryScope,
  userId: string,
  normalizedCode: string,
) {
  if (!key) throw new Error("MFA encryption key is not configured");
  return toHex(
    await hmacSha256(key, `nuxfire:mfa-recovery:${scope}:${userId}:${normalizedCode}`),
  );
}
