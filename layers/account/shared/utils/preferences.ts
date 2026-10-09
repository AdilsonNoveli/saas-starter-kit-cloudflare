import { z } from "zod/v4";

// The one shape of a person's preferences (SPEC-0010, FR-002), shared by the
// forms and by the server gate (`parsePreferences`, server/utils/preferences.ts).
// Same locale codes as `apps/app/nuxt.config.ts`; `dateFormat` and `nameOrder`
// are optional here because the server defaults them from the locale.

/**
 * Asks the runtime itself, not `Intl.supportedValuesOf("timeZone")`: some
 * engines leave `UTC` out of that list while still accepting it here.
 */
function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const preferencesSchema = z.object({
  locale: z.enum(["en", "pt-br", "es"]),
  timeZone: z.string().refine(isTimeZone),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  dateFormat: z.enum(["DMY", "MDY", "YMD"]).optional(),
  nameOrder: z.enum(["WESTERN", "EASTERN"]).optional(),
});

/** A validated row's fields: every one present, the formats already defaulted. */
export type Preferences = Required<z.output<typeof preferencesSchema>>;

const FORMATS_BY_LOCALE: Record<
  z.output<typeof preferencesSchema>["locale"],
  { dateFormat: Preferences["dateFormat"]; nameOrder: Preferences["nameOrder"] }
> = {
  en: { dateFormat: "MDY", nameOrder: "WESTERN" },
  "pt-br": { dateFormat: "DMY", nameOrder: "WESTERN" },
  es: { dateFormat: "DMY", nameOrder: "WESTERN" },
};

/** The date format and name order a locale starts with (D-F3-8), used by the server gate and the onboarding form. */
export function defaultFormatsFor(locale: z.output<typeof preferencesSchema>["locale"]) {
  return { ...FORMATS_BY_LOCALE[locale] };
}
