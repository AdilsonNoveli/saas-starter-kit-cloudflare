# Indexing and HTTP: status codes, redirects, canonical, sitemap, robots, IndexNow

The mechanics that decide whether a URL is fetched, which URL is kept, and how quickly a change is
noticed. Sources first, then what was reproduced on Nuxfire and what the repository does about it.

## 1. Sourced facts

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| H1 | Google: permanent redirects (301, 308, a 0-second meta refresh) make the target canonical and shown; temporary ones (302, 303, 307, a delayed meta refresh) keep the source shown. Server-side redirects are the most reliably interpreted. | https://developers.google.com/search/docs/crawling-indexing/301-redirects | 2026-09-25 | RAW |
| H2 | Bing: 301 for permanent moves, 302 only for changes under two days, redirects rather than canonical tags for moves. | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| H3 | Google canonical signals from strongest to weakest: redirects, `rel="canonical"`, sitemap inclusion; one canonical per page across methods; absolute URLs; in the `<head>`. | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | 2026-09-25 | RAW |
| H4 | Sitemap limits and content: 50 MB or 50,000 URLs per file, UTF-8, absolute URLs; `priority` and `changefreq` ignored by Google; `lastmod` trusted when verifiably accurate. | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap | 2026-09-25 | RAW |
| H5 | Bing: `lastmod` as ISO 8601 with date and time, the real modification time of the content; sitemap re-read at least daily once submitted; combine with IndexNow. | https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/ | 2026-09-25 | RAW |
| H6 | Robots meta tag and `X-Robots-Tag` share their rules; the more restrictive rule wins; the crawler must be able to fetch the page to read them; `X-Robots-Tag` is the way for non-HTML files. | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag | 2026-09-25 | RAW |
| H7 | Bing: `robots.txt` controls crawling, not indexing; `noindex` is the way to stay out of Bing and Copilot. | https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a | 2026-09-25 | RAW |
| H8 | IndexNow: GET for one URL, POST JSON for up to 10,000 (`host`, `key`, optional `keyLocation`, `urlList`); key of 8 to 128 characters (`a-z`, `A-Z`, `0-9`, `-`); ownership proven by a `{key}.txt` file at the site root whose content is the key; responses 200, 202, 400, 403, 422, 429; 200 means received, not indexed; participating engines share submissions. | https://www.indexnow.org/documentation | 2026-09-25 | RAW |
| H9 | Cloudflare Workers Static Assets: `html_handling` defaults to `auto-trailing-slash` (single files without a slash, folder index files with one); the alternatives include `drop-trailing-slash`; a `_redirects` file supports 301, 302, 303, 307 and 308 with **302 as the default**, and applies to asset responses. | https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/ and https://developers.cloudflare.com/workers/static-assets/redirects/ | 2026-09-25 | RAW |

## 2. Reproduced on Nuxfire

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| X1 | On production (before this spec's fix) `/blog`, `/docs`, `/pt-br` answered **307** to the trailing-slash URL while their canonical had no slash; the legacy URLs answered 307 to a slash URL that served a 200 page with a meta refresh. | specs/draft/0002-web-performance-search-copy-specialists/research/baseline-measurements.md (M10, M11) | 2026-09-25 | CMD |
| X2 | Reproduced locally: with the default `auto-trailing-slash`, 96 of 97 sitemap URLs answered 307; adding `_redirects` alone still left the redirect target answering 307 (two hops); `drop-trailing-slash` plus `_redirects` made all 97 sitemap URLs answer 200 and every legacy URL one 301 then a 200. | specs/draft/0002-web-performance-search-copy-specialists/research/redirect-spike.md | 2026-09-25 | CMD |
| X3 | The final build audited with `check:seo --live` against a local Worker: 97 sitemap URLs and 10 legacy URLs, exit 0. The module `@nuxtjs/sitemap` also wrote `sitemap.xml/index.html` as a meta refresh to `/sitemap_index.xml`; a `301` line in `_redirects` now answers it. | specs/draft/0002-web-performance-search-copy-specialists/research/redirect-spike.md | 2026-09-25 | CMD |
| X4 | `assets.htmlHandling` is marked `@internal` in SST 4.14's type definition and is passed through to the Cloudflare provider; `infra/web.ts` names that reason. A later SST release may change it. | .sst/platform/src/components/cloudflare/worker.ts | 2026-09-25 | CODE |

## 3. Decision table (what to do for which situation)

| Situation | Do | Do not |
| --- | --- | --- |
| A URL moved for good | A line in `apps/web/public/_redirects` with `301` to the new page (which must answer 200 itself); update internal links and the sitemap | A `redirect` route rule, a meta refresh page, a JavaScript redirect, a 302 or 307 |
| A URL is gone | Let it answer 404 and drop it from the sitemap; notify with IndexNow | A soft 404 (a 200 page saying "not found") |
| Two URLs show one page | Redirect one to the other; if both must stay, one canonical, absolute, same in head, sitemap and `og:url` | Different canonicals from different methods |
| A page must stay out of results | `noindex` (meta or header) on a page that is crawlable; remove it from the sitemap | `robots.txt` alone; listing it in the sitemap |
| A page is updated | Change the content, set `lastmod` to that real time, then notify with IndexNow after the deploy | A `lastmod` equal to the build time, or a date changed to look fresh |
| A language version exists | `hreflang` reciprocal, self-referencing and equal in head and sitemap (rules of `check:seo`) | A partial set of versions |

## 4. What this reference does NOT establish

- Crawl-rate or indexing-time promises: none of the sources gives one, and IndexNow's 200 only
  says the URL was received.
- That Google uses IndexNow: the IndexNow page lists no Google participation and none is claimed.
- Behaviour of `_redirects` on the production edge after a deploy: verified only on a local Worker.
- `Refresh` HTTP headers, `Link: rel=canonical` headers and pagination: not read, not claimed.
