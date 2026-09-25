# Content and SEO in Nuxfire — What Actually Exists in Code

Every statement cites its evidence file. Code supersedes this document.

## 1. Where the content lives

- `apps/web/content/blog/*.md` — the blog. One Nuxt Content collection (`blog`), **no locale
  mechanism**: each post is written in one language. The article route
  (`apps/web/app/pages/blog/[...slug].vue`) is `i18n: false`, English URL space only.
- `apps/web/content/docs`, `pt-br/docs`, `es/docs` — the docs. English is the source of truth;
  `docs_pt_br` and `docs_es` are collections served at the same `/docs/...` URLs, chosen by
  the active locale (`apps/web/app/composables/use-docs-locale.ts`).
- `apps/web/content/{license,privacy-policy,terms-of-service}.md` — legal pages, collection
  `legal`, English-only, routes `i18n: false` (`apps/web/app/pages/*.vue`).
- All collections are declared in `apps/web/content.config.ts`.

## 2. The blog frontmatter contract

Defined in `apps/web/content.config.ts` (`blog.schema`):

| Field | Rule |
|---|---|
| `title`, `description` | Base page fields; the lint and the builders reject an empty value |
| `date` | Required; `YYYY-MM-DD` or ISO 8601 datetime **with a timezone** (`isoDate` refinement) |
| `updated` | Optional, same format, not before `date` (lint + builder) |
| `author` | Required string |
| `authorType` | Optional `Person` or `Organization`; the builder defaults to `Organization` |
| `lang` | Required enum from `CONTENT_LANGS` (`en`, `pt-br`, `es`); **no default** |
| `translations` | Optional record language to slug; includes the post itself; identical on every member |
| `category`, `readTime`, `tags` | Optional presentation metadata (`tags` also feed `article:tag` and JSON-LD `keywords`) |
| `image` | Optional cover shown on the page; may be an SVG |
| `ogImage` | Optional root-relative png/jpeg (`/^\/.*\.(png|jpe?g)$/i`); default is `/images/og/default.png` |

Languages come from one module, `apps/web/i18n/supported-locales.ts` (`CONTENT_LOCALES`), read
by `nuxt.config.ts` (i18n options), `content.config.ts` (the `lang` enum) and the builders.
`code` is lowercase because it drives the URL prefix; `language` is the BCP-47 tag (`pt-BR`).

## 3. Where a page's metadata is produced

| Concern | File |
|---|---|
| Pure builders (no I/O, no Nuxt auto-imports, unit-tested) | `apps/web/app/utils/seo/content-seo.ts` |
| Nuxt adapter (`useArticleSeo`, `usePageSeo`, `useDefaultSocialMeta`) | `apps/web/app/composables/use-content-seo.ts` |
| Blog post + legal page layout, `<h1>`, 404 | `apps/web/app/components/layout/LayoutContentPage.vue` |
| Blog index (`CollectionPage`, language label per card) | `apps/web/app/pages/blog/index.vue` |
| Docs pages (title `<page> - Nuxfire Docs`, real 404 status) | `apps/web/app/pages/docs/[...slug].vue`, `docs/index.vue` |
| Default social image on every page; a post owns its locale tags | `apps/web/app/app.vue` (`seo:owns-locale-head` state) |
| Sitemap `lastmod` + hreflang of posts | `apps/web/server/plugins/sitemap-blog.ts` |
| Build-time constants (`SITE_URL`, default image) | `apps/web/site.ts` |

Behaviour the builders guarantee (tests: `apps/web/app/utils/seo/content-seo.test.ts`):
`og:type=article` with `article:published_time`, `article:modified_time` (`updated ?? date`),
`article:section`, `article:tag` and `<meta name="author">`; an absolute raster `og:image` with
width, height, type and alt; `twitter:card=summary_large_image` only together with its image;
`BlogPosting` JSON-LD and a Home/Blog/post `BreadcrumbList`; `<html lang>`, `og:locale` and
`inLanguage` from `lang`; an hreflang cluster listing every version reciprocally, with
`x-default` pointing to the English version when it exists.

## 4. Sitemap

