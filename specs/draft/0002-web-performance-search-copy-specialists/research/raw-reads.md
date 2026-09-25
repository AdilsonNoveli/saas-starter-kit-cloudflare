# Sources re-read RAW while writing the specialist references (tasks T046, T047, T051)

Every page below was opened in the browser pane on 2026-09-25 and its text read (mode RAW), in
English (`?hl=en` where the site translates). Statements are paraphrases; nothing is copied.
This file supersedes the SUM rows of `google-search.md`, `web-dev.md`, `astro-reference.md`,
`schema-org.md`, `copy-sources.md` and `bing-webmaster.md` for the facts it repeats. Where a row
here corrects an earlier note, the correction is written in the row.

## Google Search Central

| Id | Statement (paraphrased) | URL |
| --- | --- | --- |
| R1 | Structured data guidelines: JSON-LD is the recommended format (Microdata and RDFa are also accepted); structured data pages must not be blocked by robots.txt or noindex; do not mark up content that readers of the page cannot see; do not mark up irrelevant or misleading content such as fake reviews; do not impersonate or misrepresent ownership or purpose; specify all required properties (an item missing one is not eligible for rich results); use the most specific schema.org type; put the markup on the page it describes; link related items with `@id`. A structured-data problem can cause a manual action, which removes rich-result eligibility and does not change ordinary web ranking. Google does not guarantee that valid markup shows. Page last updated 2026-07-10. | https://developers.google.com/search/docs/appearance/structured-data/sd-policies |
| R2 | `SoftwareApplication` rich result: required properties are `name`, `offers.price` (0 when free; add `priceCurrency` when above 0) and one of `aggregateRating` or `review`; recommended `applicationCategory` (from a fixed list that includes `BusinessApplication` and `DeveloperApplication`) and `operatingSystem`; Google also supports `MobileApplication` and `WebApplication`. Page last updated 2026-09-08. | https://developers.google.com/search/docs/appearance/structured-data/software-app |
| R3 | `Organization`: no required properties, add as many recommended ones as apply; the markup belongs on the home page (the page text says "home page"); properties such as the logo can influence what is shown in results and in the knowledge panel. | https://developers.google.com/search/docs/appearance/structured-data/organization |
| R4 | FAQ rich result: the deprecation notice was added on 2026-05-08 ("will no longer appear in Google Search starting May 7, 2026") and the documentation was removed later (entry "Removing documentation for the FAQ rich result feature", before the 2026-06-12 entry). The request for the `faqpage` page now redirects to this changelog. **Correction of `google-search.md` G6**, which dated the notice 2025-05-08. | https://developers.google.com/search/updates |
| R5 | Robots meta tag and `X-Robots-Tag`: the same rules work in both; `noindex` keeps a page out of results, `nosnippet` also keeps content out of AI Overviews and AI Mode as a direct input, `max-snippet`, `max-image-preview` (`none`, `standard`, `large`) and `unavailable_after` exist; rules without a user agent apply to all crawlers; with conflicting rules the more restrictive wins; the tag is read only if the crawler may fetch the page; for non-HTML files use the header. | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag |
| R6 | Redirects: permanent redirects (301, 308, instant meta refresh of 0 seconds, HTTP refresh of 0 seconds, JavaScript location, crypto redirect) make the target the canonical signal and the target is shown in results; temporary redirects (302, 303, 307, delayed meta refresh, delayed HTTP refresh) keep the source page shown. Server-side redirects are the most reliably interpreted; JavaScript redirects only when neither a server-side nor a meta refresh redirect is possible. | https://developers.google.com/search/docs/crawling-indexing/301-redirects |
| R7 | Canonicalisation signals from strongest: redirects, `rel="canonical"`, sitemap inclusion (weak). Do not name different canonicals for one page through different methods (for example one in the sitemap and another in `rel="canonical"`); use absolute URLs in `rel="canonical"`; the element is only accepted in the `<head>`; do not use robots.txt for canonicalisation. | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls |
| R8 | Sitemaps: a single sitemap holds at most 50 MB uncompressed or 50,000 URLs; the file is UTF-8; URLs are absolute; list the URLs that should appear in results; Google ignores `<priority>` and `<changefreq>`; Google uses `<lastmod>` when it is consistently and verifiably accurate; a `Sitemap:` line in robots.txt is enough for discovery. | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap |
| R9 | Core Web Vitals in Search: LCP within the first 2.5 seconds, INP under 200 milliseconds, CLS under 0.1; Google recommends achieving good values and says they align with what its core ranking systems reward; the Search Console report shows how pages perform. Page last updated 2025-12-10. | https://developers.google.com/search/docs/appearance/core-web-vitals |
| R10 | Snippets are created automatically from page content, and the meta description may be used when it describes the page better; Google shows different snippets for different queries. | https://developers.google.com/search/docs/appearance/snippet |
| R11 | Helpful content: the page lists self-assessment questions (original information, a descriptive non-exaggerated title, verifiable facts, first-hand experience) and warning signs of search-engine-first content (mass production on many topics, heavy automation, summarising others without added value, a target word count, changing dates to look fresh, adding or removing content only to seem fresh). "Trust is most important" among experience, expertise, authoritativeness and trust; E-E-A-T is not itself a ranking factor. | https://developers.google.com/search/docs/fundamentals/creating-helpful-content |

