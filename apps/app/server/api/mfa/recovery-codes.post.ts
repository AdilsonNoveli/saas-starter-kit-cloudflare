import { z } from "zod";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Issues a new set of recovery codes, invalidating every earlier one. A
 * Nitro route beside the other /api/mfa/* endpoints rather than a tRPC
 * procedure, so it can re-check the authenticator itself: a verified-session
 * cookie that lives for weeks is not enough proof to mint the codes that can
 * later bypass the authenticator.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { allowed } = await rateLimit(`user-mfa-recovery-regenerate:${user.id}`, {
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

  const record = await getUserMfaRecord(user.id);
  if (!record?.mfaEnabledAt || !record.mfaSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: "MFA is not enrolled yet",
    });
  }

  const session = await getUserMfaSession(event);
  if (session?.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: "MFA_REQUIRED" });
  }

  if (
    !(await isValidUserTotp(
      event,
      record.mfaSecret,
      user.email ?? user.id,
      code,
    ))
  ) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { userMfaEncryptionKey } = useRuntimeConfig(event);
  const recoveryCodes = await replaceRecoveryCodes(
    userMfaEncryptionKey,
    "user",
    user.id,
  );
  await recordAuditLog({
    actorUserId: user.id,
    action: "user.mfa.recovery-codes.regenerate",
    targetType: "user",
    targetId: user.id,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
  });

  return { recoveryCodes };
});
