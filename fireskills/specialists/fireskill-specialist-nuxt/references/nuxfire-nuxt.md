# Nuxt 4 in Nuxfire — What Actually Exists in the Codebase

Each statement includes concrete file evidence. The codebase supersedes this document.

## 1. Versions and Applications

- `nuxt` `^4.5.2`; `vue` and `vue-router` set to **`latest`** (unpinned);
  `typescript ^5`, `vue-tsc ^2.2.10`, `vitest ^5` (`apps/app/package.json`).
- Three Nuxt applications: `apps/app` (application, Composition Root), `apps/web` (site + docs,
  Nuxt Content), `apps/login` (static login UI, `nuxt generate`). `apps/functions` is **not** Nuxt (Workers).
- Aliases: `~` = `app/` of the app; **`~~` = app root** (`apps/app`);
  `@nuxfire/<package>/…` cross-package. `#nuxfire/config` (root `config.ts`) resolves strictly
  in `infra/`/`scripts/`, **not** inside `nuxt.config.ts` (jiti does not parse `paths`): there,
  import via relative path.

## 2. `apps/app/nuxt.config.ts`

- `extends`: Active layers (`@nuxfire/layer-<name>`), sourced from `activeLayerNames`
  (see `$fireskill-specialist-nuxfire-layers`); calls `composeLayers()` beforehand.
- `modules`: `@nuxt/ui`, `@nuxt/eslint`, `@nuxthub/core`, `@nuxt/image`, `@nuxt/scripts`,
  `@nuxtjs/i18n`, `@vueuse/nuxt`, `nuxt-svgo`, `@nuxt/fonts`, `@pinia/nuxt`, `nuxt-authorization`.
- `css: ["~/assets/css/main.css"]` (order: `tailwindcss` → `@nuxt/ui` → `@nuxfire/tokens/theme.css`;
  see `$fireskill-specialist-nuxt-ui`).
- `build.transpile: ["trpc-nuxt"]`. `typescript.shim: false`. `devtools` enabled.
- **Nitro**: Preset `cloudflare-module`; `cloudflare.nodeCompat: true` (only silences a false
  warning — real `nodejs_compat` originates from SST); `experimental.asyncContext: true`
  (gives `useEvent()` request-scoped context; `useDB()` requires this) and `experimental.tasks: true`.
- **NuxtHub** (`hub: { blob, kv, cache }`, self-hosted): Uses `hubBlob()`, `hubKV()`,
  `hubCache()`; **strictly blob/KV/cache**, database is **not** `hubDatabase()`.
  With `hub:` enabled, `@nuxthub/core` directs Nitro output to **`dist`** (not `.output`).
- **i18n**: `@nuxtjs/i18n` `^10.6.0`, `restructureDir: "i18n"`, `strategy: "no_prefix"`,
  `defaultLocale: "en"`, locales `en`, `pt-br` (file `pt-BR.json`, `language: "pt-BR"`), `es`.
  Files per app **and per layer**; `bun run check:i18n` enforces identical key sets across languages.
- `svgo`: `componentPrefix: "icon"`, `autoImportPath: "~/assets/icons"` (custom SVGs become
  `<Icon…>` components); icon collections use `i-lucide-*`.
- `fonts`: `Montserrat` (Google) — Geist originates from `theme.css`.

### `runtimeConfig`

- `public`: `authUrl`, `authClientID`, `websocketsEndpoint`, `paddleClientToken`,
  `paddleEnvironment` (defaults to `"sandbox"`).
- Server-only: `stripeSecretKey`, `stripeWebhookSecretKey`, `paddleApiKey`, `paddleWebhookSecret`,
  `paddleSandbox`, `wsTicketSecret`, `authAdminSecret`, `platformMfaSessionSecret` (≥32 chars),
  `platformAdminEncryptionKey`, `userMfaSessionSecret`, `userMfaEncryptionKey`.
- All are overridden by environment variables `NUXT_<UPPERCASE_CAMEL>` / `NUXT_PUBLIC_…`,
  defined in `infra/app.ts` (`vars`). Empty secret values cause the corresponding route to
  **fail closed**. Only public values carry the `NUXT_PUBLIC_` prefix.

## 3. Composition Root Structure (`apps/app`)

| Path | Real Contents |
|---|---|
| `app/app.vue` | `<UApp>` + `NuxtLoadingIndicator` + `NuxtLayout` + `NuxtPage` + `<ConfirmDialog />` |
| `app/layouts/` | `dashboard.vue` (team sidebar), `page.vue`; admin layout comes from `layers/admin` |
| `app/pages/` | `[[team]]/dashboard.vue`, `buy/`, `claim/`, `[...path].vue` (catch-all); `account-settings*` comes from `layers/account` |
| `app/middleware/` | `0.auth.global.ts`, `1.teams.global.ts` |
| `app/plugins/` | `authorization-resolver.ts`, `websockets.client.ts` |
| `app/composables/` | `use-trpc-client.ts`, `use-notification.ts`, `use-dashboard.ts`, `useLayerNavigation.ts` |
| `app/utils/` | `auth.ts` (`useSession`), `date.ts`, `plan-tier.ts`, `team-status.ts`, `title-case.ts` |
| `app/components/` | `ConfirmDialog.vue`, `layout/`, `loader/`, `team-dashboard/`; `account/`, `avatar/`, `settings/` come from `layers/account` |
| `server/api/` | `auth/*`, `trpc/[trpc].ts`; `mfa/*`, `upload/profile-picture.ts`, `profile-pictures.get.ts` come from `layers/account` |
| `server/middleware/` | `csp.ts` |
| `server/plugins/` | `authorization-resolver.ts`, `database-binding.ts` |
| `server/utils/` | `audit-log`, `auth`, `db`, `rate-limit` (h3 wrapper over `packages/rate-limit`); `user-mfa`, `user-mfa-session`, `mfa-recovery` live in `layers/account`, the crypto in `packages/crypto` |
| `server/trpc/` | see `$fireskill-specialist-trpc` |

