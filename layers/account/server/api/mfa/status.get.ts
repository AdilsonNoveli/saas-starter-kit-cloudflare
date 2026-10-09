import { countRecoveryCodes } from "../../utils/mfa-recovery";

/**
 * Read-only view of the caller's own two-factor state — enrolled or not,
 * and whether *this login* has already passed a challenge — so the client
 * can pick between "nothing to do", "show the mandatory challenge modal" and
 * "show enrolled in Security settings" without inferring it from a FORBIDDEN
 * thrown by an unrelated procedure. Mirrors admin/mfa/status.get.ts exactly.
 *
 * Deliberately outside protectedProcedure/tRPC: once MFA is enabled,
 * protectedProcedure itself requires an already-verified session, which
 * would make this endpoint unreachable in exactly the state a caller most
 * needs it. No audit line, for the same reason the admin equivalent has
 * none — reading your own state is not a mutation, and this table isn't the
 * platform-admin audit trail's concern.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  if (!user.mfaEnabled) {
    return { mfaEnabled: false, sessionVerified: false };
  }

  // Matched against this user's own id, not merely "a session exists": a
  // sealed cookie minted for a different account must not read as
  // verification for this one.
  const session = await getUserMfaSession(event);
  return {
    mfaEnabled: true,
    sessionVerified: session?.userId === user.id,
    recoveryCodesRemaining: await countRecoveryCodes("user", user.id),
  };
});
