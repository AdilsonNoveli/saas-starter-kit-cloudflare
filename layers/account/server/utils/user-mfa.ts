import { decryptSecret } from "@nuxfire/crypto";
import { users } from "@nuxfire/functions/schema";
import { eq } from "drizzle-orm";
import type { H3Event } from "h3";
import { Secret, TOTP } from "otpauth/slim";

export type UserMfaRecord = {
  id: string;
  mfaSecret: string | null;
  mfaEnabledAt: Date | null;
};

/**
 * The issuer an authenticator app shows next to the account: the configured product name
 * (`runtimeConfig.brandName`, set from BRAND_NAME in infra/app.ts). Never a literal.
 */
export function userMfaIssuer(event: H3Event): string {
  return useRuntimeConfig(event).brandName;
}

/**
 * Server-only lookup of a user's own MFA columns, `mfaSecret` included — used
 * only by the /api/mfa/* enrollment endpoints, which need the encrypted seed
 * itself. getUser() (server/utils/auth.ts) selects its own MFA-free column
 * set for anything that ends up in a client-facing session payload; never
 * merge this record into one.
 */
export async function getUserMfaRecord(
  userId: string,
): Promise<UserMfaRecord | null> {
  const [record] = await useDB()
    .select({
      id: users.id,
      mfaSecret: users.mfaSecret,
      mfaEnabledAt: users.mfaEnabledAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return record ?? null;
}

/**
 * Whether `code` is the current TOTP for an enrolled (or pending) seed. The
 * library default window (±1 step) covers ordinary clock drift; widening it
 * multiplies the codes a single guess can match.
 */
export async function isValidUserTotp(
  event: H3Event,
  encryptedSecret: string,
  label: string,
  code: string,
) {
  const { userMfaEncryptionKey } = useRuntimeConfig(event);
  const totp = new TOTP({
    issuer: userMfaIssuer(event),
    label,
    secret: Secret.fromBase32(
      await decryptSecret(encryptedSecret, userMfaEncryptionKey),
    ),
  });
  return totp.validate({ token: code }) !== null;
}
