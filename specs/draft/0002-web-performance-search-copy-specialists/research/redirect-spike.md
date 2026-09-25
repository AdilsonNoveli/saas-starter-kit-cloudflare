# Redirect and trailing-slash spike (task T039)

Run on 2026-09-25 with `wrangler` 4.140.0 (`wrangler dev --local`) serving a copy of the build of
`apps/web` (`SITE_URL=https://nuxfire.com bun run build`), audited by
`bun run check:seo -- --live http://127.0.0.1:8787 --sitemap-origin https://nuxfire.com`. Mode CMD.

The Worker is `apps/web/.output/server/index.mjs`, the assets are a copy of `.output/public`, and
the only thing that changes between variants is the `assets` block of a scratch `wrangler.jsonc`
and the presence of a `_redirects` file in the assets directory.

| Variant | `assets.html_handling` | `_redirects` | Sitemap URLs (97) | Legacy URLs (9) |
| --- | --- | --- | --- | --- |
| A | `auto-trailing-slash` (Cloudflare default, what SST deploys today) | none | 96 answer 307 to the trailing-slash URL, 1 answers 200 | 9 fail: 307, then a 200 meta-refresh page |
| B | `auto-trailing-slash` | 9 rules, all `301` | 96 answer 307 (unchanged) | 9 fail: the first hop is a 301, but its target `/docs/saas-starter-kit` answers 307 to `/docs/saas-starter-kit/`, so the redirect is not one hop |
| C | `drop-trailing-slash` | 9 rules, all `301` | 97 answer 200, no redirect | 9 pass: one 301, then a 200 |

## What it shows

1. **Variant A reproduces production.** `curl -I` on `/blog` answers `307 Temporary Redirect` with
   `Location: /blog/`, the same as `https://nuxfire.com/blog` on 2026-09-25 (baseline M10). The
   diagnosis of D4 is therefore confirmed in a controlled setting, not only by observation.
2. **`_redirects` works as documented** (variant B): `/docs/pro` answers `301 Moved Permanently`
   with `Location: /docs/saas-starter-kit`, and wrangler reports "Parsed 9 valid redirect rules".
3. **Redirects alone are not enough.** With the default slash handling, the target of a redirect
   is itself redirected, so the chain the audit rejects (`live-legacy-redirect`) remains.
4. **`drop-trailing-slash` is the missing lever** (variant C). With it, `/blog` answers 200 and
   `/blog/` answers a 307 to `/blog`; every sitemap URL answers 200 in one request.

## Decision

`apps/web/public/_redirects` with `301` for every moved URL, `assets.htmlHandling =
"drop-trailing-slash"` for the `Web` Worker only (`infra/web.ts` through the new `htmlHandling`
option of `deployWorker`), no `redirect` route rules in `apps/web/nuxt.config.ts` (they prerender
meta-refresh pages), and `nitro.prerender.ignore` for the legacy URLs so no page is generated for
them.

## Limits

- `wrangler dev --local` is not Cloudflare's edge. Production behaviour after a deploy is
  verified by task T041, which needs the owner's authorization (Q-05).
- `assets.htmlHandling` is marked `@internal` in SST's type definition
  (`.sst/platform/src/components/cloudflare/worker.ts`); it is passed through to the Cloudflare
  provider (`htmlHandling: assets.htmlHandling`, same file, line 659) and is documented for
  Workers Static Assets. A future SST release may change it: `infra/web.ts` names the reason.
- Only the `Web` Worker was tested. `apps/app` (the dashboard) keeps its default handling.

## Verification on the final build (2026-09-25, mode CMD)

`SITE_URL=https://nuxfire.com bun run build` in `apps/web` (exit 0), then `wrangler dev --local` with
`html_handling: drop-trailing-slash` over the real `.output/public` (the file that `nuxt build` copies).

- `bun run check:seo`, `bun run check:perf`, `bun run check:copy` on the build: all exit 0.
- `bun run check:seo -- --live http://127.0.0.1:8787 --sitemap-origin https://nuxfire.com`:
  97 sitemap URLs and 10 legacy URLs audited, exit 0.
- Found on that build: `@nuxtjs/sitemap` writes `.output/public/sitemap.xml/index.html`, a
  `<meta http-equiv="refresh" content="0; url=/sitemap_index.xml">` stub (module source
  `node_modules/@nuxtjs/sitemap/dist/module.mjs`, line 870: a `redirect` route rule). A crawler that
  asks for `/sitemap.xml` would read HTML, not a sitemap. Fixed with a tenth rule in
  `apps/web/public/_redirects` (`/sitemap.xml /sitemap_index.xml 301`); the Worker then answers
  `301` with `Location: /sitemap_index.xml`.
