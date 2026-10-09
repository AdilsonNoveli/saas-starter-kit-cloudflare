// Stable error codes of the procedures SPEC-0010 touches (DEC-015). The server
// sends the code in `TRPCError.message` and never knows the language; the
// client turns it into `errors.<code>` of this layer's locale files.
export const ERROR_CODES = [
  "slug_taken",
  "slug_reserved",
  "slug_invalid",
  "email_taken",
  "email_unchanged",
  "email_managed_by_provider",
  "invalid_code",
  "code_expired",
  "too_many_requests",
  "invalid_time_zone",
  "invalid_locale",
  "invalid_theme",
  "invalid_date_format",
  "invalid_name_order",
  "invite_unavailable",
  "cannot_revoke_current_session",
] as const;

// A Set, not an object lookup: "constructor" or "__proto__" must not pass.
const KNOWN_CODES: ReadonlySet<string> = new Set(ERROR_CODES);

/**
 * Anything that is not a known code, including the server's raw English text,
 * becomes `errors.generic`, never shown as it came.
 */
export function translateErrorCode(code: string, t: (key: string) => string) {
  const key = KNOWN_CODES.has(code) ? `errors.${code}` : "errors.generic";
  const message = t(key);
  // vue-i18n answers a missing key with the key itself.
  return message === key && key !== "errors.generic" ? t("errors.generic") : message;
}
