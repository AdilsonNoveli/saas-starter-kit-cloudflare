// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  nitro: {
    prerender: {
      autoSubfolderIndex: true,
      routes: ["/login", "/signup", "/forgot-password"],
    },
  },
  // These pages are entirely driven by query-string state (?state=code,
  // ?err=..., etc.) set by apps/functions/src/auth.ts's redirects
  // between steps of the OpenAuth flow — but they're also statically
  // prerendered (nitro.prerender above), so the HTML Cloudflare serves is
  // baked in once at build time with NO query string, always showing the
  // step-1 form. Vue's hydration doesn't correct this: the live route
  // query IS right client-side (verified directly against the mounted
  // Vue app's $route), but the structural v-if difference between the
  // prerendered (query-less) and correct (query-aware) render isn't
  // reconciled — the page silently keeps showing the wrong step forever,
  // even after the code was actually emailed and the URL updated correctly.
  // `ssr: false` makes these three routes mount fresh, client-side only —
  // no prerendered reactive content to mismatch against.
  routeRules: {
    "/login/**": { ssr: false },
    "/signup/**": { ssr: false },
    "/forgot-password/**": { ssr: false },
  },
  css: ["~/css/main.css"],
  modules: ["@nuxt/ui", "@nuxtjs/i18n"],
  // `no_prefix`: these routes already force `ssr: false` (see routeRules
  // above) because of the OpenAuth query-string hydration mismatch —
  // multiplying them by three prefixed variants would widen that fragility
  // for no SEO gain, since this is an unindexed utility flow.
  i18n: {
    restructureDir: "i18n",
    defaultLocale: "en",
    strategy: "no_prefix",
    locales: [
      { name: "English (US)", code: "en", language: "en-US", file: "en.json" },
      {
        name: "Português (Brasil)",
        // Lowercase on purpose — see apps/web/nuxt.config.ts for why `code`
        // and `language` differ in casing (URL-safety vs BCP-47 hreflang tag).
        // Kept consistent across all 3 apps even though this one uses
        // no_prefix (no URL impact here), so the locale identifier/cookie
        // value means the same thing everywhere in the monorepo.
        code: "pt-br",
        language: "pt-BR",
        file: "pt-BR.json",
      },
      { name: "Español", code: "es", language: "es-ES", file: "es.json" },
    ],
    experimental: { typedOptionsAndMessages: "default" },
  },
  // Set from infra/auth.ts at build time (NUXT_PUBLIC_GITHUB_AUTH_ENABLED /
  // NUXT_PUBLIC_GOOGLE_AUTH_ENABLED), based on whether real OAuth
  // credentials are actually loaded — not just whether the feature flag in
  // config.ts is on. Defaults false here only matter for local `nuxt dev`
  // without those env vars set.
  runtimeConfig: {
    public: {
      githubAuthEnabled: false,
      googleAuthEnabled: false,
    },
  },
});
