import { hmacSha256, secretsMatch, toHex } from "@nuxfire/crypto";

// The two six-digit codes of an e-mail change (SPEC-0010, DEC-011): one goes to
// the current address, one to the new. Only a keyed hash is stored, bound to
// the person, the new address and the side, so a code sent to one address is
// worthless on the other. The key is the one the user MFA already uses. Single
// use and the attempt count belong to the service, which deletes the request.

export const EMAIL_CHANGE_MAX_ATTEMPTS = 5;
export const EMAIL_CHANGE_TTL_MINUTES = 15;

type CodeSide = "current" | "new";

// The largest multiple of 1,000,000 that fits in 32 bits: values at or above it
// are drawn again, so every code is equally likely.
const CODE_SPACE = 1_000_000;
const UNBIASED_LIMIT = Math.floor(2 ** 32 / CODE_SPACE) * CODE_SPACE;

export function generateEmailChangeCode() {
  let value: number;
  do value = crypto.getRandomValues(new Uint32Array(1))[0] ?? UNBIASED_LIMIT;
  while (value >= UNBIASED_LIMIT);
  return String(value % CODE_SPACE).padStart(6, "0");
}

export async function hashEmailChangeCode(
  key: string,
  p: { userId: string; side: CodeSide; newEmail: string; code: string },
) {
  if (!key) throw new Error("MFA encryption key is not configured");
  return toHex(
    await hmacSha256(key, `nuxfire:email-change:${p.userId}:${p.side}:${p.newEmail}:${p.code}`),
  );
}

export async function verifyEmailChangeCode(
  key: string,
  p: { userId: string; side: CodeSide; newEmail: string; code: string; hash: string },
) {
  return secretsMatch(await hashEmailChangeCode(key, p), p.hash);
}