Rule: **Domain logic belongs in layers**; the Composition Root holds only shells,
tRPC composition, `nuxt.config.ts`, and core infrastructure.

## 4. Session, Middleware, and Routing (Learned from Incidents)

- **`useSession()`** (`app/utils/auth.ts`): `useState("nuxfire-session")`, `refresh()`, and `clear()`.
- **`0.auth.global.ts`**: Bypasses `/api`; routes opt out via `definePageMeta({ auth: false })`
  (e.g., invite page); queries `/api/auth/session`; absent session, stores `redirect` and goes to issuer
  (`client.authorize(callback, "code")` + `navigateTo(url, { external: true })`).
  **In SSR, use `useRequestFetch()`**, not raw `$fetch`/`useFetch`: generic Nitro internal dispatch
  does not forward request cookies, previously locking all pages indefinitely.
- **`1.teams.global.ts`** resides in the Composition Root **by design**: global middleware
  does not guarantee ordering across layers (layers execute first, Composition Root last);
  inside a layer it executed prior to authentication, corrupting post-login returns to `/select-team`.
  Targets only routes whose names begin with `team`.
- **`[...path].vue`** (catch-all serving `/`): Redirects via **imperative middleware**
  (`definePageMeta({ middleware: [() => navigateTo("/dashboard")] })`),
  **not** `definePageMeta({ redirect })`, which raced with external redirects in the auth middleware
  and stalled SSR on `/`.
- Routes in `apps/login` (`/login/**`, `/signup/**`, `/forgot-password/**`) specify
  `routeRules: { ssr: false }` because they are pre-rendered **and** driven by query strings; do not remove.
- Sidebar: `useLayerNavigation()` reads generated manifests; `{team}` in `to` is replaced by callers (`layouts/dashboard.vue`).

## 5. Server (Nitro) on Workers

- `server/plugins/database-binding.ts`: Captures `AppDB` binding per request and closes
  clients in `afterResponse`/`error` via `context.waitUntil(...)` (see `$fireskill-specialist-cloudflare-workers`).
- `server/plugins/authorization-resolver.ts`: Injects server user into `nuxt-authorization`.
- **The `server/` directory of each layer is scanned by Nitro**: `server/utils/*.ts` become auto-imports
  (and can use `useDB()`); tRPC routers **do not** depend on this.
- `server/middleware/csp.ts` emits `Content-Security-Policy-Report-Only` (does **not** yet enforce):
  `script-src 'self' https://cdn.paddle.com`, `frame-src https://*.paddle.com`, etc.
  When integrating third-party scripts/iframes, adjust policy; once production logs are clean,
  the header can transition to `Content-Security-Policy`.
- Uploads: `hubBlob().handleUpload(event, { formKey: "files", ensure: { types: ["image/jpeg","image/png"], maxSize: "2MB" }, put: { prefix, addRandomSuffix: true } })`.
- Logs: Never `console.error(rawError)` in Worker code (`message`/`stack` are non-enumerable
  and serialize to `{}`); extract specific fields.
- Webhook and MFA rate-limiting: the algorithm is `packages/rate-limit`; `server/utils/rate-limit.ts` wraps it over `hubKV()` (`assertNotRateLimited`), and the MFA routes of `layers/account` and `layers/admin` import its single `rateLimit(key, rule)` by path (`~~/server/utils/rate-limit`).

## 6. Client Architecture

- tRPC: `useTrpcClient()` (see `$fireskill-specialist-trpc`); shared state: Pinia (`$fireskill-specialist-pinia`);
  toast notifications / confirmations: `useNotification()` (`success`/`error`/`info`/`confirm`).
- `websockets.client.ts`: Parallel plugin, `.client` **mandatory** (executing on server
  crashed SSR for all visitors); acquires short-lived **ticket** from `/api/auth/ws-ticket`
  and sends in `Sec-WebSocket-Protocol`; the `$ws` API (`subscribe`/`unsubscribe`/`on`/`off`)
  serves as base for layer plugins, using `dependsOn: ["websockets"]`.
- Shortcuts: `defineShortcuts` in `useDashboard()` (`createSharedComposable`).
- Icons: `i-lucide-*`; UI: `$fireskill-specialist-nuxt-ui`.

## 7. Build and Verification

- `bun run build` (in `apps/app`) runs `clean:build-cache` beforehand, removing `.nuxt`,
  `.output`, and **`.data`**: `nuxi cleanup` skips `.data`, and locale renames (`pt-BR` → `pt-br`)
  previously deployed stale bundles, falling back silently to English. Do not remove this cleanup step.
- `postinstall: nuxt prepare`.
- **`nuxt typecheck` does not check server code.** Also execute `bunx vue-tsc --noEmit -p server/tsconfig.json`
  inside `apps/app`.
- `nuxt prepare` **does not** prove middleware execution order, layout maps, or merged layer routes:
  verify inside `nuxt build` (`dist/server/chunks/virtual/entry.mjs`).
- Tests: Vitest (`bun run test` from root; `apps/app` declared in `test.projects`, currently without dedicated suites).
- Dev: `bun run app` at root (`sst shell -- bun scripts/dev.ts app`) injects stage secrets and URLs;
  running plain `nuxt dev` in `apps/app` lacks Cloudflare bindings.

## 8. What Does NOT Exist (Do Not Assume)

- `hubDatabase()`, Prisma, SSR on login pages, Redux/Vuex.
- Component and route test suites for `apps/app`.
- Order-dependent global middleware inside layers.
- Enforced CSP (report-only mode today).
