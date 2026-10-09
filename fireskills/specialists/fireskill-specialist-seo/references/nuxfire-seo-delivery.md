# Nuxfire SEO Delivery (what exists, verified 2026-09-25)

Search-facing behaviour of `apps/web`, the gates that hold it, and what is missing. The authoring
side of posts and docs is in `fireskills/specialists/fireskill-specialist-content-seo/`.

## 1. What exists

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| A1 | `bun run check:seo` lints the blog frontmatter and audits every built page and the sitemap. Static rule ids: `title-present`, `title-unique`, `title-not-fallback`, `title-not-placeholder`, `title-no-repeated-segment`, `description-present`, `description-not-fallback`, `h1-single`, `canonical`, `canonical-absolute`, `canonical-og-url`, `hreflang-valid`, `hreflang-self`, `hreflang-reciprocal`, `x-default`, the `og-*` and `twitter-card-image` rules, `article-*`, `post-*`, `jsonld-no-faq`, `jsonld-no-unproven-rating`, `no-meta-refresh`, `robots-sitemap` and the `sitemap-*` rules including `sitemap-lastmod-datetime`. | scripts/seo-rules.ts | 2026-09-25 | CODE |
| A2 | `--live <origin> [--sitemap-origin <origin>]` fetches robots.txt, the sitemap, every sitemap URL, the hashed assets and the legacy URLs, and reports `live-robots`, `live-status`, `live-redirect-chain`, `live-compression`, `live-noindex-listed`, `live-immutable-cache` and `live-legacy-redirect`. It is read-only. | scripts/seo-live.ts, scripts/check-seo.ts | 2026-09-25 | CODE |
| A3 | `scripts/seo-config.json` lists the placeholder titles (`Demo SaaS`, `SaaS Demo`, `SaaS de demostración`) and three dated allowances for the home pages, owned by `BACKLOG-landing-refactor`. The gate fails when an allowance stops matching. | scripts/seo-config.json | 2026-09-25 | CODE |
| A4 | `apps/web/public/_redirects` holds ten `301` lines: three legacy docs URLs, six localised legal URLs and `/sitemap.xml` to `/sitemap_index.xml`; `scripts/redirects.ts` validates its syntax, status, duplicates, loops and chains (rules `redirect-syntax`, `redirect-status`, `redirect-duplicate`, `redirect-loop`, `redirect-chain`). | apps/web/public/_redirects, scripts/redirects.ts | 2026-09-25 | CODE |
| A5 | `apps/web/nuxt.config.ts` has no `redirect` route rules and ignores the legacy paths in `nitro.prerender.ignore`, so no meta refresh page is generated for them. | apps/web/nuxt.config.ts | 2026-09-25 | CODE |
| A6 | The `Web` Worker serves `html_handling: drop-trailing-slash`, so canonical URLs answer 200 and `/x/` answers a redirect to `/x`. | infra/web.ts | 2026-09-25 | CODE |
| A7 | The sitemap `lastmod` carries date and time: `lastmodWithTime` in `apps/web/app/utils/seo/content-seo.ts` and the Nitro plugin `apps/web/server/plugins/sitemap-blog.ts` (hook `sitemap:output`). | those files | 2026-09-25 | CODE |
| A8 | `bun run indexnow` builds the payload from the built sitemap; the default is a dry run, `--submit` sends it to `https://api.indexnow.org/indexnow`, and `--generate-key` prints a key. The key file `<key>.txt` must exist in `apps/web/public`. | scripts/indexnow.ts | 2026-09-25 | CODE |
| A9 | `robots.txt` is produced at runtime by the robots module and lists the `Sitemap: https://nuxfire.com/sitemap_index.xml` line; `/signup`, `/pt-br/signup` and `/es/signup` are `robots: false` route rules. | apps/web/nuxt.config.ts and specs/draft/0002-web-performance-search-copy-specialists/research/baseline-measurements.md (M14) | 2026-09-25 | CODE |
| A10 | Final audit: `check:seo`, `check:perf` and `check:copy` exit 0 on the fresh build, and `check:seo --live` against a local Worker with `drop-trailing-slash` audited 97 sitemap URLs and 10 legacy URLs, exit 0. | specs/draft/0002-web-performance-search-copy-specialists/research/redirect-spike.md | 2026-09-25 | CMD |

## 2. Operating notes

- The build needs the real domain: `SITE_URL=https://nuxfire.com bun run --cwd apps/web build`.
  Without it the canonicals and the sitemap carry a placeholder and `check:seo` says so.
- A gate failure is fixed at the cause. A dated allowance is for a defect that is known, owned and
  scheduled; it is not for a rule that is inconvenient.
- Adding a page to the landing means: a unique title and description in the three locales, one
  `<h1>`, a canonical, `hreflang` if it exists in more than one language, a sitemap entry, and
  structured data chosen with `references/structured-data.md`.
- Adding or removing a URL: update `_redirects` (moved) or let it 404 (gone), rebuild, run the
  gate and the live audit, and after an authorized deploy run `bun run indexnow` (dry run first).

## 3. What Does NOT Exist

- **No IndexNow key and no key file** in `apps/web/public`; nothing was ever submitted. Creating a
  key is a public, owner-visible act and is left to the owner's authorization.
- **No production audit of the new behaviour.** The 307 to trailing slash, the meta refresh pages
  and the missing IndexNow were measured on production before the fix; the fix is verified on a
  local Worker only, and stays unverified on the edge until a deploy the owner authorizes.
- **No Search Console or Bing Webmaster Tools data**: whether the site is verified, which pages are
  indexed and what the sitemap reports are unknown from the repository.
- **No `Organization` or `SoftwareApplication` markup on the home page** and no rating or review
  markup anywhere; adding the first two needs the owner's confirmation of the legal facts.
- **No `hreflang` alternates for the legal pages**: they are English-only by design
  (`i18n: false`), and their localised URLs are 301 redirects.
- **No `X-Robots-Tag` on content**: the only one is `noindex` on `/_nuxt/*`, from the build's
  `_headers`.
- **No Bing-specific verification** (a `msvalidate` meta tag or XML file) is present or claimed.
