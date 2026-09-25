import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { generatePaths } from "../../scripts/generate-paths";
import { CONTENT_LOCALES } from "./i18n/supported-locales";
import { SITE_URL } from "./site";

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
      // The legacy URLs are answered by `public/_redirects` (301). A prerendered page for
      // them would be an empty page or a meta refresh stub, which is not a redirect.
      ignore: [
        /^\/docs\/(?:pro|nuxfire|production)\/?$/,
        /^\/(?:pt-br|es)\/(?:license|privacy-policy|terms-of-service)\/?$/,
      ],
    },
  },
  routeRules: {
    // Moved URLs are redirected by apps/web/public/_redirects with a 301 (Cloudflare answers it
    // before an asset is served). A `redirect` route rule here would prerender a meta refresh
    // page, which is a 200, not a redirect (SPEC-0002 FR-007).
    // The legal pages are English-only and have no localized routes (`i18n: false`, see
    // pages/license.vue): their /pt-br/... and /es/... URLs used to serve an empty page that
    // was indexed and listed in the sitemap, and `_redirects` now sends them to the real page.
    // /signup only redirects the visitor to the app: it must not be indexed nor listed in the
    // sitemap (the robots module removes noindex routes from it).
    ...Object.fromEntries(
      CONTENT_LOCALES.map((locale) => [
        locale.code === "en" ? "/signup" : `/${locale.code}/signup`,
        { robots: false },
      ]),
    ),
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
    url: SITE_URL,
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
    // Without it the canonical, og:url and hreflang tags are emitted relative
    // (`href="/"`), which resolve to whichever hostname served the page: the
    // production `www.` alias (infra/dns.ts → webAliases) would canonicalize to
    // itself instead of the apex.
    baseUrl: SITE_URL,
    defaultLocale: "en",
    strategy: "prefix_except_default",
    // Single source: i18n/supported-locales.ts (also read by content.config.ts and the
    // SEO builders), so a locale is never renamed in one place and forgotten in another.
    locales: CONTENT_LOCALES.map(({ code, language, name, file }) => ({ code, language, name, file })),
    experimental: { typedOptionsAndMessages: "default" },
  },
  typescript: {
    shim: false,
  },
});
