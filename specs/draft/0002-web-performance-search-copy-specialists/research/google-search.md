# Google Search Central (mode SUM unless stated)

All pages under `developers.google.com/search/docs`. Every row must be re-read RAW when the
`fireskill-specialist-seo` reference is written (task T047).

| Id | Statement (paraphrased) | URL | Page date |
| --- | --- | --- | --- |
| G1 | Google publishes a people-first content self-assessment: original insight and depth, a descriptive (not sensational) headline, verifiable facts, evidence of first-hand experience, a defined purpose for the site, and readers who finish with enough to reach their goal. | `/fundamentals/creating-helpful-content` | last updated 2025-12-10 |
| G2 | The same page lists warning signs of search-engine-first content: mass production across topics, heavy automation at scale, summarising others without adding value, promising answers that are not delivered, targeting word counts from unfounded beliefs, and changing dates to look fresh. | same | same |
| G3 | Core Web Vitals: LCP within 2.5 s, INP under 200 ms, CLS under 0.1. Google says they align with what its core ranking systems seek to reward, recommends them for success in Search, and does not quantify a ranking weight. Recommended measurement: the Search Console Core Web Vitals report and web.dev. | `/appearance/core-web-vitals` | not shown |
| G4 | Snippets are generated automatically from page content; the meta description may be used when it describes the page better. Each page should have its own description, an accurate summary, no keyword stuffing; there is no fixed length (truncation depends on device width). | `/appearance/snippet` | not shown |
| G5 | Structured data: JSON-LD is the recommended format; markup must not describe content that is not visible to readers; it must represent the page; include the required properties; nest or link items with `@id`; violations can lead to a manual action that removes rich-result eligibility (not ordinary ranking). | `/appearance/structured-data/sd-policies` | not shown |
| G6 | **FAQ rich results are deprecated**: the feature no longer appears in Google Search from 2026-05-07 (notice added 2025-05-08; earlier restriction to well-known government and health sites, 2023-09-14). | `/appearance/structured-data/faqpage` | 2026 |
| G7 | `SoftwareApplication` rich result requires `name`, `offers.price` (0 for free) and either `aggregateRating` or `review`; `applicationCategory` and `operatingSystem` are recommended; Google does not guarantee that any feature shows. A rating or review is therefore required for eligibility and **must be real** (see compliance-claims.md). | `/appearance/structured-data/software-app` | updated 2026-09-08 |
| G8 | `Organization`: no required properties; recommended `name`, `url`, `logo` (min 112x112 px), `sameAs`, `contactPoint`, `description`; place it on the home or about page; use the most specific subtype. | `/appearance/structured-data/organization` | updated 2026-09-08 |
| G9 | JavaScript SEO: Googlebot crawls, renders (Chromium) and indexes; use distinct titles and descriptions, meaningful HTTP status codes (404 instead of a soft 404), real `<a href>` links, and note that server-side or pre-rendering is still a great idea because it is faster for users and crawlers and not all bots run JavaScript. | `/crawling-indexing/javascript/javascript-seo-basics` | not shown |

Findings that already exist from SPEC-0001 (title links, hreflang, images, Article) are in
`specs/review/0001-content-seo-metadata/research/` and are not repeated.

Not yet read (to be read RAW in T047, listed so the gap is explicit): redirects and status codes
(301/302/307/308 as Google treats them), canonicalization, robots meta and `X-Robots-Tag`,
sitemaps (`lastmod` guidance), Product and Offer snippets, breadcrumbs, `WebSite`/sitelinks,
image and video SEO, internationalization beyond hreflang, `max-image-preview`.
