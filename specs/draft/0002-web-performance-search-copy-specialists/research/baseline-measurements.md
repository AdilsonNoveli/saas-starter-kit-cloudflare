# Baseline of the Nuxfire site (measured 2026-09-25)

Nothing here was estimated. Each row names the command or method. Values describe the build of
`stage` at commit `e5f82d5` plus the uncommitted work of this session, and the production site as
deployed at the time of measurement. **No paint or interaction timing was obtained** (the browser
pane was hidden and reports no paint entries; Lighthouse was not run). LCP, INP and CLS therefore
remain **unmeasured**; the plan makes their measurement a task (T044) instead of guessing.

## Payload of the home page

| Id | Measurement | Method | Value |
| --- | --- | --- | --- |
| M1 | Production home HTML on the wire (brotli) | `curl -H "Accept-Encoding: br" https://nuxfire.com/` size_download | 25,707 bytes |
| M2 | Production JS+CSS files referenced by `modulepreload`/`stylesheet` links on the home, wire size (brotli) | loop of `curl` over the 56 `href="/_nuxt/..."` entries | 56 files, 336,279 bytes |
| M2b | Same home, decoded sizes seen by the browser (`/es`, static server, Resource Timing) | `performance.getEntriesByType('resource')` | JS 57 files / 956 KB; CSS entry 305 KB; 2 woff2 fonts 52 KB |
| M3 | Avatar photos | `ls -la apps/web/public/static`; Resource Timing | 6 JPEG files of 446,942 to 620,635 bytes (3,413,465 bytes decoded in total; 613,876 and 568,705 bytes on the wire for two of them), rendered at 28-32 px (`width`/`height` attributes in the HTML) |
| M4 | Home `<title>` and description | built `index.html` | `Demo SaaS | Nuxfire`; `Production-ready enterprise-grade Nuxt starter kit for Cloudflare.` (from `landing.seoTitle` and the site default) |
| M5 | Third-party analytics/tag scripts on the home | search of the built HTML for gtag, googletagmanager, posthog, umami, plausible, clarity | none of those names found |
| M6 | Home structure | `apps/web/app/pages/index.vue` | 10 landing components after the hero; landing i18n text 35,990 characters, of which `comparison` 8,892, `databaseArchitecture` 8,773 and `useCases` 5,451 (23,116 = 64.2 %) |
| M7 | Delivery headers on production | `curl -I` | `Content-Encoding: br`, `alt-svc: h3`, `/_nuxt/*` `Cache-Control: public, max-age=31536000, immutable`, HTML `public, max-age=0, must-revalidate`, `CF-Cache-Status: HIT` |
| M8 | LCP candidate | reading `LandingHero.vue` and the HTML | the hero has no `<img>`; the LCP element is expected to be the `<h1>` text. **Not measured.** |

## Search-facing findings

| Id | Measurement | Method | Value |
| --- | --- | --- | --- |
| M9 | IndexNow in the repository | search of all source files excluding `specs/`, `node_modules`, build output | no match |
| M10 | Trailing-slash behaviour in production | `curl -I` on `/blog`, `/docs`, `/pt-br`, `/docs/saas-starter-kit/getting-started/quick-start` | each answers **307 Temporary Redirect** to the same path with a trailing slash; `/blog/git-branching-stage-production-first-release` answers 200. The canonical of `/blog/` is `https://nuxfire.com/blog` (no slash). Cloudflare documents this default as F1 (`auto-trailing-slash`). |
| M11 | Legacy redirects in production | `curl -I` on `/docs/pro`, `/docs/production`, `/pt-br/license`, `/es/terms-of-service` and `GET /docs/pro/` | each answers 307 to the slash URL, which serves a `200` page containing `<meta http-equiv="refresh" content="0; url=/docs/saas-starter-kit">`; `nuxt.config.ts` declares 302 for two of them and 301 for the others, but the served response is a 307 followed by a meta refresh |
| M12 | Sitemap `lastmod` | `grep -o '<lastmod>' apps/web/.output/public/__sitemap__/en-US.xml` | date-only values (`2026-09-15`, `2026-09-25`), no time |
| M13 | Testimonial and avatar provenance | code and built HTML | `xZ4wg2Xj.jpeg` is used for "Alex Rivera" (testimonial) and "Sarah Johnson" (avatar); `FJkauyEa.jpeg` for "Marcus Vance" and "Michael Chen". The line "Early access with 40+ devs testing on Discord & GitHub" has no evidence in the repository. Whether the people are real is **unknown**. |
| M14 | `robots.txt` | `curl https://nuxfire.com/robots.txt` | `User-agent: *`, empty `Disallow`, `Sitemap: https://nuxfire.com/sitemap_index.xml` (generated at runtime by the robots module, not a static file) |

## Human-readable text outside the locale files (heuristic)

Method: `$TEMP/lit.py`, a regular-expression scan of the `<template>` block of every `.vue` file
for text nodes and for the attributes `label`, `title`, `placeholder`, `description`,
`aria-label`, `alt`, `subtitle`, `text`, `tooltip` whose value contains letters and no binding.
It over- and under-counts (comments, attribute conventions); the gate of FR-013 defines the exact
scanner. The order of magnitude is the point.

| Id | Area | `.vue` files | files with literals | literal strings | locale keys in `en.json` |
| --- | --- | --- | --- | --- | --- |
| M15 | `apps/app` | 25 | 11 | 59 | 1 |
| M16 | `apps/login` | 8 | 7 | 55 | 1 |
| M17 | `apps/web/app` | 76 | 7 | 25 | 585 |
| M18 | `layers/*` | 39 | 34 | 176 | 0 (5 empty locale files) |
| M19 | `packages/emails/templates` | 3 templates (`Invitation`, `VerificationCode`, `Welcome`) | not scanned | not scanned | n/a |

Consequence: the largest surface of human-readable text (the dashboard and the layers) is written
directly in templates and is English-only. Localising it is **out of scope** of this spec; making
sure that no new text is added outside a governed path, and that the existing text is inventoried
with an owner, is in scope (FR-013).
