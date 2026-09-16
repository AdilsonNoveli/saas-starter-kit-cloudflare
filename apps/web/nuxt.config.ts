import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { generatePaths } from "../../scripts/generate-paths";

// Regenerates constants/paths.json (the docs "project structure" tree, see
// generate-paths.ts) from the real repo tree every time this config loads —
// no separate step to remember, and no way for it to go stale like the
// hand-maintained version it replaced.
generatePaths();

// `crawlLinks: true` only finds routes reachable through an <a href> that's
// actually in the server-rendered HTML — the docs sidebar's nested sections
// (Getting Started, Features, Concepts) are collapsed by default and Nuxt
// UI's Accordion doesn't render collapsed panel content into the SSR output,
// so the crawler never sees those links and those pages never get
// prerendered. Cloudflare has no Postgres/D1 database backing @nuxt/content
// at runtime (see infra/web.ts), so any doc page that isn't prerendered
// 404s/fails live instead of falling back to a dynamic query. Listing every
// route explicitly — derived straight from the content file tree, same
// numeric-prefix-stripping rule Nuxt Content itself applies — sidesteps the
// crawler entirely instead of trying to out-guess Accordion's DOM behavior.
function docsRoutes(): string[] {
  const root = fileURLToPath(new URL("./content/docs", import.meta.url));
  const routes: string[] = [];
  const stripPrefix = (segment: string) => segment.replace(/^\d+\./, "");

  function walk(dir: string, urlSegments: string[]) {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(".")) continue; // .navigation.yml etc.
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath, [...urlSegments, stripPrefix(entry)]);
      } else if (entry.endsWith(".md")) {
        const name = stripPrefix(entry.replace(/\.md$/, ""));
        const segments = name === "index" ? urlSegments : [...urlSegments, name];
        routes.push(`/docs${segments.length ? "/" + segments.join("/") : ""}`);
      }
    }
  }

  walk(root, []);
  return routes;
}

function blogRoutes(): string[] {
  const root = fileURLToPath(new URL("./content/blog", import.meta.url));
  const routes: string[] = ["/blog"];
  try {
    for (const entry of readdirSync(root)) {
      if (entry.endsWith(".md")) {
        const slug = entry.replace(/\.md$/, "");
        routes.push(`/blog/${slug}`);
      }
    }
  } catch {}
  return routes;
}

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
    // See apps/app/nuxt.config.ts for why this is set explicitly: SST
    // (infra/utils/constants.ts) already deploys this Worker with
    // `nodejs_compat`, but Nitro can't see that flag at build time and warns
    // otherwise.
    cloudflare: {
      nodeCompat: true,
    },
    prerender: {
      routes: ["/", ...docsRoutes(), ...blogRoutes()],
      crawlLinks: true,
    },
  },
  routeRules: {
    "/docs/pro": { redirect: { to: "/docs/saas-starter-kit", statusCode: 302 } },
    "/docs/nuxfire": { redirect: { to: "/docs/saas-starter-kit", statusCode: 302 } },
    "/docs/production": { redirect: { to: "/docs/saas-starter-kit", statusCode: 301 } },
  },
  app: {
    head: {
      // No charset/viewport here — Nuxt already sets these exact defaults;
      // repeating them just trips nuxt-seo-utils's "repeats a default" check.
      title: "Nuxfire Docs | Nuxfire",
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
    name: "Nuxfire",
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
          langs: ["ts", "vue", "bash"],
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
    restructureDir: "i18n",
    defaultLocale: "en",
    strategy: "prefix_except_default",
    locales: [
      { name: "English (US)", code: "en", language: "en-US", file: "en.json" },
      {
        name: "Português (Brasil)",
        // Lowercase on purpose: `code` drives the URL prefix
        // (prefix_except_default -> /pt-br/...), and Nuxt Link Checker's
        // no-uppercase-chars rule flags any uppercase in a URL path. `language`
        // stays properly-cased "pt-BR" since that's the BCP-47 tag used for
        // hreflang/SEO, a separate field from `code`.
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