- `@nuxtjs/sitemap` 8.5.0 builds one sitemap per locale plus an index (`__sitemap__/*.xml`).
- Blog posts get `lastmod` and hreflang alternatives in `apps/web/server/plugins/sitemap-blog.ts`,
  a Nitro plugin on the `sitemap:resolved` hook, built with the same functions as the page head.
- The `onUrl` of `defineSitemapSchema()` is **not** used: the module serializes it with
  `fn.toString()` into a virtual module, so it cannot use imports or closures (verified in
  `node_modules/@nuxtjs/sitemap/dist/module.mjs`, `addContentCallbackVirtuals`).
- `/signup` is a redirect page: `routeRules` marks it `robots: false` (noindex, out of the sitemap).

## 5. Social images

- Facebook lists JPEG, GIF and PNG for `og:image`; SVG is not listed. Google Search supports SVG.
  So covers are designed as SVG and rendered to PNG (`scripts/og-images.ts`, `sharp`, 1200x675).
- Sources: `apps/web/public/images/blog/*.svg` and `apps/web/public/images/og/default.svg`.
  The generator refuses an SVG that is not 16:9. `bun run generate:og` is idempotent.
- The PNGs are committed. Text in the SVG is rendered with the fonts of the machine that ran the
  generator: look at every PNG.
- `sharp` is an exact root `devDependency`; nothing under `apps/web` may import it (test-guarded).

## 6. The gate: `bun run check:seo`

- `scripts/check-seo.ts` (CLI, `Bun.YAML`) and `scripts/seo-rules.ts` (pure rules, tests in
  `scripts/seo-rules.test.ts`). Source lint of every post + audit of `apps/web/.output/public`.
- Source rules: `post-title-required`, `post-description-required`, `post-lang-required`,
  `post-lang-valid`, `post-date-iso`, `post-updated-order`, `post-ogimage-raster`,
  `post-ogimage-exists`, `post-translations-self`, `-target-exists`, `-lang-match`, `-reciprocal`.
- Page rules: `title-present`, `title-not-fallback`, `title-no-repeated-segment`,
  `description-present`, `description-not-fallback`, `h1-single`, `canonical-absolute`,
  `canonical-og-url`, `og-title`, `og-description`, `og-image-absolute`, `og-image-exists`,
  `og-image-raster`, `og-image-size`, `twitter-card-image`, `article-og-type`,
  `article-published-time`, `article-jsonld`, `article-lang`, `hreflang-valid`, `hreflang-self`.
- Site rules: `title-unique`, `hreflang-reciprocal`, `sitemap-target-exists`,
  `sitemap-post-listed`, `sitemap-lastmod`, `sitemap-hreflang-match`, `sitemap-noindex`.
- Pages with `noindex` are exempt from the page rules and must not be in the sitemap.
- Exit code 0 when clean, 1 with every violation printed as `[rule] where` plus a message.

## 7. History worth remembering (2026-09-25 audit)

The first audit of the built HTML found, and this work fixed: every post and legal page with the
generic title `Nuxfire Docs | Nuxfire | Nuxfire`, no `<h1>` (the title was a `<span>`),
`og:type=website` everywhere, no `og:image` anywhere, all posts declared `en-US` (page and
sitemap), no `lastmod` in 86 sitemap URLs, and **empty** `/pt-br/license`-style pages listed in
the sitemap. Lesson: a shared layout that forgets `useSeoMeta` silently degrades every page it
renders, and the gate exists so that cannot happen unnoticed.

## 8. What Does NOT Exist

- Per-locale blog URLs, a blog language switcher, or filtering the blog index by locale
  (English and Spanish readers would see one post each).
- Runtime OG image generation: `nuxt-og-image` is disabled (`ogImage.enabled: false`).
- An RSS/Atom feed.
- `lastmod` for docs pages (they carry no date).
- Structured-data images in ratios other than 16:9 (1:1, 4:3).
- `article:author` profile URLs; author pages.
- A CI job that runs `check:seo` (the repository has no CI): run it after `nuxt build`.
- A default for `lang`, or inference of a post's language from its filename or content.
- Translated legal pages.