## Bing and IndexNow

| Id | Statement (paraphrased) | URL |
| --- | --- | --- |
| R12 | Bing blog, 2025-07-31: a sitemap file holds up to 50,000 URLs and an index up to 50,000 sitemaps; use ISO 8601 for `lastmod` including date and time; `lastmod` must be the real modification time of the page content, not the generation time of the sitemap; `changefreq` and `priority` are ignored; reference the sitemap in robots.txt or submit it in Bing Webmaster Tools; Bing re-reads a submitted sitemap at least once a day; combine sitemaps with IndexNow; no tool guarantees when or how content appears in AI answers. | https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/ |
| R13 | IndexNow documentation: one URL by GET, up to 10,000 URLs by POST JSON with `host`, `key`, optional `keyLocation`, `urlList`; the key is 8 to 128 characters from `a-z`, `A-Z`, `0-9` and `-`; ownership is proven by a UTF-8 text file `{key}.txt` at the site root (Option 1, "strongly recommended") or by a `keyLocation` (Option 2, which only covers URLs under that path); response codes 200, 202, 400, 403, 422, 429; a 200 only means the search engine received the URLs; a search engine that adopts the protocol shares submissions with the other participants. | https://www.indexnow.org/documentation |

## web.dev and Astro

| Id | Statement (paraphrased) | URL |
| --- | --- | --- |
| R14 | Astro islands page: the page renders to static HTML with small islands of JavaScript where interactivity is needed; by default every UI component renders to HTML and CSS with client-side JavaScript stripped; an island needs an explicit `client:*` directive; `client:idle` loads when the browser is idle and `client:visible` when the component enters the viewport; a single-page application hydrates the whole site as one application and lacks selective hydration. | https://docs.astro.build/en/concepts/islands/ |
| R15 | Astro images guide: the `<Image />` component sets `width` and `height` of the optimised image to avoid layout shift, adds `loading="lazy"` and `decoding="async"`, and requires `alt`; `<Picture />` produces `avif` and `webp` sources with a fallback image. | https://docs.astro.build/en/guides/images/ |

## Copyhackers

| Id | Statement (paraphrased) | URL |
| --- | --- | --- |
| R16 | "What is Conversion Copywriting?" (updated 2023-06-08, live tutorial with transcript): conversion copy moves the reader to "yes" with voice-of-customer data, frameworks, formulas and persuasion techniques; the process has three parts, research and discovery, writing / wireframing / editing, validation and experimentation, and the parts are never the same size in a project; you start with research because voice of customer is where the copy comes from ("you can't write great copy without it"); editing is the last step before validation; validation can be a preference or clarity test as well as an A/B test. | https://copyhackers.com/conversion-copywriting-defined/ |

