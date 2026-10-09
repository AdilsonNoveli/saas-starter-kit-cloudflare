// SPEC-0010 (DEC-006): the server is the source of the locale and the theme.
// The login callback copies them from the person's `UserPreference` row into
// the cookies the i18n module (`i18n_redirected`, its default key) and the
// color mode module (`nuxt-color-mode`, its default key with
// `colorMode.storage: "cookie"`) read on the server, so a new browser paints
// the first page in the right language and theme.

export function preferenceCookies(prefs: { locale: string; theme: string }) {
  return {
    i18n_redirected: prefs.locale,
    "nuxt-color-mode": prefs.theme,
  };
}
