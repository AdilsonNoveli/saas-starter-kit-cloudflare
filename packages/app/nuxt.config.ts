export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "@nuxt/eslint",
    "@nuxthub/core",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxtjs/i18n",
    "@vueuse/nuxt",
    "nuxt-svgo",
    "@nuxt/fonts",
    "@pinia/nuxt",
    "nuxt-authorization",
  ],
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2024-12-20",
  build: {
    transpile: ["trpc-nuxt"],
  },
  hub: {
    blob: true,
    kv: true,
    cache: true,
  },
  nitro: {
    preset: "cloudflare-module",
    experimental: {
      tasks: true,
      // Gives server/utils/db.ts a real per-request context (useEvent()) so
      // the Postgres client can be scoped to one request instead of being
      // shared across them — see the comment in useDB(). Backed by
      // AsyncLocalStorage, available here because every Worker runs with the
      // nodejs_compat flag (infra/utils/constants.ts).
      asyncContext: true,
    },
  },
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "Movimenta Bairro Demo",
    },
  },
  fonts: {
    families: [{ name: "Montserrat", provider: "google" }],
  },
  svgo: {
    componentPrefix: "icon",
    autoImportPath: "~/assets/icons",
  },
  runtimeConfig: {
    public: {
      authUrl: "",
      authClientID: "",
      websocketsEndpoint: "",
      // Paddle.js runs in the browser, so both of these are necessarily
      // public (the client token is not a secret — it is scoped to
      // client-side checkout). Set from NUXT_PUBLIC_PADDLE_* in infra/app.ts.
      paddleClientToken: "",
      // "sandbox" | "production". Deliberately defaults to "sandbox" — the
      // value that was hardcoded before this became configurable — so an
      // environment without the variable set keeps behaving exactly as it
      // did instead of pointing an unconfigured deploy at live Paddle.
      paddleEnvironment: "sandbox",
    },
    stripeWebhookSecretKey: "",
    stripeSecretKey: "",
    paddleApiKey: "",
    paddleWebhookSecret: "",
    paddleSandbox: true,
    wsTicketSecret: "",
    // Server-only (outside `public`): authorises account deletion against
    // the auth Worker. Set from NUXT_AUTH_ADMIN_SECRET in infra/app.ts.
    authAdminSecret: "",
    // Server-only. Seals the short-lived platform-admin MFA cookie
    // (server/utils/platform-mfa-session.ts). Must be at least 32 characters;
    // an empty value makes every platform-admin route fail closed rather than
    // fall back to a weak seal. Set from NUXT_PLATFORM_MFA_SESSION_SECRET.
    platformMfaSessionSecret: "",
    // Server-only. Encrypts platform admins' TOTP seeds at rest
    // (server/utils/platform-admin-crypto.ts). Deliberately separate from the
    // session secret above: that one seals 30-minute cookies and can be
    // rotated at any time, while this one guards data already written to the
    // database — sharing them would mean rotating the cookie key silently
    // invalidates every enrolled admin's MFA. Set from
    // NUXT_PLATFORM_ADMIN_ENCRYPTION_KEY.
    platformAdminEncryptionKey: "",
  },
  i18n: {
    vueI18n: "../i18n.config.ts",
    defaultLocale: "en",
    strategy: "no_prefix",
    locales: [
      {
        name: "English (US)",
        code: "en",
        language: "en-US",
      },
      {
        name: "French",
        code: "fr",
        language: "fr",
      },
    ],
  },
  typescript: {
    shim: false,
  },
});
