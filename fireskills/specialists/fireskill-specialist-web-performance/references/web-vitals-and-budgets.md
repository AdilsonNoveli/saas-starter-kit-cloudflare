# Web Vitals, Lab Measurement and Budgets

What the published sources say about the three vitals and about budgets, and how Nuxfire turns
that into a gate. Every row states where it came from and how it was read; a row is only a rule
after it is cited here. Statements are paraphrases.

Modes: `RAW` the page text was read in full; `CMD` a command was run and its output read; `CODE`
read from the source tree or an installed package; `DECISION` a project decision recorded in a
spec.

## 1. What the vitals are

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| V1 | Good thresholds, met at the 75th percentile of page loads and separately for mobile and desktop: LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less. Lab data catches regressions; only field data records the distribution of real visits. | https://web.dev/articles/vitals | 2026-09-25 | RAW |
| V2 | Google Search states the same three targets (LCP within 2.5 s, INP under 200 ms, CLS under 0.1), recommends good values, says they align with what its ranking systems reward, and points to the Search Console report. It gives no weight. | https://developers.google.com/search/docs/appearance/core-web-vitals | 2026-09-25 | RAW |
| V3 | LCP is split into four parts: time to first byte, resource load delay, resource load duration and element render delay. Levers: make the LCP resource discoverable in the initial HTML, `fetchpriority="high"` on an LCP image, never `loading="lazy"` on it, preload resources referenced only from CSS or JavaScript, serve critical resources from the same origin, use modern formats, remove render-blocking CSS. | https://web.dev/articles/optimize-lcp | 2026-09-25 | RAW |
| V4 | INP covers every click, tap and key press of the visit and is measured from the input to the next paint (good 200 ms or less, poor above 500 ms). It replaced FID. Levers: long tasks, main-thread work, JavaScript execution and hydration cost, DOM size. | https://web.dev/articles/inp | 2026-09-25 | RAW |

## 2. Budgets

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| B1 | A performance budget is a set of limits on metrics: quantity-based (bytes, requests, scripts, fonts), milestone timings, rule-based scores. It is enforced in the build. The example baseline of that article is the article's own starting point, not a current Google requirement. | https://web.dev/articles/performance-budgets-101 | 2026-09-25 | RAW |
| B2 | Nuxfire's byte budgets are project decisions with a measured baseline as evidence. The only externally sourced numbers are V1 and V2. | specs/draft/0002-web-performance-search-copy-specialists/spec.md DEC-005 | 2026-09-25 | DECISION |
| B3 | `check:perf` measures bytes and structure (deterministic) and never states an LCP, INP or CLS; those are measured by the protocol of section 4 and recorded as evidence. | specs/draft/0002-web-performance-search-copy-specialists/spec.md DEC-009 | 2026-09-25 | DECISION |
| B4 | A baseline is explicit, dated, owned and only shrinks: an entry names the spec or backlog item that removes the excess (`removedBy`), a regression fails, and a value that dropped more than `staleTolerancePct` (2) below its entry fails as stale. Two builds of the same source differ by a few bytes, so `regressionTolerancePct` (0.1) lets a value exceed its entry by that much before it is a regression. | scripts/perf-rules.ts (rules `baseline-regression`, `baseline-stale`, `baseline-owner`) | 2026-09-25 | CODE |
| B5 | Bytes are brotli at quality 9 for text (html, js, css) and file size for images; `requests` counts the resources the page references. Quality 9 is the gate's choice, so gate numbers are slightly below the wire numbers of the edge and are only compared with themselves. | scripts/check-perf.ts | 2026-09-25 | CODE |

## 3. Static rules the gate enforces on structure

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| S1 | Rules: `img-dimensions` (numeric `width` and `height` on every `<img>`), `img-lcp-lazy` (the declared LCP image is not lazy and has `fetchpriority="high"`), `img-max-bytes` (a raster image is at most `images.maxBytes`, 200,000 bytes), `third-party-origin`, `js-none` (a page declared `js: none` carries no script), `route-missing`, and the budget and baseline rules. Site-wide image findings are merged by resource. | scripts/perf-rules.ts | 2026-09-25 | CODE |
| S2 | The 200,000-byte image limit is a project decision. It is not a figure from web.dev or Google. | specs/draft/0002-web-performance-search-copy-specialists/spec.md DEC-005 | 2026-09-25 | DECISION |

## 4. Lab measurement protocol (how a timing is recorded here)

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| L1 | Lighthouse 13.5.0, mobile form factor, Chrome (`headless=new`), against a local static server that serves brotli for text, `immutable` one-year cache for `/_nuxt/`, and `drop-trailing-slash`. The default throttling of that version is 150 ms RTT, 1638 kbps, 4x CPU slowdown (simulated). | specs/draft/0002-web-performance-search-copy-specialists/research/lab-measurements.md | 2026-09-25 | CMD |
| L2 | With simulated throttling the same page gave LCP of 14.5 s, 3.6 s and 21.2 s in three consecutive runs, while the traced element render delay was under 3 s: simulated LCP is not stable enough to state a number. Applied throttling (`--throttling-method=devtools`) gave 4.2 to 4.6 s on the home page and 2.8 to 3.0 s on a blog post, with a spread under 0.4 s, so it is the recorded method. | specs/draft/0002-web-performance-search-copy-specialists/research/lab-measurements.md | 2026-09-25 | CMD |
| L3 | A lab result is written next to its tool, version, throttling method, device profile and number of runs. It is evidence of a regression or an improvement; it does not satisfy the field requirement of V1. Field data comes from Search Console or CrUX after a deploy. | specs/draft/0002-web-performance-search-copy-specialists/spec.md DEC-009 | 2026-09-25 | DECISION |

## 5. Fonts

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| F1 | Self-host fonts behind a CDN, use WOFF2 only, subset with `unicode-range`, prefer fewer families or variable fonts, choose `font-display` deliberately (`optional` avoids layout shift), align fallback metrics with `size-adjust`, prefer SVG to icon fonts, declare critical `@font-face` early. | https://web.dev/articles/font-best-practices | 2026-09-25 | RAW |
| F2 | The web app requests Montserrat through `@nuxt/fonts` with the `google` provider; the built page loads two WOFF2 files from `/_fonts/` (23,264 and 29,444 bytes) on the critical chain of the home page. | apps/web/nuxt.config.ts (fonts.families) and lab-measurements.md | 2026-09-25 | CODE |

## 6. What this reference does NOT establish

- No number in this file says what a Nuxfire page *should* weigh: that is a decision (B2) made with
  the baseline of `references/nuxfire-web-delivery.md`.
- The vitals are not measured from real visitors: no field data exists for nuxfire.com in this
  repository. Do not claim "passes Core Web Vitals" for the site.
- INP was not measured at all (headless Lighthouse loads a page and does not click). Do not
  report an INP from these runs.
- Lighthouse scores (the 0 to 100 number) are not used as a gate.