## Cloudflare Workers Static Assets

| Id | Statement (paraphrased) | URL |
| --- | --- | --- |
| R17 | `_redirects` (no extension, in the static assets directory, copied from `public/` by a framework build): one redirect per line as `[source] [destination] [code?]` with **302 as the default code**; supported codes 301, 302, 303, 307, 308; splats and placeholders are supported, query-parameter matching, redirects by country, language or cookie and domain-level redirects are not; at most 2,000 static and 100 dynamic redirects; the first matching line wins; redirects are applied to static asset responses and **not** to requests served by Worker code; redirects run before headers. | https://developers.cloudflare.com/workers/static-assets/redirects/ |
| R18 | Static site generation on Workers: `assets.html_handling` defaults to `auto-trailing-slash` (single files such as `foo.html` are served without a trailing slash, folder index files such as `foo/index.html` with one); `force-trailing-slash` and `drop-trailing-slash` are the alternatives; `assets.not_found_handling: "404-page"` serves the nearest `404.html` with status 404; with a Worker script, `not_found_handling` and a compatibility date of 2025-04-01 or later, navigation requests are served from assets without invoking the Worker; `assets.run_worker_first` runs the Worker before assets. | https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/ |

## schema.org (read RAW 2026-09-25; supersedes the SUM rows of `schema-org.md`)

| Id | Statement (paraphrased) | URL |
| --- | --- | --- |
| R19 | `SoftwareApplication` (Thing > CreativeWork > SoftwareApplication) has, among others, `applicationCategory`, `applicationSubCategory`, `operatingSystem`, `softwareVersion`, `downloadUrl`, `featureList`, `license`, `screenshot`, `releaseNotes`, `softwareRequirements` and `offers`. | https://schema.org/SoftwareApplication |
| R20 | `Offer` (Thing > Intangible > Offer) has `price` (with `priceCurrency` in ISO 4217), `priceValidUntil` (the date after which the price is no longer available), `availability`, `availabilityStarts`, `availabilityEnds`, `validFrom`, `itemCondition` and `url`. | https://schema.org/Offer |
| R21 | `BreadcrumbList` (Thing > Intangible > ItemList > BreadcrumbList) is an `ItemList` of linked web pages, typically with a URL and a name each and ending with the current page; `position` reconstructs the order, integers starting at 1 for the top of the trail. | https://schema.org/BreadcrumbList |

## Nielsen Norman Group, W3C, Copyblogger, Copyhackers (read RAW 2026-09-25)

| Id | Statement (paraphrased) | URL |
| --- | --- | --- |
| R22 | Error-message guidelines (2023-05-14): visibility (close to the source, noticeable, redundant and accessible indicators, never colour or animation alone, design by impact, do not show errors prematurely) and communication (human-readable, no jargon, hide obscure codes, precise description instead of "An error occurred"). | https://www.nngroup.com/articles/error-message-guidelines/ |
| R23 | WCAG 2.2 SC 3.3.3 Error Suggestion (Level AA): if an input error is automatically detected and suggestions are known, provide them unless that jeopardises security or the purpose of the content. | https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html |
| R24 | Copyblogger headline framework: what does the content deliver, what is the reader's goal, then the element of intrigue (the least important); clarity over cleverness; clickbait is false promises to earn clicks; a curiosity gap must still show the value. | https://copyblogger.com/how-to-write-headlines-that-work/ |
| R25 | Copyhackers, "How to be specific" (2017-03-21 live tutorial): the specificity sweep is one of seven primary editing sweeps; it engages the reader's imagination with concrete detail, one topic, unpacked summaries, and does not make the reader connect the dots. | https://copyhackers.com/how-to-be-specific/ |
| R26 | Copyhackers, three principles (SweatBlock case study): messaging hierarchy, being specific, calls to value versus calls to action; the 10/90 layout rule and the ordered questions; the 108 % revenue lift is the author's case study. | https://copyhackers.com/2016/06/copywriting-principles-sweatblock/ |
