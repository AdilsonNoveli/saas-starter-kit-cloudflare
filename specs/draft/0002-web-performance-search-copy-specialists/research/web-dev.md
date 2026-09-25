# web.dev (mode SUM; thresholds cross-checked against Google Search Central G3)

| Id | Statement (paraphrased) | URL |
| --- | --- | --- |
| W1 | Core Web Vitals "good" thresholds: LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less, each met at the 75th percentile of page loads, separately for mobile and desktop. Lab data catches regressions but only field data captures the real distribution. | https://web.dev/articles/vitals |
| W2 | LCP has four sub-parts with an ideal split of about 40 % time to first byte, under 10 % resource load delay, about 40 % resource load duration and under 10 % element render delay. Actions: make the LCP resource discoverable in the initial HTML, set `fetchpriority="high"` on the LCP image, never `loading="lazy"` on it, preload resources referenced only from CSS or JS, host critical resources on the same origin, use modern formats, remove render-blocking CSS. | https://web.dev/articles/optimize-lcp |
| W3 | INP observes every click, tap and key interaction during the visit and is measured from input to the next paint (good 200 ms or less, poor above 500 ms, 75th percentile). It replaced FID. Levers: long tasks, main-thread work, JavaScript execution and hydration cost, DOM size, deferring non-critical client rendering. | https://web.dev/articles/inp |
| W4 | A performance budget is a set of limits on metrics that affect performance. Three families: quantity-based (bytes, requests, scripts, fonts), milestone timings, and rule-based scores (Lighthouse). Enforce in the build (Lighthouse CI, bundlesize). The article's example baseline (under 5 s time to interactive and under 170 KB of critical-path resources for 3G mobile) is **that article's own starting point, not a current Google requirement**; do not import it as a rule. | https://web.dev/articles/performance-budgets-101 |
| W5 | Fonts: self-host with a CDN, WOFF2 only, subset with `unicode-range`, prefer fewer families or variable fonts, choose `font-display` deliberately (`optional` avoids layout shift), align fallback metrics with `size-adjust`, prefer SVG to icon fonts, declare critical `@font-face` early. | https://web.dev/articles/font-best-practices |

Consequence for the design: the only **externally sourced** numeric thresholds are W1 (and G3).
Every byte budget in `check:perf` is a **project decision** (DEC) with the measured baseline as
its evidence, never presented as a Google or web.dev number.

Not yet read (T046): CLS optimization, `fetchpriority`, resource hints, third-party JavaScript,
image sizing (`srcset`/`sizes`), back/forward cache, INP lab measurement, Lighthouse scoring model.
