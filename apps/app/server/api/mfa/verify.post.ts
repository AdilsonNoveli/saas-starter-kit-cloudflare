import { z } from "zod";
import { users } from "@nuxfire/functions/schema";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Completes self-service enrolment: validates the first code against the
 * pending seed, marks the account as enrolled, and issues the verified
 * session that protectedProcedure now requires from this login onward. Also
 * issues the account's recovery codes, returned once in this response.
 * Mirrors admin/mfa/verify.post.ts.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // Keyed by the account under attack, not by IP — same reasoning as the
  // platform-admin equivalent: a six-digit code is a ~1M-wide keyspace an
  // attacker rotating source addresses would otherwise walk through in
  // minutes.
  const { allowed } = await rateLimit(`user-mfa-verify:${user.id}`, {
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
  if (!record?.mfaSecret || record.mfaEnabledAt) {
    throw createError({
      statusCode: 400,
      statusMessage: "No pending MFA setup",
    });
  }

  if (
    !(await isValidUserTotp(
      event,
      record.mfaSecret,
      user.email ?? user.id,
      code,
    ))
  ) {
    // Deliberately says nothing about why.
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // Codes first, enrolment second: if the second write fails the account is
  // merely not enrolled yet (a retry replaces the codes), never enrolled with
  // no recovery codes. Redemption requires `mfaEnabledAt`, so codes issued
  // ahead of it cannot be used.
  const { userMfaEncryptionKey } = useRuntimeConfig(event);
  const recoveryCodes = await replaceRecoveryCodes(
    userMfaEncryptionKey,
    "user",
    user.id,
  );

  await useDB()
    .update(users)
    .set({ mfaEnabledAt: new Date() })
    .where(eq(users.id, user.id));

  await startUserMfaSession(event, user.id);

  await recordAuditLog({
    actorUserId: user.id,
    action: "user.mfa.enable",
    targetType: "user",
    targetId: user.id,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
  });

  return { verified: true, recoveryCodes };
});
