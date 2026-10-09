import { decryptSecret } from "@nuxfire/crypto";
import { platformAdmins } from "@nuxfire/functions/schema";
// `and` is imported explicitly rather than relying on auto-import: VueUse
// also exports an `and` (the `logicAnd` alias) and wins the resolution,
// which silently yields a ComputedRef instead of a SQL expression.
import { and, eq, isNull } from "drizzle-orm";
import type { H3Event } from "h3";
import { Secret, TOTP } from "otpauth/slim";

export type PlatformAdminRecord = typeof platformAdmins.$inferSelect;

/**
 * Single lookup for "is this user a platform admin right now", shared by the
 * tRPC middleware and the MFA endpoints so the definition of "active" (a row
 * exists and has not been revoked) lives in one place.
 *
 * Returns the full row, `mfaSecret` included, because the MFA endpoints need
 * it. That makes this a server-only value: never hand the result to a client
 * or spread it into a response payload.
 */
export async function findActivePlatformAdmin(
  userId: string,
): Promise<PlatformAdminRecord | null> {
  const [record] = await useDB()
    .select()
    .from(platformAdmins)
    .where(
      and(eq(platformAdmins.userId, userId), isNull(platformAdmins.revokedAt)),
    )
    .limit(1);
  return record ?? null;
}

/**
 * The same "active" definition as above, reduced to a boolean, for the session
 * payload that /api/auth/session hands to the browser.
 *
 * A separate function rather than `!!(await findActivePlatformAdmin(id))` on
 * purpose: that one selects the whole row, `mfaSecret` included, and the one
 * mistake that must never happen on this path is that row being spread into
 * the object serialised to the client. Selecting a single column means the
 * secret is never even in memory here.
 *
 * A failure degrades to `false` instead of throwing, for the reason spelled
 * out at length in getUserPermissions(): an unhandled error escaping
 * /api/auth/session reads as "logged out" to the global auth middleware and
 * becomes an endless redirect to /authorize. Losing the admin flag costs a
 * platform admin one nav item; the security check that matters runs
 * server-side in platformAdminProcedure regardless.
 */
export async function isActivePlatformAdmin(userId: string): Promise<boolean> {
  try {
    const [record] = await useDB()
      .select({ id: platformAdmins.id })
      .from(platformAdmins)
      .where(
        and(
          eq(platformAdmins.userId, userId),
          isNull(platformAdmins.revokedAt),
        ),
      )
      .limit(1);
    return !!record;
  } catch (error) {
    console.error("isActivePlatformAdmin failed", { userId, error });
    return false;
  }
}

/**
 * The issuer the authenticator app shows for a platform admin: the configured product name
 * (`runtimeConfig.brandName`, set from BRAND_NAME in infra/app.ts). Never a literal.
 */
export function platformAdminIssuer(event: H3Event): string {
  return useRuntimeConfig(event).brandName;
}

/**
 * Whether `code` is the current TOTP for this admin's seed. The library
 * default window (±1 step) covers ordinary clock drift; widening it multiplies
 * the codes a single guess can match.
 */
export async function isValidPlatformTotp(
  event: H3Event,
  encryptedSecret: string,
  label: string,
  code: string,
) {
  const { platformAdminEncryptionKey } = useRuntimeConfig(event);
  const totp = new TOTP({
    issuer: platformAdminIssuer(event),
    label,
    secret: Secret.fromBase32(
      await decryptSecret(encryptedSecret, platformAdminEncryptionKey),
    ),
  });
  return totp.validate({ token: code }) !== null;
}
