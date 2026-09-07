import { z } from "zod";
import { Secret, TOTP } from "otpauth/slim";
import { platformAdmins } from "@nuxfire/functions/schema";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Completes MFA enrolment: validates the first code against the pending seed,
 * marks the admin as enrolled, and issues the 30-minute elevated session that
 * `platformAdminProcedure` requires.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // Keyed by the account under attack, not by IP: a six-digit code is a
  // ~1M-wide keyspace that an attacker rotating source addresses would
  // otherwise walk through in minutes.
  const { allowed } = await rateLimit(`platform-mfa-verify:${user.id}`, {
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
  if (admin.mfaEnabledAt || !admin.mfaSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: "No pending MFA setup",
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

  // Library default window (±1 step) — wide enough for ordinary clock drift,
  // and every step it is widened by multiplies the codes an attacker's single
  // guess can match.
  if (totp.validate({ token: code }) === null) {
    // Deliberately says nothing about why.
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  await useDB()
    .update(platformAdmins)
    .set({ mfaEnabledAt: new Date() })
    .where(eq(platformAdmins.id, admin.id));

  await startPlatformMfaSession(event, admin.id);

  await recordAuditLog({
    actorUserId: user.id,
    action: "platformAdmin.mfa.enable",
    targetType: "platformAdmin",
    targetId: admin.id,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
  });

  return { verified: true };
});
