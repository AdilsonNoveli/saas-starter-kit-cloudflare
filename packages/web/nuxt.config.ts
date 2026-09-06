// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxtjs/i18n",
    "@nuxtjs/seo",
    "@vueuse/nuxt",
    "nuxt-svgo",
    "@nuxt/fonts",
    "@nuxt/content",
  ],
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2024-12-20",
  nitro: {
    preset: "cloudflare-module",
    prerender: {
      routes: ["/"],
      crawlLinks: true,
    },
  },
  routeRules: {
    "/docs": { redirect: { to: "/docs/pro", statusCode: 302 } },
    "/docs/nuxfire": { redirect: { to: "/docs/nuxfire", statusCode: 302 } },
  },
  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "NuxFire Docs | NuxFire",
    },
  },
  runtimeConfig: {
    public: {
      appUrl: "",
    },
  },
  fonts: {
    families: [{ name: "Montserrat", provider: "google" }],
  },
  svgo: {
    componentPrefix: "icon",
    autoImportPath: "~/assets/icons",
  },
  site: {
    // overridden per-stage at build time by infra/web.ts (falls back to the
    // production domain for local `nuxt dev`/`nuxt build`)
    url: process.env.SITE_URL || "https://nuxfire.com",
    name: "NuxFire",
  },

  // Auto-generated OG image previews need the satori/resvg native image
  // renderer, which isn't installed. Not essential to ship — revisit later.
  ogImage: {
    enabled: false,
  },
  content: {
    build: {
      markdown: {
        highlight: {
          langs: ["ts", "vue", "prisma", "bash"],
          theme: {
            default: "github-light",
            dark: "github-dark",
            sepia: "monokai",
          },
        },
      },
    },
  },
  i18n: {
    vueI18n: "./i18n.config.ts",
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
