# What the installed stack can do (modes CODE and docs)

## N. Nuxt 4.5.2 and Nitro — reducing client JavaScript (mode CODE)

Read in `node_modules/nuxt` and `node_modules/@nuxt/nitro-server` on 2026-09-25.

| Id | Fact | Evidence |
| --- | --- | --- |
| K1 | `features.noScripts: "production" | "all" | boolean` turns off Nuxt's scripts and JS resource hints; the schema comment adds that it can be done more granularly in `routeRules`. In production builds the JS chunks are deleted from the build output. | `@nuxt/schema/dist/index.d.mts:2065-2073`; `nuxt/dist/index.mjs` (the `build:manifest` hook removing chunks of `resourceType === "script"`) |
| K2 | `routeRules[route].noScripts?: boolean` exists (with the deprecated alias `experimentalNoScripts`). The renderer skips the entry script and the script tags for a route with `noScripts`, and disables SSR streaming for it. | `@nuxt/nitro-server/dist/index.mjs` (`NitroRouteRules`), `dist/runtime/handlers/renderer.mjs` lines 93, 142, 212 |
| K3 | Lazy hydration is available through `defineLazyHydrationComponent(strategy, loader)` with strategies `visible`, `idle`, `interaction`, `mediaQuery`, `if`, `time`, `never`. | `nuxt/dist/app/composables/lazy-hydration.d.ts` |
| K4 | Component islands are configurable through `experimental.componentIslands` (`true`, `"auto"`, `"local"`, `"local+remote"`, with `selectiveClient`). | `@nuxt/schema/dist/index.d.mts:2190` |
| K5 | The repository already installs `@nuxt/image` and `@nuxt/scripts` and `@nuxt/fonts`; `nuxt.config.ts` has **no** `image:` configuration, and the avatars are plain `<UAvatar src="/static/x.jpeg">` files. | `apps/web/nuxt.config.ts:60-73`, `apps/web/app/components/landing/LandingAvatars.vue` |

Unknown until a spike (task T045): what breaks on a route with `noScripts` in this app (the
color-mode switch, the locale switcher, the header menu and the search are JavaScript-driven
Nuxt UI components), and whether the locale redirect and cookies still work without hydration.

## C. Cloudflare Workers Static Assets (mode docs, via the Cloudflare docs search tool)

| Id | Fact | URL |
| --- | --- | --- |
| F1 | `assets.html_handling` defaults to `auto-trailing-slash`: single files (`foo.html`) are served without a trailing slash, folder index files (`foo/index.html`) with one. Alternatives: `force-trailing-slash`, `drop-trailing-slash`, `none`. | https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/ |
| F2 | A `_redirects` file in the assets directory supports 301, 302, 303, 307, 308; **302 is the default** when no code is given. It applies to static asset responses, not to requests served by Worker code. | https://developers.cloudflare.com/workers/static-assets/redirects/ |
| F3 | `not_found_handling: "404-page"` serves the nearest `404.html` with status 404. | first URL |
| F4 | SST's `sst.cloudflare.Worker` accepts `assets.htmlHandling` (`auto-trailing-slash`, `force-trailing-slash`, `drop-trailing-slash`, `none`), `notFoundHandling` and `runWorkerFirst`; the field is marked `@internal` in the type definition. `infra/utils/nuxt.ts` passes only `directory`. | `.sst/platform/src/components/cloudflare/worker.ts:261-266, 659-661`; `infra/utils/nuxt.ts:83-85` |

Limit: the effect of `drop-trailing-slash` on this site (interaction with prerendered folders and
the Nitro Worker) was **not** tested; it needs a deploy, which requires explicit authorization
(open question Q-05).
