# Zero-JavaScript spike (task T045)

Run on 2026-09-25, mode CMD. A scratch change to `apps/web/nuxt.config.ts`
(`routeRules: { "/": { noScripts: true }, "/blog/**": { noScripts: true } }`) was built with
`SITE_URL=https://nuxfire.com bun run build` and reverted after the build (the file in the
repository is unchanged; `git diff` shows only the earlier SPEC-0002 edits). The scratch output was
served and measured with the protocol of `lab-measurements.md` (Lighthouse 13.5.0, mobile, applied
throttling, three runs).

## What the route rule does (measured)

| Measure | Current home | Home with `noScripts` | Current blog post | Blog post with `noScripts` |
| --- | --- | --- | --- | --- |
| `<script>` tags in the HTML | 7 (an import map, the module entry, inline scripts, JSON-LD, the Nuxt data) | 3 (inline color-mode script, inline site config, JSON-LD) | 7 | 3 |
| `modulepreload` links | 52 | 0 | 64 | 0 |
| Gate metrics of `/` (brotli q9 / requests) | html 23,425, js 280,092, css 33,150, 64 requests | html 19,695, js 0, css 33,150, 12 requests | not gated | not gated |
| HTML file, decoded bytes | 236,140 | 212,308 | 63,246 | 53,672 |
| Lighthouse total bytes | 5,124,586 | 3,581,204 | 504,094 | 156,731 |
| LCP ms (3 runs) | 4,555, 4,237, 4,402 | 3,521, 3,288, 3,290 | 2,822, 2,962, 3,027 | 2,580, 2,526, 2,538 |
| TBT ms | not quoted (see `lab-measurements.md`) | 1,345 (one run; two NaN) | 1,880, 2,435, 2,418 | 121, 69, 79 |

The rule does what the installed code says (`research/nuxt-cloudflare-capabilities.md`, K2): the
entry script and the resource hints of the route disappear from its HTML. Other routes (`/docs`,
`/pt-br`) were untouched and kept their scripts (55 and 52 modulepreload links).

Same protocol on the Astro docs page: LCP 2,106 to 2,354 ms, TBT 258 to 426 ms, about 126 KB.
The blog post without scripts is at 157 KB and 2.5 to 2.6 s LCP, and its main-thread blocking is
lower than Astro's page in this run. The remaining time before the first paint is the render-blocking
CSS and the fonts, not JavaScript.

## What breaks on a page with `noScripts`

Tested in the browser pane on the built blog post, clicking each of the eight `<button>` elements of
the page, first on the current page (hydrated), then on the `noScripts` page:

| Control | Current page | With `noScripts` |
| --- | --- | --- |
| Buttons 0 and 2 (no label; each click switched the class of `<html>` between `dark` and `light`, so they are the color mode controls) | switch the theme | nothing happens; the theme stored by an earlier visit is still applied by the inline script |
| Language menus (buttons 1 and 3, `aria-label="Language"`) | open a menu (`role=menu`/dialog) | nothing happens: **a visitor cannot switch language** |
| Mobile menu (button 4, `aria-label="Open menu"`) | no change at this viewport | nothing happens (the header links stay reachable as plain anchors: `/`, `/#pricing`, `/docs`, `/blog`, `/signup`) |
| Buttons 5, 6 and 7 (no label) | each click increased the count of open `[role=dialog]`, `[role=menu]` or `[data-state=open]` elements | nothing happens |

Also found: five of the eight buttons have neither an `aria-label` nor text (icon buttons); that
is a separate accessibility finding for `$fireskill-specialist-web-accessibility`, recorded here
because it makes the controls hard to name in a report.

## Conclusion

- Route-level `noScripts` **works and pays** in this profile: the home page loses 30 % of its bytes
  (5,124,586 to 3,581,204) and about 1.0 to 1.1 s of LCP; the blog post loses 69 % of its bytes
  (504,094 to 156,731), 0.2 to 0.5 s of LCP and almost all of its blocking time.
- It is **not adoptable as is** on a page that shares the interactive header: language switching,
  the color-mode toggle and the menus need JavaScript, and a route rule applies to the whole page
  (K2: it skips the entry script), not to one component.
- The consequence for DEC-004 is a condition, not a reversal: a page may be declared `js: none` only
  after its interactive shell is either static (native elements, plain links per language) or
  reduced to components that are hydrated lazily
  (`defineLazyHydrationComponent('visible' | 'idle' | 'interaction', ...)`) on a route that keeps
  its scripts. Making the shared header and the language switch work without JavaScript is
  BACKLOG work (`specs/backlog/0001-landing-refactor.md`), not part of this spec.
- Not established: how `experimental.componentIslands` would behave with the Nuxt UI header (not
  tried); whether the locale redirect and cookie logic works without hydration (not tried).
