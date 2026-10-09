---
name: fireskill-specialist-web-performance
description: Deliver public Nuxfire pages as light as Astro pages — ship no JavaScript where nothing is interactive, hydrate only what needs it, size and compress every image, and keep every page inside a measured budget. Covers Core Web Vitals (LCP, INP, CLS), byte budgets in `perf-budgets.json`, the `bun run check:perf` gate, `routeRules` `noScripts`, lazy hydration, `@nuxt/image`, fonts, third-party scripts and Cloudflare delivery (compression, cache, trailing slash). Use when touching a landing page, `apps/web/app/**`, `apps/web/public/**`, `nuxt.config.ts` route rules, images, fonts, scripts, or when a page feels slow.
---

# Web Performance in Nuxfire (browser delivery)

"As Astro" means four behaviours, not a framework swap (SPEC-0002 DEC-004): no JavaScript on a page
that has no interactivity, hydrate only the components that need it and only when they need it,
images that carry their dimensions and a modern format, and defaults enforced by tooling. This
specialist makes those four measurable in a Nuxt 4 app served by Cloudflare Workers.

## When to Use

- Trigger when creating or changing a public page or a landing component, an image or a font,
  a script (`@nuxt/scripts`, analytics, chat, embeds), a `routeRules` entry, or `perf-budgets.json`.
- Trigger when a page is reported slow, when a budget fails, or before adding a dependency that
  ships to the browser.
- Do not trigger for back-end latency, database queries or capacity: that is
  `$fireskill-specialist-performance-engineering` (general method, profiling, load) and
  `$fireskill-specialist-postgres`.
- Combine with `$fireskill-specialist-nuxt` (`routeRules`, hydration), `$fireskill-specialist-nuxt-ui`
  (components), `$fireskill-specialist-seo` (LCP and redirects are also search signals),
  `$fireskill-specialist-cloudflare-workers` and `$fireskill-specialist-sst` (delivery headers,
  `assets.htmlHandling`).

## Workflow

1. Read [references/nuxfire-web-delivery.md](references/nuxfire-web-delivery.md) for what exists and
   the measured baseline, and [references/web-vitals-and-budgets.md](references/web-vitals-and-budgets.md)
   for the sourced facts, and [references/images-and-third-party.md](references/images-and-third-party.md)
   when the page carries images or outside code. Never state a number that none of them contains.
2. **Measure before touching code.** Build with the real `SITE_URL` (`bun run --cwd apps/web build`),
   then `bun run check:perf` for bytes and structure. For timings (LCP, INP, CLS) follow the protocol
   in the delivery reference; a lab run is evidence, field data (CrUX, Search Console) is the truth.
3. Declare what the page is in `perf-budgets.json`: its route, whether it may ship JavaScript
   (`js: none | allowed`), what its LCP element is (`text` or an image), and the hosts it may load from.
4. Decide interactivity component by component (the recipe is in
   [references/zero-js-recipe.md](references/zero-js-recipe.md)): static HTML and CSS first; a
   native element (`<details>`, an anchor, `:target`) before a component; lazy hydration
   (`defineLazyHydrationComponent`) before eager; a page with none may be declared `js: none`.
5. Change one thing at a time and re-measure. Lower the budget or the baseline in the same change
   when the number drops (the gate fails a stale baseline).
6. Validate (below) before saying the work is done.

## Core Rules

- **Budgets are project decisions** (`perf-budgets.json`, each with `source` and `since`). The only
  externally sourced numbers are the vitals thresholds: LCP 2.5 s, INP 200 ms, CLS 0.1 at the 75th
  percentile. Do not import a byte number from an article as if it were a requirement.
- **A baseline only shrinks.** An entry names the spec or backlog item that removes it
  (`removedBy`); a regression fails, and so does a value that dropped without lowering the entry.
- **Bytes and structure are a gate; timings are evidence.** `check:perf` never claims an LCP.
- Every `<img>` has numeric `width` and `height` (layout shift); the LCP image is eager and has
  `fetchpriority="high"`; no other image gets `high`; below-the-fold images are lazy.
- A raster image is at most the `images.maxBytes` of the configuration; use a modern format
  (`webp`, `avif`) and the size it is shown at. A 28 px avatar is not a 600 KB photograph.
- A page loads from its own origin. A third-party host is an entry in that page's `thirdParty`
  list in `perf-budgets.json` (rule `third-party-origin`), and the reason goes in the spec or
  the pull request that adds it, never a default.
- A hashed asset under `/_nuxt/` is served `immutable` for a year; HTML is revalidated. Do not
  change the cache headers without measuring (`check:seo --live` audits them).
- The canonical URL of a page answers 200, not a redirect: every hop costs time before the first
  byte (web.dev, LCP) and Bing asks for 301 on a move. The `Web` Worker drops the trailing slash.
- No new runtime dependency to reach a budget. No script that the page does not need to be
  understood, only to be decorated.

## Antipatterns

- Optimising from "this feels slow" without a measured baseline, or promising an LCP from a bytes
  gate.
- `loading="lazy"` on the LCP image; `fetchpriority="high"` on many images.
- Hydrating a whole page for one interactive widget; a component library import for a static block.
- Turning on `noScripts` for a route without clicking every control of the shell first: on the
  measured build it removed the language switch and the color mode toggle, and it still left two inline
  scripts, so the route would not even satisfy `js: none` (`references/zero-js-recipe.md`).
- A font that needs a request per weight and per subset for body text that a system font would carry.
- Fixing a budget by raising it, or by adding an allowance without an owner.
- A cache or a CDN rule added "for speed" without a header measurement before and after.
- Measuring only the fast path: a warm cache, a fast machine, the lab tool's default only.

## Validation

- `bun run test` — includes `scripts/perf-rules.test.ts`.
- `SITE_URL=https://<domain> bun run --cwd apps/web build`, then `bun run check:perf`: exit 0.
- `bun run check:seo -- --live <origin>` against the origin that serves the build.
- For a timing claim: the lab protocol of the delivery reference, the tool and its settings written
  next to the number, and CrUX/Search Console for the field truth.
- Look at the page: a page declared `js: none` is loaded with JavaScript on and must still be usable.

## Related Skills

- `$fireskill-specialist-performance-engineering` — general method, profiling, load testing.
- `$fireskill-specialist-seo` — what search engines read (redirects, canonical, sitemaps).
- `$fireskill-specialist-nuxt` and `$fireskill-specialist-nuxt-ui` — pages, components, hydration.
- `$fireskill-specialist-cloudflare-workers` and `$fireskill-specialist-sst` — delivery and infra.
- `$fireskill-specialist-web-accessibility` — a page without JavaScript must stay operable.
- `$fireskill-specialist-copywriting` — the words above the fold are part of the LCP.
