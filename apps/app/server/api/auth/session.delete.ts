export default defineEventHandler(async (event) => {
  deleteCookie(event, "nuxfire-access-token");
  deleteCookie(event, "nuxfire-refresh-token");
  // So a later login on this same browser — by the same user or, on a
  // shared machine, a different one — never inherits a stale verified
  // state. Harmless either way (getUserMfaSession matches on userId), but
  // there is no reason for it to outlive the session it was issued for.
  deleteCookie(event, "nuxfire-mfa-verified");
});
