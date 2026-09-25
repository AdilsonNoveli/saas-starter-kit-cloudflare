# Zero JavaScript by Default, Hydration by Exception

The Astro behaviour worth copying is a rule about defaults: a component ships no JavaScript unless
someone asks for it. Nuxt ships the whole app by default, so in Nuxfire the discipline has to be
written down and checked. This file gives the model, what Nuxt offers, what was measured, and the
order in which to decide.

## 1. The model and the tools

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| Z1 | Astro renders the page to static HTML with islands of JavaScript where interactivity is needed. By default a UI component becomes HTML and CSS and its client JavaScript is stripped; an island needs a `client:*` directive (`client:idle` loads when the browser is idle, `client:visible` when it enters the viewport). A page that hydrates everything as one application lacks selective hydration. | https://docs.astro.build/en/concepts/islands/ | 2026-09-25 | RAW |
| Z2 | Nuxt 4.5.2 has `features.noScripts` (`"production"`, `"all"` or a boolean) and the route rule `routeRules[route].noScripts`; for a route with it the renderer skips the entry script and the JavaScript resource hints. | node_modules/@nuxt/schema/dist/index.d.mts and node_modules/@nuxt/nitro-server/dist/index.mjs (`NitroRouteRules`) | 2026-09-25 | CODE |
| Z3 | Nuxt 4.5.2 has `defineLazyHydrationComponent(strategy, loader)` with the strategies `visible`, `idle`, `interaction`, `mediaQuery`, `if`, `time` and `never`. | node_modules/nuxt/dist/app/composables/lazy-hydration.d.ts | 2026-09-25 | CODE |
| Z4 | `experimental.componentIslands` exists (`true`, `"auto"`, `"local"`, `"local+remote"`, with `selectiveClient`). It was **not tried** in this repository. | node_modules/@nuxt/schema/dist/index.d.mts | 2026-09-25 | CODE |
| Z5 | Measured on the built site with `noScripts` on `/` and `/blog/**`: the home page lost 30 % of its bytes and about 1.0 to 1.1 s of LCP, the blog post 69 % of its bytes and almost all its blocking time; the color mode toggle, the language menus and the other buttons of the header stopped working, so a visitor could not change language. | specs/draft/0002-web-performance-search-copy-specialists/research/zero-js-spike.md | 2026-09-25 | CMD |
| Z6 | A page declared `js: none` in `perf-budgets.json` fails `check:perf` (rule `js-none`) for every script except JSON-LD, inline scripts included, and for every script preload. The pages of the `noScripts` spike still carried two inline scripts (the color mode initialiser and the site config), so they would **fail** `js: none` as they are. | scripts/perf-rules.ts and specs/draft/0002-web-performance-search-copy-specialists/research/zero-js-spike.md | 2026-09-25 | CODE |

## 2. Decision order (per page, then per component)

1. **Is anything on the page interactive for the reader?** A page whose interactions are links and
   native elements (`<details>`, anchors, `:target`, `<form>` with a plain POST) needs no
   framework code on the client for them.
2. **Does the shared shell need JavaScript?** In Nuxfire it does today (Z5): the header carries the
   color mode toggle and the language switch. Until the shell can work without scripts, a page
   that keeps the shell keeps its scripts, and the gain comes from step 3.
3. **Shrink what hydrates.** Interactive but not needed at first paint: load it lazily with the
   narrowest strategy that is true (`visible` for something below the fold, `idle` for something
   the visitor may use soon, `interaction` for something used on click or hover, `mediaQuery`
   for something only some screens show, `never` for something that is server-only). Static
   sections (comparison tables, long feature lists, testimonials) are candidates for `never` or
   for being plain HTML.
4. **Declare the outcome.** When a page ends with no script, set `js: "none"` for it in
   `perf-budgets.json`, and let `check:perf` hold the line. When it keeps scripts, lower its `js`
   baseline in the same change (baselines only shrink).
5. **Measure.** Bytes with `check:perf`; LCP and blocking with the protocol of
   `web-vitals-and-budgets.md`; interaction by clicking every control on the real build, with and
   without scripts, as in the spike.

## 3. Rules that come from the measurements

- A route rule applies to a whole route. Do not enable `noScripts` for a route and then discover the
  shell is dead: run step 5 first, in a browser, on a build.
- Do not use `noScripts` to hide a defect of a component that ought to work: the reader loses the
  feature.
- Do not fake an island: a component wrapped so that it "looks lazy" but is imported eagerly by a
  parent still ships its code. Check the built `modulepreload` links of the page, not the source.
- Fewer scripts do not fix render-blocking CSS and fonts (the spike's blog page kept 2.5 s of LCP
  with 157 KB and no script). Look at the critical chain before adding more JavaScript work.

## 4. What this reference does NOT establish

- Whether Nuxfire's shell can be made script-free (native `<details>` menu, per-language links,
  a `prefers-color-scheme` only theme) without loss: not built, only identified as the gate to
  `js: none`.
- The behaviour of `experimental.componentIslands` (Z4) with Nuxt UI components.
- Whether the locale redirect and its cookie keep working on a page without scripts.
- Numbers for pages other than the ones the spike measured.
