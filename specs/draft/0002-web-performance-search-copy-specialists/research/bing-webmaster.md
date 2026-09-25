# Bing Webmaster Guidelines and IndexNow

Source page read **RAW** (browser text) on 2026-09-25:
https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a — 22 numbered sections plus an
"abuse and things to avoid" list. The page states that it covers Bing search, Copilot and
grounding API results. Paraphrased; section numbers are the page's own.

| Id | Section | Statement (paraphrased) | Nuxfire consequence |
| --- | --- | --- | --- |
| B1 | 1 | The same crawl/index/rank foundation serves Copilot and grounding; classic SEO practices support eligibility for AI answers. | One SEO specialist covers both. |
| B2 | 2, 4, 19 | Discovery signals are IndexNow, XML sitemaps, crawlable internal links and external links. Notify with IndexNow when URLs are added, updated or removed; avoid batch submissions where possible, streaming submissions are faster. | Nuxfire has no IndexNow (verified, `research/baseline-measurements.md` M9). |
| B3 | 3 | Sitemaps list only canonical URLs, reflect the current structure, drop deleted or redirected URLs, and carry freshness (`lastmod`); accurate `lastmod` and HTTP validation headers such as ETag help change detection. | Rule for sitemap contents and `lastmod`. |
| B4 | 5 | Links are standard `<a href>` with relevant anchor text or image `alt`. | Rule in `check:seo` (already partly covered). |
| B5 | 6 | Avoid the same content on multiple URLs; use canonical URLs, parameter controls and consistent URL structure. | See M10: trailing-slash duplication. |
| B6 | 7 | Use **301** for permanent moves; use **302 only for very short-term** changes (under 2 days); use redirects instead of canonical tags. | M10, M11: production answers 307 to the trailing-slash URL; `routeRules` use 302/301. |
| B7 | 8 | Do not hide critical content behind client-side rendering; avoid excessive requests to render; do not block Bingbot. | Supports prerendered HTML and low request counts. |
| B8 | 9 | Removed content returns 404; update via IndexNow. | Already how Nuxt behaves (SPEC-0001 AC-006). |
| B9 | 10 | `robots.txt` controls crawling, not indexing; use `noindex` to keep a URL out of Bing and Copilot; `nosnippet`/`data-nosnippet` limit captions and citation quality; `noarchive` keeps content out of Copilot answers; `nocache` limits Copilot to URL, title and snippet. | Rule: never set these on pages meant to be cited. |
| B10 | 11, 15-18 | Content must satisfy intent, be original, stand on its own with explicit facts, define entities consistently, focus each URL on one topic and put key information early. Thin, ad-heavy or affiliate-only URLs can lose eligibility. | Input to the copy specialist (landing structure) and the SEO specialist. |
| B11 | 12 | Images and video reinforce the text and are not the sole source of information; descriptive file names, alt text, captions or transcripts. | Rule for images. |
| B12 | 13 | `<title>`, meta description, logical H1-H6 and semantic HTML; missing, duplicate or overly short titles/descriptions may reduce indexing reliability, ranking and grounding eligibility. | Already enforced by `check:seo`. |
| B13 | 14 | Structured data must reflect visible content; it does not guarantee visibility. | Same as Google G5. |
| B14 | 20 | Keep URLs stable; redirect when a change is needed. | Slug rule (SPEC-0001) confirmed. |
| B15 | 21-22 | Crawl capacity depends on site health and signal quality; remove duplicates and low-value URLs; clicks may fall while impressions and citations do not. | Sitemap and canonical hygiene. |
| B16 | abuse list | Cloaking, link schemes, duplicate content across URLs, scraped content, keyword stuffing, unsupervised content at scale, thin affiliate pages, malicious behaviour, **misleading structured data**, prompt injection aimed at Bing or Copilot may reduce ranking or remove a site. | Rules for structured data honesty; forbids hidden "AI-directed" text. |

## Sitemaps and AI search (mode SUM)

https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/
(dated 2025-07-31): submit a complete XML sitemap, reference it from `robots.txt`, use **ISO 8601
including date and time** in `lastmod`, make `lastmod` reflect the page content change (not the
sitemap generation), and combine sitemaps with IndexNow.

**Conflict with SPEC-0001 DEC-013**: SPEC-0001 accepted a date-only `lastmod` because the sitemap
protocol allows it (sitemaps.org). Bing asks for date and time. Both are true; the stricter one
wins for a site that wants Bing/Copilot freshness. Tasks T035 and T036 tighten the rule and the writer.

## IndexNow (mode SUM)

https://www.indexnow.org/documentation and https://www.bing.com/indexnow: a free open protocol;
prove ownership with a UTF-8 key file (8-128 characters: letters, digits, dashes) at the site
root or a declared `keyLocation`; submit one URL with GET or up to 10,000 URLs with POST JSON to
`https://<engine>/indexnow`; status codes 200 (ok), 202 (accepted, key validation pending), 400,
403 (key invalid), 422 (URLs do not match the host), 429 (too many requests); participating engines
share submissions. Google is **not** stated as a participant on these pages.
