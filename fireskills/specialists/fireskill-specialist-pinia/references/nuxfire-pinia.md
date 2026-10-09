# Pinia in Nuxfire — What Actually Exists in Code

Every statement cites its evidence file. Code supersedes this document.
Usage today is **minimal**: three stores.

## 1. Versions and Registration

- `pinia` `^2.3.1` and `@pinia/nuxt` `^0.9.0` (`apps/app/package.json`); module in
  `apps/app/nuxt.config.ts`. Layers containing stores declare `pinia` in their own
  `package.json` (`teams`, `notifications`).
- **No** persistence plugins exist (`pinia-plugin-persistedstate` or similar).

## 2. The Three Stores

| Store | File | State | Consumers |
|---|---|---|---|
| `useTeamsStore` (id `"teams"`) | `layers/teams/app/composables/use-teams-store.ts` | `teams` (record indexed by **slug**), `currentTeamId`, `loaded` | `apps/app/app/middleware/1.teams.global.ts`, `TeamSwitcher*.vue`, `TeamCreateModal.vue`, settings pages |
| `useInviteStore` (`"invite"`) | `layers/teams/app/composables/use-invite-store.ts` | `invite` (typed as `any`) | `layers/teams/app/middleware/invite.ts`, `pages/invite/[[id]].vue` |
| `useNotificationsStore` (`"notifications"`) | `layers/notifications/app/composables/use-notifications-store.ts` | `notifications` (record indexed by id), `unread`, `enabled` | `NotificationsSlideover.vue`, `pages/account-settings/notifications.vue`, `plugins/ws-notifications.client.ts`, dashboard |

Additionally: `useCurrentTeam = () => storeToRefs(useTeamsStore()).currentTeam`
(reactive shortcut in the same file).

`layers/kanban` **does not use Pinia**: `app/composables/useKanban.ts` wraps the
tRPC client directly. Not all server data requires a store.

## 3. Observed Conventions

- **Options Style**: `defineStore(id, { state: () => ({...}), getters, actions })`.
  No *setup stores* (`defineStore(id, () => {...})`) exist in the project.
- **Location**: `layers/<layer>/app/composables/use-<name>-store.ts` — inside
  `composables/`, so Nuxt auto-imports `useXStore` application-wide. File name is kebab-case
  (`use-teams-store.ts`); export is `use<Name>Store`; `id` is a lowercase noun.
- `defineStore` is imported from `"pinia"` in store files; `storeToRefs` is used
  **without explicit import** (auto-imported by `@pinia/nuxt`).
- **Normalized State as Record** (`Record<key, entity>`) with *getters* for sorted
  lists (`ordered`, `allTeams`) and lookups (`getTeam(id)`).
  Note: `useTeamsStore` indexes by **`team.slug`** (`setTeam`, `setTeams`), and
  `currentTeamId` holds the **slug** (`setCurrentTeamId(teamSlug)` in middleware),
  despite being named "Id".
- **Types Derived from Server**: `import type { RouterOutput } from "~~/server/trpc/routers"`
  and `RouterOutput["teams"]["get"]`. Never manually redeclare types (the exception
  `invite: any` is technical debt, not a pattern).
- **Data Sourced from tRPC Inside Actions**:
  `await useTrpcClient().teams.get.query({ teamIdentifier })`, with `try/catch`
  logging `console.error(error)` and returning `null`/`undefined`. Mutations
  (`markAsRead`) update state **before** the network call and **reconcile** on
  error (recalculate `unread` from state).
- Separation between `set*` (synchronous, state only) vs `fetch*` (asynchronous, calls
  API then `set*`).

## 4. SSR and Hydration

- Store state is serialized into the Nuxt payload and hydrated on the client.
  `useTeamsStore.fetchTeam` runs in **global middleware** `1.teams.global.ts`
  (server on initial visit, client during SPA navigations) and therefore resides
  **in the Composition Root**, sequenced after `0.auth.global.ts` (see
  `$fireskill-specialist-nuxfire-layers`).
- **Browser code inside actions is client-only.** `useNotificationsStore` uses
  `localStorage` in `initializeNotificationSettings`/`setNotificationsEnabled`;
  it is invoked exclusively from `ws-notifications.client.ts` (`.client` suffix)
  and page `onMounted` hooks, never in code executing on the server.
- `useTrpcClient()` creates a new client per server invocation and reuses a single
  client in the browser (`use-trpc-client.ts`); do not retain this client in store state.
- No lazy loading of stores or `acceptHMRUpdate` is configured in the codebase.

## 5. What Does NOT Exist (Do Not Assume)

- State persistence plugins, *setup stores*, Pinia plugins, store unit test suites.
- Stores for Kanban data.
- Global client state outside Pinia other than `useSession()` (`apps/app/app/utils/auth.ts`,
  backed by `useState`) and the session cookie.
