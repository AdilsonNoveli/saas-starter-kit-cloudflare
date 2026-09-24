/**
 * Read-only view of where the caller stands with platform-admin MFA, so the
 * console can pick between "enrol", "re-authenticate" and "you're in" without
 * inferring it from the error code of a mutation it did not intend to make.
 *
 * Deliberately not behind `platformAdminProcedure`: that gate requires the very
 * elevated session this endpoint reports on, so putting it there would make the
 * answer unobtainable in exactly the state the caller most needs it. It records
 * no audit line for the same reason — reading your own state is not an
 * administrative action.
 *
 * A caller who is not a platform admin gets a 200 with everything false rather
 * than a 403. There is nothing here to protect: the response describes only the
 * caller's own account, and the value it carries is already public to them (the
 * session payload exposes the same `isPlatformAdmin` flag). A 403 would also be
 * the wrong shape for a state query — it says "this door is closed" about a
 * route that is not a door.
 */
export default defineEventHandler(async (event) => {
  const user = await getUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const admin = await findActivePlatformAdmin(user.id);
  if (!admin) {
    return {
      isPlatformAdmin: false,
      mfaEnrolled: false,
      sessionElevated: false,
    };
  }

  // Matched against this admin's own id, not merely "a session exists": a
  // sealed cookie minted for a different platform-admin row must not read as
  // elevation for this one.
  const session = await getPlatformMfaSession(event);

  return {
    isPlatformAdmin: true,
    mfaEnrolled: admin.mfaEnabledAt !== null,
    sessionElevated: session?.platformAdminId === admin.id,
    recoveryCodesRemaining: admin.mfaEnabledAt
      ? await countRecoveryCodes("platform", user.id)
      : 0,
  };
});
