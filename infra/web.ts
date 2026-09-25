import { webUrl, appUrl, webDomain, webAliases } from "./dns";
import { deployWorker } from "./utils/nuxt";

/**
 * @nuxt/content's `cloudflare` preset (apps/web/nuxt.config.ts's nitro
 * preset) hard-requires a D1 binding named exactly `DB` once deployed there
 * — without it, every runtime content query (the docs/blog search box,
 * `queryCollection*`) throws, since there is nothing on the Worker to query.
 * The binding name comes straight from this component's own name (same
 * pattern as BLOB/KV/CACHE in utils/nuxt.ts), so it must stay "DB". Content
 * itself needs no separate migration step: the module lazily loads its own
 * SQL dump into this database on first query (see
 * @nuxt/content/dist/runtime/internal/database.server.js).
 */
const contentDatabase = new sst.cloudflare.D1("DB");

await deployWorker("Web", {
  root: "apps/web",
  domain: webDomain,
  aliases: webAliases,
  // The site declares canonical URLs without a trailing slash (apps/web/nuxt.config.ts,
  // @nuxtjs/i18n baseUrl). Dropping the slash makes those URLs answer 200 directly.
  // Verified locally with `wrangler dev` and `bun run check:seo -- --live` (SPEC-0002 T039).
  htmlHandling: "drop-trailing-slash",
  link: [contentDatabase],
  vars: {
    NUXT_PUBLIC_APP_URL: appUrl.properties.value,
    // read directly in nuxt.config.ts at build time (not a runtimeConfig
    // entry) since @nuxtjs/seo's `site.url` is evaluated at build time
    SITE_URL: webUrl.properties.value,
  },
});

export const outputs = {
  Web: webUrl.properties.value,
};
