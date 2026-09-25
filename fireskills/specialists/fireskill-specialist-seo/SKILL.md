---
name: fireskill-specialist-seo
description: What Google and Bing require of any Nuxfire page so it can be crawled, indexed, shown and cited — HTTP status and redirects (301/308, never a meta refresh), one canonical URL, sitemap and `lastmod` with date and time, IndexNow, robots directives, structured data chosen by page type and never dishonest, and the `bun run check:seo` gate with its `--live` audit. Use when touching a page's head, `robots`, sitemap, `_redirects`, `assets.htmlHandling`, JSON-LD, `nuxt.config.ts` route rules or anything that changes a URL.
---

# Search Engine Requirements (Google, Bing, schema.org) for Nuxfire

This specialist holds what search engines ask of **any** page and turns it into checks. How the
blog and the docs are authored (frontmatter, translations, covers) is
`$fireskill-specialist-content-seo`; the two name each other so a rule lives in one place.

## When to Use

- Trigger when a URL is created, renamed, removed or redirected; when a route rule, a `_redirects`
  line, a sitemap option or `htmlHandling` changes; when a page gets or loses a `<title>`,
  description, canonical, `robots` or structured data; when a page is added to the landing.
- Trigger before a release that changes what search engines fetch, and when the live site
  answers something other than 200 for a URL that the sitemap lists.
- Do not trigger for the frontmatter or translation contract of a post: that is
  `$fireskill-specialist-content-seo`. Do not trigger for page speed as such: that is
  `$fireskill-specialist-web-performance`.
- Combine with `$fireskill-specialist-nuxt` (route rules, head), `$fireskill-specialist-cloudflare-workers`
  and `$fireskill-specialist-sst` (`_redirects`, `assets.htmlHandling`, deploy),
  `$fireskill-specialist-copywriting` (titles, descriptions and visible claims that structured
  data must match) and `$fireskill-specialist-web-accessibility`.

## Workflow

1. Read [references/nuxfire-seo-delivery.md](references/nuxfire-seo-delivery.md) for what exists
   in the repository, then the reference of the question at hand:
   [indexing-and-http.md](references/indexing-and-http.md) (status, redirects, canonical,
   sitemap, robots, IndexNow), [structured-data.md](references/structured-data.md) (which markup,
   for which page) and [search-engine-requirements.md](references/search-engine-requirements.md)
   (the Google and Bing matrix). Never state a rule that none of them contains.
2. Decide what the page **is** (home, product, pricing, article, doc, legal, redirect source) and
   what it should say to a crawler: indexable or not, its one canonical URL, its language versions.
3. Change the head, the route rules or `apps/web/public/_redirects` in code. A moved URL is a
   line in `_redirects` with an explicit `301`; never a `redirect` route rule (it prerenders a
   meta refresh page) and never a delayed refresh.
4. Structured data: only a type whose properties the page shows to the visitor, chosen with
   `structured-data.md`; no rating, review or FAQ markup without the evidence its rule names.
5. Build with the real `SITE_URL`, run `bun run check:seo`, then audit a running copy with
   `--live` (below). Only after the owner authorizes a deploy: audit production the same way and,
   when URLs were added or changed, `bun run indexnow` (dry run first).
6. Validate (below) before saying the work is done.

## Core Rules

- **One URL, one answer.** Every URL the sitemap lists answers 200 in a single request. A moved
  URL answers 301 or 308 to a page that answers 200 (one hop). The `Web` Worker serves
  `drop-trailing-slash`, so `/blog` is the canonical and `/blog/` redirects to it.
- **Permanent means 301 or 308**; 302 and 307 are temporary and leave the old URL in results.
  Bing accepts 302 only for a change shorter than two days.
- **The canonical URL is absolute, in the `<head>`, and equal in the head, the sitemap and the
  Open Graph URL.** Redirects are the strongest signal, `rel="canonical"` strong, the sitemap weak.
- **The sitemap lists canonical, indexable URLs only**, with a `lastmod` that is the real
  modification time of the content, as ISO 8601 with date and time (Bing). It never lists a
  redirected, noindex or 404 URL. `priority` and `changefreq` carry no signal and are not written.
- **`robots.txt` controls crawling, not indexing.** `noindex` needs the page to be crawlable.
  Never `nosnippet`, `noarchive` or `max-snippet:0` on a page meant to be shown or cited.
- **Structured data describes what the visitor sees.** JSON-LD, the most specific type, all
  required properties, linked with `@id`. No `FAQPage` for Google (discontinued 2026-05-07), no
  `aggregateRating` or `review` without real, attributable reviews, no markup for hidden content.
- **A title is unique and says what the page is** ("Demo SaaS" is a placeholder, not a title).
- **IndexNow is outward-facing**: default to the dry run; `--submit` needs the owner's
  authorization for that run and the key file in `apps/web/public`.
- **Facts about Google or Bing come from their own pages**, with the date read. A blog post
  about SEO is not a source.

## Antipatterns

- Fixing an indexing problem with `robots.txt` or with a canonical tag when the URL should
  answer a redirect (or the reverse).
- A `redirect` route rule, a `<meta http-equiv="refresh">` page or a JavaScript redirect for a
  moved URL: the response is a 200 that says "go elsewhere".
- Two canonicals for one page (head says one URL, sitemap another).
- A sitemap `lastmod` set to the build time, or a date changed to look fresh.
- Structured data added to win a rich result the page cannot honestly earn (rating with no
  reviews, FAQ, a product the page does not sell).
- Hiding text or adding instructions aimed at a search engine or an AI assistant.
- Declaring "indexed" or "ranks" from a local build: only Search Console and Bing Webmaster
  Tools, after a deploy, can say it.

## Validation

- `bun run test` (includes `scripts/seo-rules.test.ts`, `seo-live.test.ts`, `redirects.test.ts`,
  `indexnow.test.ts`).
- `SITE_URL=https://<domain> bun run --cwd apps/web build`, then `bun run check:seo`: exit 0.
- Live audit of a running copy:
  `bun run check:seo -- --live http://127.0.0.1:8787 --sitemap-origin https://<domain>` (a local
  `wrangler dev --local` with `html_handling: drop-trailing-slash`), exit 0.
- Rich Results Test or Search Console URL Inspection for the structured data of any new type
  (after the deploy; the local gate only checks the rules of `structured-data.md`).
- `bun run indexnow -- --origin https://<domain>` (dry run) shows the payload before any submit.

## Related Skills

- `$fireskill-specialist-content-seo` — how posts and docs are authored, translated and gated.
- `$fireskill-specialist-web-performance` — the delivery cost of the same pages.
- `$fireskill-specialist-copywriting` — the words the head and the structured data must match.
- `$fireskill-specialist-nuxt`, `$fireskill-specialist-cloudflare-workers`, `$fireskill-specialist-sst`.
- `$fireskill-specialist-web-accessibility` — headings, landmarks and `lang`.
