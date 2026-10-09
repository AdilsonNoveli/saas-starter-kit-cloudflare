# Nuxt 4 Recipes in Nuxfire

Each recipe stems from existing codebase patterns. Verify the reference file; if
discrepancies exist, the code supersedes this document.

## New Team Page

1. **Location**: if domain-specific, place in the owning **layer**
   (`layers/<x>/app/pages/[[team]]/<x>/…`); shell-level pages reside in
   `apps/app/app/pages/`. Reference pattern: `layers/kanban/app/pages/[[team]]/kanban/`.
2. Route naming begins with `team…` (under `[[team]]` directory) — triggers
   `1.teams.global.ts` (resolves active team by slug, redirects to `/select-team` if invalid).
3. Layout: `definePageMeta({ layout: "dashboard" })`. Named layouts and middleware
   operate across layers seamlessly (unified registry).
4. Data fetching: `useTrpcClient().<ns>.<proc>.useQuery(() => ({ … }))` with a **getter**
   function (re-runs automatically on team/route changes). Active team: `useCurrentTeam()`.
5. UI: `$fireskill-specialist-nuxt-ui`; localized strings across all three locales.
6. Navigation entry: `navigation.sidebar` in `layer.manifest.ts` (`{team}` placeholder in `to`).
7. Confirm the page disappears cleanly when the feature layer is disabled.

## Public Page (Unauthenticated)

- `definePageMeta({ auth: false })` — `0.auth.global.ts` permits bypass (invite page pattern).
  Do not redirect via `definePageMeta({ redirect })`.

## New Middleware

- **Global** (`*.global.ts`): use only when execution order relative to other layers is
  immaterial. If order-dependent (e.g., must run after authentication), place in
  `apps/app/app/middleware/` with a numeric prefix.
- **Named**: can reside in a layer; `definePageMeta({ middleware: "name" })` executes
  after all global middleware has completed.
- In SSR, invoke internal APIs via `useRequestFetch()`.

## New Plugin

- Client-only: `.client.ts` suffix.
- Plugin dependencies (across any layer origin): `defineNuxtPlugin({ name, dependsOn: ["…"], setup })`.
- Never assume alphabetical file load order between layers.

## New Server Route

1. `apps/app/server/api/<group>/<name>.<method>.ts`, using `defineEventHandler`.
2. Authentication: `await getUser(event)` (`server/utils/auth.ts`); reject early if `!user.id`.
3. Secrets? `useRuntimeConfig(event)` (non-public); define in `runtimeConfig` with `""`,
   pass via `vars` in `infra/app.ts` as `NUXT_<NAME>`, and fail closed when empty.
4. Brute-force, webhook, or MFA attack surfaces: `assertNotRateLimited` in `server/utils/rate-limit.ts`, or `rateLimit` from `@nuxfire/rate-limit` (never a new copy of the algorithm).
5. Database access: `useDB()` (see `$fireskill-specialist-cloudflare-workers`).
6. Error handling: `createError({ status, message })`; log structured fields.
7. For internal application calls, prefer a **tRPC procedure** (`$fireskill-specialist-trpc`);
   Nitro routes are reserved for uploads, webhooks, cookies, and session endpoints.

## New Environment Variable / Secret

1. `runtimeConfig` in `nuxt.config.ts` (`public` strictly for browser-accessible values).
2. `infra/secret.ts` + `.env.example` + `vars` in `infra/app.ts`
   (`$fireskill-specialist-sst`, "Adding a Secret" recipe).
3. Never read `process.env` directly in Nuxt server code.

## New Locale / String Translation

- Add key in `en.json`, `pt-BR.json`, and `es.json`, in either the app or layer; run `bun run check:i18n`.

## Minimum Verification Before Completion

- `bun run typecheck` (`apps/app`) **and** `bunx vue-tsc --noEmit -p server/tsconfig.json` (server).
- `bun run test`, `bun run check:i18n`.
- Verify route behavior in SSR **and** client-side navigation; authenticated, unauthenticated,
  and unauthenticated deep-links (must redirect back to requested URL post-login).
- Modified layer middleware, layout, or routes? Verify with `nuxt build`.
- Modified Worker runtime code? Verify on a deployed stage (`sst deploy`).
