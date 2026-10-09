# Google and Bing Requirements (matrix)

One row per requirement, with the page it comes from and the day it was read. Google and Bing
overlap on most of it; the last column says which one is stricter when they differ. Statements are
paraphrases. Nothing here is a ranking factor with a weight: neither engine publishes one, and
the sources say so where they speak to it.

## 1. Google Search Central

| Id | Requirement | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| G1 | Permanent redirects (301, 308, instant meta refresh, JavaScript location) make the target the canonical signal and the target is shown; temporary redirects (302, 303, 307, delayed meta refresh) keep the source shown. Server-side is the most reliably understood type. | https://developers.google.com/search/docs/crawling-indexing/301-redirects | 2026-09-25 | RAW |
| G2 | Canonical signals in order of strength: redirects, `rel="canonical"`, sitemap inclusion (weak). Use one canonical per page across all methods, absolute URLs, and the `<head>`; not robots.txt. | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | 2026-09-25 | RAW |
| G3 | Sitemap: at most 50 MB or 50,000 URLs per file, UTF-8, absolute URLs, the URLs you want in results; `priority` and `changefreq` ignored; `lastmod` used when it is consistently and verifiably accurate. | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap | 2026-09-25 | RAW |
| G4 | Robots meta tag and `X-Robots-Tag` accept the same rules (`noindex`, `nofollow`, `nosnippet`, `max-snippet`, `max-image-preview`, `unavailable_after`); the more restrictive rule wins; a crawler must be able to fetch the page to read them; use the header for non-HTML files. `nosnippet` also keeps content out of AI Overviews and AI Mode as direct input. | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag | 2026-09-25 | RAW |
| G5 | Structured data: JSON-LD recommended; only visible content; required properties present; most specific type; linked with `@id`; violations can cost rich-result eligibility (a manual action), not ordinary ranking. No guarantee that valid markup shows. | https://developers.google.com/search/docs/appearance/structured-data/sd-policies | 2026-09-25 | RAW |
| G6 | The FAQ rich result stopped appearing on 2026-05-07 and its documentation was removed. | https://developers.google.com/search/updates | 2026-09-25 | RAW |
| G7 | Core Web Vitals targets: LCP within 2.5 s, INP under 200 ms, CLS under 0.1; recommended, aligned with what the ranking systems reward, no weight stated. | https://developers.google.com/search/docs/appearance/core-web-vitals | 2026-09-25 | RAW |
| G8 | Snippets are generated from page content; the meta description is used when it describes the page better; different queries can show different snippets. | https://developers.google.com/search/docs/appearance/snippet | 2026-09-25 | RAW |
| G9 | People-first content: original information, a descriptive title that does not exaggerate, verifiable facts, first-hand experience; warning signs are mass production, heavy automation, summarising others without value, a target word count and changing dates to look fresh. Trust matters most among E-E-A-T; E-E-A-T is not itself a ranking factor. | https://developers.google.com/search/docs/fundamentals/creating-helpful-content | 2026-09-25 | RAW |

## 2. Bing Webmaster Guidelines (section numbers are the page's own)

| Id | Requirement | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| N1 | The same crawl, index and rank foundation serves Bing search, Copilot and grounding, so classic SEO supports eligibility for AI answers (section 1). | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N2 | Discovery signals are IndexNow, XML sitemaps, crawlable internal links and external links; notify with IndexNow when URLs are added, updated or removed (sections 2, 4, 19). | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N3 | Sitemaps list only canonical URLs, drop deleted or redirected ones and carry an accurate `lastmod` (section 3). | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N4 | Avoid the same content on multiple URLs: canonical URLs and a consistent URL structure (section 6). | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N5 | Use 301 for permanent moves and 302 only for very short-term changes (under two days); use redirects rather than canonical tags for a move (section 7). | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N6 | Do not hide critical content behind client-side rendering, avoid excessive requests to render, do not block Bingbot (section 8). | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N7 | `robots.txt` controls crawling, not indexing; `noindex` keeps a URL out of Bing and Copilot; `nosnippet`, `noarchive` and `nocache` limit captions and Copilot use (section 10). | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N8 | Content: satisfy intent, be original, stand alone with explicit facts, define entities consistently, one topic per URL, key information early (sections 11, 15-18). Thin, ad-heavy or affiliate-only pages can lose eligibility. | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N9 | `<title>`, meta description and a logical H1 to H6 structure with semantic HTML; missing, duplicate or overly short titles and descriptions can reduce indexing reliability and grounding eligibility (section 13). | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N10 | Structured data must reflect visible content and does not guarantee visibility (section 14); misleading structured data is on the list of abuse that can reduce ranking or remove a site. | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| N11 | Sitemap freshness (blog, 2025-07-31): `lastmod` as ISO 8601 with **date and time**, equal to the real modification time of the content, not the sitemap generation; `changefreq` and `priority` ignored; combine with IndexNow. | https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/ | 2026-09-25 | RAW |

## 3. Where the two differ, and what Nuxfire does

| Id | Difference | Nuxfire rule | Source | Read | Mode |
| --- | --- | --- | --- | --- | --- |
| D1 | Google accepts a `lastmod` when it is verifiably accurate (date-only is fine); Bing asks for date and time. | The sitemap carries date and time (stricter wins); `article:published_time` keeps its own rule. | specs/draft/0002-web-performance-search-copy-specialists/spec.md DEC-011 | 2026-09-25 | DECISION |
| D2 | Google treats 307 like 302 (temporary); Bing wants 301 for moves and tolerates 302 for under two days. | A moved URL is 301 (or 308), never a temporary code. | apps/web/public/_redirects | 2026-09-25 | CODE |
| D3 | Google removed the FAQ rich result; whether Bing uses `FAQPage` was not established from a Bing source. | No `FAQPage` markup (rule `jsonld-no-faq`); "unverified for Bing" stays recorded. | specs/draft/0002-web-performance-search-copy-specialists/spec.md DEC-012 | 2026-09-25 | DECISION |

## 4. What this reference does NOT establish

- Ranking weights, of anything. Neither engine publishes them.
- Bing's handling of `SoftwareApplication`, `Organization` and other types: the Bing guidelines
  page states only the general rule (N10); no Bing page for those types was read.
- Google's rules for images, video, internationalisation beyond `hreflang` (covered by
  `$fireskill-specialist-content-seo`), pagination, and AMP: not read here, not claimed.
- Anything about "AI Overviews" eligibility beyond G4 and N1.
