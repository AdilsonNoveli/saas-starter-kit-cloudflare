# Nuxfire Web Delivery (what exists, measured 2026-09-25)

Verified against Nuxt 4.5.2 (the version in `node_modules/nuxt/package.json` on that day) with
Nitro's `cloudflare-module` preset. `scripts/specialist-evidence.test.ts` compares the version stated
here with the installed one and fails if they differ: when Nuxt is upgraded, re-check every row that
says `CODE` and update this sentence.

## 1. What exists

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| E1 | The public site is `apps/web`, built with `nuxt build` and Nitro preset `cloudflare-module`; the app depends on `@nuxt/image`, `@nuxt/scripts`, `@nuxt/fonts` and `@nuxt/ui`. | apps/web/nuxt.config.ts, apps/web/package.json | 2026-09-25 | CODE |
| E2 | Routes that are prerendered are static files in `.output/public`; the Worker in `.output/server/index.mjs` answers what is not. | apps/web/.output after `bun run build` | 2026-09-25 | CMD |
| E3 | The build writes `.output/public/_headers`: `/_nuxt/*` and `/_fonts/*` get `cache-control: public, max-age=31536000, immutable`, `/_nuxt/*` also `X-Robots-Tag: noindex`. HTML is not listed and is revalidated. | apps/web/.output/public/_headers | 2026-09-25 | CMD |
| E4 | `deployWorker` accepts `htmlHandling` and the `Web` Worker passes `"drop-trailing-slash"`, so the canonical URL of a page has no trailing slash and answers 200. The dashboard app keeps the default. | infra/web.ts, infra/utils/nuxt.ts | 2026-09-25 | CODE |
| E5 | Moved URLs are lines of `apps/web/public/_redirects`, each with an explicit `301`; the build copies the file to `.output/public/`. | apps/web/public/_redirects | 2026-09-25 | CODE |
| E6 | The gate `bun run check:perf` reads `apps/web/.output/public` and `perf-budgets.json`; `bun run check:seo` reads the same build; `--live <origin>` audits a running server. | scripts/check-perf.ts, scripts/check-seo.ts | 2026-09-25 | CODE |
| E7 | `perf-budgets.json` declares `/`, `/pt-br` and `/es` as `js: allowed` with a text LCP, `images.maxBytes` 200,000 and a dated baseline per route and metric, each owned by `BACKLOG-landing-refactor`. Allowances list 7 images over the limit (`img-max-bytes`) and 35 `img-dimensions` findings, all owned by a backlog item. | perf-budgets.json | 2026-09-25 | CODE |
| E8 | Baseline of the home page in the gate's units (brotli quality 9): html 23,429, js 280,276, css 33,150, images 3,447,493 bytes, 64 requests. | perf-budgets.json | 2026-09-25 | CODE |
| E9 | Lab timing of the built home page (mobile, applied throttling): LCP 4.2 to 4.6 s; blog post 2.8 to 3.0 s; the Astro docs page under the same protocol 2.1 to 2.4 s. | specs/draft/0002-web-performance-search-copy-specialists/research/lab-measurements.md | 2026-09-25 | CMD |
| E10 | A page's shell (color mode toggle, language menus, header menu) needs JavaScript; `noScripts` on a route removes it. | specs/draft/0002-web-performance-search-copy-specialists/research/zero-js-spike.md | 2026-09-25 | CMD |
| E11 | The home page loads `sqlite3.wasm` (864,916 bytes) and the Nuxt Content SQL dumps (139,103 and 132,573 bytes) at first load, and six avatar JPEGs of 447 to 621 KB shown at 28 to 32 px. | specs/draft/0002-web-performance-search-copy-specialists/research/lab-measurements.md | 2026-09-25 | CMD |
| E12 | `apps/web/public/crisp.js` is a chat loader template (`CRISP_WEBSITE_ID = "NEW_ID"`, loads `https://client.crisp.chat/l.js`); no source file and no built page references it, so it is not loaded. If it is ever wired in, it becomes a third party that the page must list in `thirdParty`. | apps/web/public/crisp.js and a search of apps/web/nuxt.config.ts, apps/web/app and the built home page | 2026-09-25 | CMD |
| E13 | What Nuxt 4.5.2 offers to send less JavaScript: the route rule and feature `noScripts`, and `defineLazyHydrationComponent(strategy, loader)` with the strategies `visible`, `idle`, `interaction`, `mediaQuery`, `if`, `time` and `never`. Neither is used by any page of `apps/web` today. | node_modules/@nuxt/schema/dist/index.d.mts, node_modules/nuxt/dist/app/composables/lazy-hydration.d.ts and a search of apps/web/app | 2026-09-25 | CODE |
| E14 | Nuxt Icon runs with `serverBundle` `remote` on the Cloudflare preset and fetches icons from Iconify at prerender time with a 1,500 ms timeout. Two builds on 2026-09-25 logged 26 or more `loading icon ... timed out` warnings; in the first, 24 of the 37 icons of `/` were not inlined in the HTML (the inline icon CSS was 7,122 characters against 22,551 in the earlier build), in the second all 37 were. The HTML size of `/` therefore varies with the network by up to 6 %, and an icon that is not inlined is fetched at runtime. Not changed here: the module chooses `remote` to keep the Worker small. | specs/draft/0002-web-performance-search-copy-specialists/research/lab-measurements.md and node_modules/@nuxt/icon/dist/module.mjs | 2026-09-25 | CMD |

## 2. Commands

```bash
SITE_URL=https://nuxfire.com bun run --cwd apps/web build   # the domain matters: canonicals and the sitemap use it
bun run check:perf                                         # bytes and structure; exit 1 on a violation
bun run check:perf -- --print-baseline                     # measured values as baseline entries, to lower them
bun run check:seo                                          # same build, search rules
bun run check:seo -- --live http://127.0.0.1:8787 --sitemap-origin https://nuxfire.com
```

`--live` against a local `wrangler dev --local` needs a scratch `wrangler.jsonc` whose `assets`
block points at `.output/public` with `"html_handling": "drop-trailing-slash"`; kill leftover
`workerd` processes afterwards (on Windows they keep `.output` locked and break the next build).

## 3. Working rules for this codebase

- Lower a baseline in the same change that lowers the number: `check:perf` fails a stale one
  (more than 2 % below its entry).
- Remove an allowance in the change that removes its cause; a stale allowance fails.
- Image work is owned by `specs/backlog/0003-web-image-dimensions.md`; landing weight by
  `specs/backlog/0001-landing-refactor.md`. A new exception needs its own owner that exists.
- Before claiming a page is fast, state the tool, the version, the throttling, the runs and the
  number, or say it was not measured.

## 4. What Does NOT Exist

- **No field data** for nuxfire.com in the repository (no CrUX export, no Search Console data, no
  RUM). "Passes Core Web Vitals" cannot be said about the site.
- **No INP measurement** of any page.
- **No `image:` configuration** in `apps/web/nuxt.config.ts`, no resized or modern-format variants of the
  six avatar photos, and no `NuxtImg` on the landing avatars.
- **No page declared `js: none`**: the shell needs scripts (E10).
- **No lazy hydration on the landing sections**: this is what `BACKLOG-landing-refactor` is for.
- **No third-party script on any built page** (`third-party-origin` reports none); there is no
  consent banner because there is nothing to consent to.
- **No performance gate in CI**: the repository has no `.github/workflows` directory; the three
  gates run locally and in the validation of a spec, and wiring them into a pipeline was not done here.
- **No production measurement after the redirect and slash changes**: they are verified on a local
  Worker; the deploy needs the owner's authorization.
