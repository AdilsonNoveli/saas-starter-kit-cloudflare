import { z } from "zod/v4";
import { replaceRecoveryCodes } from "@nuxfire/layer-account/server/utils/mfa-recovery";
import { rateLimit } from "~~/server/utils/rate-limit";
import { recordAuditLog } from "~~/server/utils/audit-log";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Issues a new set of platform-admin recovery codes, invalidating every earlier
 * one. Requires an elevated session *and* a fresh authenticator code: the
 * session alone lasts 30 minutes, which is too long a window to hand out the
 * codes that can later stand in for the authenticator.
 *
 * A Nitro route rather than a tRPC procedure, like its siblings, so it can
 * re-check the authenticator itself.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { allowed } = await rateLimit(
    `platform-mfa-recovery-regenerate:${user.id}`,
    { limit: 10, windowSeconds: 300 },
  );
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

  const session = await getPlatformMfaSession(event);
  if (session?.platformAdminId !== admin.id) {
    throw createError({ statusCode: 403, statusMessage: "MFA_REQUIRED" });
  }

  if (
    !(await isValidPlatformTotp(
      event,
      admin.mfaSecret,
      user.email ?? user.id,
      code,
    ))
  ) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { platformAdminEncryptionKey } = useRuntimeConfig(event);
  const recoveryCodes = await replaceRecoveryCodes(
    platformAdminEncryptionKey,
    "platform",
    user.id,
  );
  await recordAuditLog({
    actorUserId: user.id,
    action: "platformAdmin.mfa.recovery-codes.regenerate",
    targetType: "platformAdmin",
    targetId: admin.id,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
  });

  return { recoveryCodes };
});
