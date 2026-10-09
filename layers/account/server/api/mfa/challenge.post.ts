import { z } from "zod/v4";
import { rateLimit } from "~~/server/utils/rate-limit";
import { recordAuditLog } from "~~/server/utils/audit-log";
import { consumeRecoveryCode, countRecoveryCodes } from "../../utils/mfa-recovery";

// Either the current authenticator code or one recovery code. A single route,
// so both share one rate-limit bucket: offering a second way in must not double
// the guesses an attacker gets per account.
const bodySchema = z.union([
  z.object({ code: z.string().regex(/^\d{6}$/) }),
  z.object({ recoveryCode: z.string().min(1).max(32) }),
]);

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

  const body = await readValidatedBody(event, bodySchema.parse);

  const record = await getUserMfaRecord(user.id);
  if (!record?.mfaEnabledAt || !record.mfaSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: "MFA is not enrolled yet",
    });
  }

  if ("recoveryCode" in body) {
    const { userMfaEncryptionKey } = useRuntimeConfig(event);
    const redeemed = await consumeRecoveryCode(
      userMfaEncryptionKey,
      "user",
      user.id,
      body.recoveryCode,
    );
    if (!redeemed) {
      console.warn("mfa recovery code rejected", { userId: user.id });
      // Deliberately says nothing about why.
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    await startUserMfaSession(event, user.id);
    const remaining = await countRecoveryCodes("user", user.id);
    await recordAuditLog({
      actorUserId: user.id,
      action: "user.mfa.recovery-code.used",
      targetType: "user",
      targetId: user.id,
      metadata: { remaining },
      ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
    });

    return {
      verified: true,
      recoveryCodeUsed: true,
      recoveryCodesRemaining: remaining,
    };
  }

  if (
    !(await isValidUserTotp(
      event,
      record.mfaSecret,
      user.email ?? user.id,
      body.code,
    ))
  ) {
    // Deliberately says nothing about why.
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // `mfaEnabledAt` is untouched: enrolment already happened, this only
  // renews the verified session on top of it.
  await startUserMfaSession(event, user.id);

  return { verified: true };
});
