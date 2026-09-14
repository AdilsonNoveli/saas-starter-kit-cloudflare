import { z } from "zod";
import { Secret, TOTP } from "otpauth/slim";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Verifies an *already enrolled* account for the current login, issuing a
 * fresh long-lived verified session. This is the route the mandatory modal
 * in layouts/dashboard.vue posts to — reached whenever
 * ctx.session.mfaEnabled is true but this browser has no (or an expired)
 * nuxfire-mfa-verified cookie, e.g. a new device, a cleared cookie jar, or
 * the very first login after enrolling elsewhere.
 *
 * The counterpart to verify.post.ts, and deliberately a separate route
 * rather than a branch inside it, same reasoning as the platform-admin pair:
 * their preconditions are exact inverses (this refuses an account with no
 * completed enrolment; verify refuses one that already has one), so neither
 * can stand in for the other.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const { allowed } = await rateLimit(`user-mfa-challenge:${user.id}`, {
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

  const { userMfaEncryptionKey } = useRuntimeConfig(event);
  const totp = new TOTP({
    issuer: "NuxFire",
    label: user.email ?? user.id,
    secret: Secret.fromBase32(
      await decryptSecret(record.mfaSecret, userMfaEncryptionKey),
    ),
  });

  if (totp.validate({ token: code }) === null) {
    // Deliberately says nothing about why.
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // `mfaEnabledAt` is untouched: enrolment already happened, this only
  // renews the verified session on top of it.
  await startUserMfaSession(event, user.id);

  return { verified: true };
});
