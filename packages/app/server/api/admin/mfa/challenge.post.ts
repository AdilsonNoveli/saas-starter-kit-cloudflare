import { z } from "zod";
import { Secret, TOTP } from "otpauth/slim";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Re-authenticates an *already enrolled* platform admin, issuing a fresh
 * 30-minute elevated session.
 *
 * The counterpart to verify.post.ts, and deliberately a separate route rather
 * than a branch inside it: that one completes enrolment and refuses anyone
 * whose `mfaEnabledAt` is already set, which left an enrolled admin with no way
 * back in once the elevated session expired — permanently locked out of
 * everything behind `platformAdminProcedure`, since re-running
 * grant-platform-admin.ts does not reset MFA either. The precondition here is
 * the exact inverse of verify's, so neither route can ever stand in for the
 * other: this one cannot enrol, that one cannot re-elevate.
 *
 * Like setup/verify, a Nitro route rather than a tRPC procedure — it exists to
 * open the gate `platformAdminProcedure` enforces, so it cannot sit behind it.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // Same bucket shape and budget as verify: keyed by the account under attack,
  // not by IP, because a six-digit code is a ~1M-wide keyspace an attacker
  // rotating source addresses would otherwise walk through in minutes.
  const { allowed } = await rateLimit(`platform-mfa-challenge:${user.id}`, {
    limit: 10,
    windowSeconds: 300,
  });
  if (!allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
    });
  }

  const { code } = await readValidatedBody(event, bodySchema.parse);

  const admin = await findActivePlatformAdmin(user.id);
  if (!admin) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  if (!admin.mfaEnabledAt || !admin.mfaSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: "MFA is not enrolled yet",
    });
  }

  const { platformAdminEncryptionKey } = useRuntimeConfig(event);
  const totp = new TOTP({
    issuer: "NuxFire",
    label: user.email ?? user.id,
    secret: Secret.fromBase32(
      await decryptSecret(admin.mfaSecret, platformAdminEncryptionKey),
    ),
  });

  if (totp.validate({ token: code }) === null) {
    // Deliberately says nothing about why.
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // `mfaEnabledAt` is untouched: the enrolment already happened, this only
  // renews the elevated session on top of it.
  await startPlatformMfaSession(event, admin.id);

  await recordAuditLog({
    actorUserId: user.id,
    action: "platformAdmin.mfa.challenge",
    targetType: "platformAdmin",
    targetId: admin.id,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
  });

  return { verified: true };
});
