import { z } from "zod/v4";
import { platformAdmins } from "@nuxfire/functions/schema";
import { replaceRecoveryCodes } from "@nuxfire/layer-account/server/utils/mfa-recovery";
import { rateLimit } from "~~/server/utils/rate-limit";
import { recordAuditLog } from "~~/server/utils/audit-log";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Completes MFA enrolment: validates the first code against the pending seed,
 * marks the admin as enrolled, and issues the 30-minute elevated session that
 * `platformAdminProcedure` requires. Also issues the admin's recovery codes,
 * returned once in this response.
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

  if (
    !(await isValidPlatformTotp(
      event,
      admin.mfaSecret,
      user.email ?? user.id,
      code,
    ))
  ) {
    // Deliberately says nothing about why.
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // Codes first, enrolment second: if the second write fails the admin is
  // merely not enrolled yet (a retry replaces the codes), never enrolled with
  // no recovery codes. Redemption requires `mfaEnabledAt`, so codes issued
  // ahead of it cannot be used.
  const { platformAdminEncryptionKey } = useRuntimeConfig(event);
  const recoveryCodes = await replaceRecoveryCodes(
    platformAdminEncryptionKey,
    "platform",
    user.id,
  );

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

  return { verified: true, recoveryCodes };
});
