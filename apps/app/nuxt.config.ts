// Relative, not `#nuxfire/config`: this file is loaded by c12/jiti, which has
// no tsconfig-`paths` resolution, so the alias throws "Cannot find module"
// before Nuxt ever boots. Same reason the import below is relative too.
import { layers } from "../../config";
import { composeLayers } from "../../scripts/compose-layers";

// Single source of truth for which layers are active, feeding BOTH
// mechanisms below — a layer must never be wired into one and not the other,
// or "desativado" stops being a real guarantee (see composeLayers()'s doc
// comment for the concrete failure mode this prevents: a live tRPC router or
// a sidebar link surviving for a layer whose pages were correctly dropped).
const activeLayerNames = new Set([
  ...layers.core,
  ...Object.entries(layers.features)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name),
]);

// Regenerates server/trpc/routers/.composition/layer-routers.ts and
// app/composables/.composition/layer-navigation.ts from whatever exists under
// layers/ right now, filtered to activeLayerNames. Runs on every `nuxt dev`/
// `build`/`generate`/`typecheck`/`prepare` — there is no separate script to
// remember to run, and no way for the composition files to drift from
// layers/ + config.ts.
composeLayers(undefined, activeLayerNames);

// Nuxt's own page/component/config merging. Separate mechanism from
// composeLayers() above (that one wires the tRPC routers and sidebar nav via
// explicit workspace-package imports), but driven by the exact same set.
const activeLayers = [...activeLayerNames].map(
  (name) => `@nuxfire/layer-${name}`,
);

export default defineNuxtConfig({
  extends: activeLayers,
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
    // Nitro can't see infra/utils/constants.ts's `nodejs_compat` flag — that
    // one is applied by SST directly to the deployed sst.cloudflare.Worker,
    // not through a wrangler.toml nitro reads at build time — so it warns
    // "Node.js compatibility is not enabled" on every build even though the
    // Worker this ships to actually runs with it. Stating the true, already
    // real setting here silences the false warning without touching runtime.
    cloudflare: {
      nodeCompat: true,
    },
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
      // No charset/viewport here — Nuxt already sets these exact values by
      // default (see apps/web/nuxt.config.ts, where nuxt-seo-utils flags
      // the same two lines as dead config).
      title: "NuxFire",
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
    // (server/utils/mfa-crypto.ts). Deliberately separate from the
    // session secret above: that one seals 30-minute cookies and can be
    // rotated at any time, while this one guards data already written to the
    // database — sharing them would mean rotating the cookie key silently
    // invalidates every enrolled admin's MFA. Set from
    // NUXT_PLATFORM_ADMIN_ENCRYPTION_KEY.
    platformAdminEncryptionKey: "",
    // Same pair for regular-user self-service 2FA
    // (server/utils/user-mfa-session.ts). Kept on separate secrets from the
    // platform-admin ones above — see infra/secret.ts for why. Unlike the
    // platform-admin session cookie, this one is deliberately long-lived
    // (one verification per login, not one per 30 minutes) — see
    // user-mfa-session.ts.
    userMfaSessionSecret: "",
    userMfaEncryptionKey: "",
  },
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
  typescript: {
    shim: false,
  },
});
