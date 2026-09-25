# Research note: Nuxt SEO with Nuxt Content

- **Source**: https://nuxtseo.com/docs/nuxt-seo/guides/nuxt-content
- **Retrieved**: 2026-09-25 (fetched through the documentation tool of this session; the page text was summarized by the tool, not copied)
- **License / use**: public documentation; this note paraphrases and quotes only short statements as provenance.

## Statements relied on

- `asSeoCollection()` is deprecated; compose `defineRobotsSchema`, `defineSitemapSchema`, `defineOgImageSchema` and `defineSchemaOrgSchema` in the collection schema instead.
- The schemas add `title` and `description`, but the page component must call the SEO composables itself (`useSeoMeta`, `useSchemaOrg`, `defineOgImage`).
- Content pages are included in the sitemap; `lastmod`, `changefreq` and `priority` come from a `sitemap` frontmatter object or from an `onUrl(url, entry, collection)` hook that receives the full entry.
- `@nuxtjs/seo` must be listed before `@nuxt/content` in the modules array (satisfied in `apps/web/nuxt.config.ts`).
- **Sitemap alternatives**: the guide does not document the `alternatives` field; its shape was verified in the installed types instead (R-008).
