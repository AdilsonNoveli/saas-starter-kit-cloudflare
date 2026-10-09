import { defaultFormatsFor, preferencesSchema, type Preferences } from "../../shared/utils/preferences";

// The server-side gate of every write to `UserPreference` (SPEC-0010, FR-002).
// The schema itself lives in shared/utils/preferences.ts, the same one the
// forms use; this file turns its first failure into a stable error code and
// defaults `dateFormat` and `nameOrder` from the locale.
type Locale = Preferences["locale"];

type PreferencesError =
  | "invalid_time_zone"
  | "invalid_locale"
  | "invalid_theme"
  | "invalid_date_format"
  | "invalid_name_order";

// Field order is the order the errors are reported in: the first bad field wins.
const ERROR_BY_FIELD: Record<keyof Preferences, PreferencesError> = {
  locale: "invalid_locale",
  timeZone: "invalid_time_zone",
  theme: "invalid_theme",
  dateFormat: "invalid_date_format",
  nameOrder: "invalid_name_order",
};

export function parsePreferences(
  input: unknown,
): { ok: true; value: Preferences } | { ok: false; error: PreferencesError } {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    // A non-object input has no field path; the first required field reports it.
    const error =
      typeof field === "string" && field in ERROR_BY_FIELD
        ? ERROR_BY_FIELD[field as keyof Preferences]
        : ERROR_BY_FIELD.locale;
    return { ok: false, error };
  }
  const { locale, timeZone, theme, dateFormat, nameOrder } = parsed.data;
  const defaults = defaultFormatsFor(locale);
  return {
    ok: true,
    value: {
      locale,
      timeZone,
      theme,
      dateFormat: dateFormat ?? defaults.dateFormat,
      nameOrder: nameOrder ?? defaults.nameOrder,
    },
  };
}
