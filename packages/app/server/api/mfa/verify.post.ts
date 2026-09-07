import { z } from "zod";
import { Secret, TOTP } from "otpauth/slim";
import { users } from "@nuxfire/functions/schema";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Completes self-service enrolment: validates the first code against the
 * pending seed, marks the account as enrolled, and issues the verified
 * session that protectedProcedure now requires from this login onward.
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

  const { userMfaEncryptionKey } = useRuntimeConfig(event);
  const totp = new TOTP({
    issuer: "NuxFire",
    label: user.email ?? user.id,
    secret: Secret.fromBase32(
      await decryptSecret(record.mfaSecret, userMfaEncryptionKey),
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
    .update(users)
    .set({ mfaEnabledAt: new Date() })
    .where(eq(users.id, user.id));

  await startUserMfaSession(event, user.id);

  return { verified: true };
});
