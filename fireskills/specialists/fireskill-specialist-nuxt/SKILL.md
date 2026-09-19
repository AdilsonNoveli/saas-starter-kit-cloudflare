---
name: fireskill-specialist-nuxt
description: Build and review Nuxfire Nuxt 4 applications — pages, layouts, middleware (global and named), plugins, composables, Nitro server routes, `runtimeConfig`, i18n, SSR, and running Nitro on Cloudflare Workers (`cloudflare-module`, NuxtHub, `asyncContext`). Use when touching `apps/app`, `apps/login`, `apps/web`, or `apps/app/nuxt.config.ts`, or when debugging SSR, hydration mismatches, redirect loops, and middleware execution order; UI components belong to `$fireskill-specialist-nuxt-ui` and domain layers belong to `$fireskill-specialist-nuxfire-layers`.
---

# Nuxt 4 (Nuxfire)

## When to Use

- Activate when creating/modifying pages, layouts, middleware, plugins, composables, `server/api` routes, Nitro plugins, `runtimeConfig`, or module configs.
- Activate when debugging stalled SSR, hydration mismatches, redirect loops, middleware ordering, environment variables missing in Workers, or stale build caches.
- Do not activate for `@nuxt/ui` primitives or theming (`$fireskill-specialist-nuxt-ui`), layer creation/linking (`$fireskill-specialist-nuxfire-layers`), tRPC procedures (`$fireskill-specialist-trpc`), or Pinia stores (`$fireskill-specialist-pinia`).
- Combine with `$fireskill-specialist-cloudflare-workers` (Nitro on Workers), `$fireskill-specialist-openauth` (session/auth flows), `$fireskill-specialist-web-accessibility`, and `$fireskill-specialist-performance-engineering`.

## Workflow

1. Read [references/nuxfire-nuxt.md](references/nuxfire-nuxt.md); for common recipes, consult [references/recipes.md](references/recipes.md).
2. Determine **where** code belongs: domain logic -> domain layer; shell and central infrastructure -> `apps/app`.
3. Locate existing page/middleware/plugin and follow repository patterns.
4. Implement taking both SSR (Worker) and client runtimes into account.
5. Validate authenticated, unauthenticated, and deep-link flows.

## Key Rules

- `~~` resolves to app root; `#nuxfire/config` does **not** resolve in `nuxt.config.ts` (use relative path).
- Domain logic belongs to `layers/`; Composition Root contains shell, tRPC composition, `nuxt.config.ts`, and core infrastructure.
- Secrets enter via `runtimeConfig` **without** `public` and via `NUXT_<NAME>`; only public frontend config takes `NUXT_PUBLIC_`; empty secrets cause routes to **fail closed**. Never read `process.env` directly in Nuxt server code.
- In SSR, calling the app's own API requires `useRequestFetch()`; raw `$fetch`/`useFetch` omit cookie headers and stall page loads.
- Global middleware does not support cross-layer ordering; order-dependent middleware (`0.auth`, `1.teams`) lives in `apps/app/app/middleware/`. Named middleware can reside inside layers.
- Redirect from catch-all/`/` using **imperative middleware**, not `definePageMeta({ redirect })`.
- Public routes: `definePageMeta({ auth: false })`.
- Client-only plugins must use `.client.ts`; plugins with dependencies declare `dependsOn`.
- `apps/login`: auth routes retain `ssr: false` to avoid query-string hydration breaks.
- Nitro on Cloudflare Workers: preset `cloudflare-module`, `asyncContext` enabled, output in `dist` due to `hub:`; never cache I/O clients in module variables.
- Server routes authenticate with `getUser(event)`; rate limit sensitive endpoints; errors via `createError`; never log raw `Error` instances.
- UI data queries: `useTrpcClient().….useQuery(() => ({…}))` with getter; notifications and confirmations: `useNotification()`.
- i18n across all three languages with identical keys (`bun run check:i18n`).
- CSP is currently **Report-Only** (`server/middleware/csp.ts`): new external scripts/connections must update policy headers.

## Anti-patterns

- Using raw `useFetch`/`$fetch` for internal `/api/...` calls in SSR middleware.
- Using `definePageMeta({ redirect })` on `/` or catch-all routes.
- Moving `1.teams.global.ts` or `0.auth.global.ts` into a domain layer.
- Accessing `localStorage` or `window` in server-executed setup routines or stores.
- Creating WebSocket plugins without `.client.ts`.
- Exposing secrets under `NUXT_PUBLIC_` or reading `process.env`.
- Removing `ssr: false` from login routes.
- Removing `clean:build-cache` from build scripts.
- Relying solely on `nuxt typecheck` for server routes, or `nuxt prepare` for middleware ordering.
- Placing database clients or I/O handles in module-level global variables.
- Invoking `hubDatabase()`: database is PostgreSQL via Hyperdrive.
- Writing raw Nitro endpoints for functionality that should be a type-safe tRPC procedure.

## Validation

- `bun run typecheck` in `apps/app` **and** `bunx vue-tsc --noEmit -p server/tsconfig.json` (server).
- `bun run test` (Vitest) and `bun run check:i18n` at repository root.
- New pages: verify SSR and client hydration, light/dark themes, unauthenticated redirect (must redirect to login and **return** to requested URL), and authenticated users without team access (`/select-team`).
- Inspect `nuxt build` output (`dist/server/chunks/virtual/entry.mjs`) when modifying middleware, layouts, or layer routes.
- Zero hydration warnings in browser console; zero `localStorage is not defined` errors in server logs.
- New environment variables: verify propagation to Workers and fail-closed behavior when empty.
- Runtime Worker changes: verify with `sst deploy` targeting a test stage.

## Related Skills

- `$fireskill-specialist-nuxt-ui` — components, theming, forms, tables.
- `$fireskill-specialist-nuxfire-layers` — layers and composition.
- `$fireskill-specialist-trpc` — type-safe API.
- `$fireskill-specialist-pinia` — shared state.
- `$fireskill-specialist-openauth` — sessions, auth, cookies.
- `$fireskill-specialist-cloudflare-workers` — runtime and bindings.
- `$fireskill-specialist-sst` — environment variables, secrets, deployments.
- `$fireskill-specialist-typescript` — typing.
