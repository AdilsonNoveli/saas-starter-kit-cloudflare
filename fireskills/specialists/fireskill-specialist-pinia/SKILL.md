---
name: fireskill-specialist-pinia
description: Create and review Pinia stores (`@pinia/nuxt`) in Nuxfire — options-style stores in `layers/*/app/composables/use-*-store.ts`, normalized state, actions that invoke `useTrpcClient()`, types derived from `RouterOutput`, SSR/hydration, and client-only code. Use when creating or modifying stores, deciding between Pinia, `useState`, or composables with `useQuery`, or debugging hydration mismatch between server and client; three stores exist today (teams, invite, notifications).
---

# Pinia in Nuxt

## When to Use

- Trigger when creating/modifying stores, deciding where shared UI state should live,
  or debugging hydration mismatches, state leaks across requests, or server-side `localStorage` access.
- Trigger when using `useTeamsStore`, `useCurrentTeam`, `useNotificationsStore`, or `useInviteStore`.
- Do not trigger for data used only by a single screen covered by tRPC `useQuery`
  (`useKanban`): see `$fireskill-specialist-trpc`. Do not trigger for user session
  (`useSession`, `useState`): see `$fireskill-specialist-openauth`.
- Combine with `$fireskill-specialist-nuxt` (middleware, plugins, SSR),
  `$fireskill-specialist-nuxfire-layers` (layer co-location), and `$fireskill-specialist-typescript`.

## Workflow

1. Read [references/nuxfire-pinia.md](references/nuxfire-pinia.md).
2. Decide **if a store is needed**: state consumed across multiple components/routes
   with an independent lifecycle (current team, notifications) → Pinia store. Single-screen
   data or simple queries → `useQuery` / composable.
3. Mirror the pattern in `use-teams-store.ts` (normalized state, `set*` + `fetch*`,
   derived types from `RouterOutput`).
4. Place store in the layer owning the domain and declare `pinia` in the layer's `package.json`.
5. Isolate client-only code and callers.
6. Validate (below).

## Core Rules

- Options-style `defineStore(id, { state, getters, actions })`; named `use<Name>Store`,
  file `use-<name>-store.ts` in `app/composables/` (auto-imported).
- Store `id` is a lowercase noun, unique across the app.
- State is serializable and normalized (`Record<key, entity>`); sorted arrays and searches
  are *getters*.
- Types come from server: `RouterOutput["ns"]["proc"]`; never manually redeclare.
- Data fetched from tRPC inside `fetch*` actions calling `set*`; wrap with `try/catch`
  logging and returning `null`/`undefined` on error. For actions executing on the server
  (middleware/SSR), extract `message`/`name` before logging, since raw `Error` in Workers serializes to `{}`.
- Optimistic mutations update state upfront and **reconcile on error** (`markAsRead`).
- Record keys and field names must be explicit: `useTeamsStore` indexes by **slug** and
  `currentTeamId` stores the slug — do not mix with `team.id`.
- Browser-only APIs (`localStorage`, `window`) **only** inside actions called from
  `.client.ts` plugins or `onMounted`; never in the server execution path.
- Never store the tRPC client, class instances, or functions in state.
- Never keep user state in module-scope variables (leaks across SSR requests); Pinia
  ensures per-request instances.
- Route-dependent stores requiring sequencing (`fetchTeam` in global middleware)
  reside where execution order is guaranteed: the Composition Root.
- Layer plugins using stores from another layer must declare `dependsOn`.

## Antipatterns

- Creating stores for single-screen data or mirroring a `useQuery`.
- Typing state with `any` (`invite` is legacy debt; do not repeat).
- Reading `localStorage` in `state()` or getters (breaks SSR and causes hydration mismatches).
- Mutating store state outside actions across multiple files.
- Calling `useTeamsStore()` at top-level module scope (outside setup/actions).
- Duplicating what belongs in `useSession()` or cookies.
- Indexing by `id` when callers pass `slug` (and vice-versa).
- Swallowing errors silently or logging raw `Error` objects in Workers.
- Assuming state persists across reloads: no persistence plugin exists.

## Validation

- `bun run --cwd apps/app typecheck`: getters and actions typed via `RouterOutput`, no `any`.
- Load page with SSR: server-rendered HTML matches client DOM (no console hydration warnings).
- Route navigation and team switching: `currentTeamId`/`teams` update; invalid team redirects to `/select-team`.
- Store with browser code: server-side reload does not throw `localStorage is not defined`.
- API failure: store falls back to consistent state (e.g., recalculated `unread`).
- `bun run test` (Vitest); add store unit test if new getter/reconciliation logic is added.
