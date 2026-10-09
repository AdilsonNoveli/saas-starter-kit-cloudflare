// Single source of truth for the locales of apps/web. Imported by nuxt.config.ts (the
// @nuxtjs/i18n options), content.config.ts (the allowed values of a post's `lang`) and
// app/utils/seo/content-seo.ts (BCP-47 tags, og:locale, hreflang), so a locale can never
// be renamed in one place and forgotten in another.
//
// `code` drives the URL prefix (prefix_except_default -> /pt-br/...) and is lowercase on
// purpose: Nuxt Link Checker's no-uppercase-chars rule flags any uppercase in a URL path.
// `language` is the properly-cased BCP-47 tag used for hreflang and og:locale, a separate
// field from `code`.
export const CONTENT_LOCALES = [
  { code: "en", language: "en-US", name: "English (US)", file: "en.json" },
  { code: "pt-br", language: "pt-BR", name: "Português (Brasil)", file: "pt-BR.json" },
  { code: "es", language: "es-ES", name: "Español", file: "es.json" },
] as const;

export type ContentLang = (typeof CONTENT_LOCALES)[number]["code"];

type Codes<T extends readonly { code: string }[]> = { [K in keyof T]: T[K]["code"] };

/**
 * The language codes as a tuple (what `z.enum` needs), in the order used everywhere a
 * cluster of translations is listed. Derived from CONTENT_LOCALES, never written twice.
 */
// `map` widens the tuple to an array; the cast restores the length TypeScript cannot infer.
export const CONTENT_LANGS = CONTENT_LOCALES.map((locale) => locale.code) as unknown as Codes<
  typeof CONTENT_LOCALES
>;
