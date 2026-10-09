# tRPC in Nuxfire — What Actually Exists in the Codebase

Each statement includes concrete file evidence. The codebase supersedes this document.

## 1. Versions and Nuxt Integration

- `@trpc/server` and `@trpc/client` **v10.45.x**, `trpc-nuxt` **0.10.22**
  (`apps/app/package.json`), with `build.transpile: ["trpc-nuxt"]`
  (`apps/app/nuxt.config.ts`). Do not use tRPC v11 APIs (`initTRPC` with
  `.create({ transformer })` in alternate format, `createTRPCClient`, `httpBatchStreamLink`…).
- HTTP Handler: `apps/app/server/api/trpc/[trpc].ts` →
  `createNuxtApiHandler({ router: appRouter, createContext })`. Endpoint: `/api/trpc`.
- Client: `apps/app/app/composables/use-trpc-client.ts` →
  `createTRPCNuxtClient<AppRouter>` with `httpBatchLink({ url: "/api/trpc" })`.
  One singleton client in browser (`import.meta.client && client`), a new instance per server-side call (SSR).
  Exports `useTrpcClient()`, `useTeamsList()`, `useTeam(id)`.
- **No `transformer` (superjson).** Nothing in the project configures it: `Date`,
  `Map`, `BigInt` travel as plain JSON (`Date` becomes string). Handle this in
  return types; introducing superjson is a new decision on both ends.

## 2. Context (`apps/app/server/trpc/context.ts`)

`createContext(event)` returns: `ip`, `event` (H3), `origin`, `session`
(result of `getUser(event)`), `sendEmail` (service binding `Emails`),
`sendWebsocketsEvent(topic, data)` (binding `Websockets`, `publish`),
`runtimeConfig`, `jobsQueue` (binding `JobQueue`). `Context` is
`inferAsyncReturnType<typeof createContext>`.
Bindings originate from `event.context.cloudflare.env.*` and may be `undefined` if
feature flags are disabled in `config.ts` (`websockets`, `jobsQueue`):
`sendWebsocketsEvent` handles this safely; `ctx.jobsQueue.send(...)` (used in
`layers/admin/server/trpc/admin-queue.ts`) does not.

## 3. The Four Procedures (`apps/app/server/trpc/trpc.ts`)

| Procedure | Requires | Adds to `ctx` | Use For |
|---|---|---|---|
| `publicProcedure` | nothing | — | Unauthenticated routes (`public.addToWaitlist`) |
| `protectedProcedure` | `ctx.session.email`; if `session.mfaEnabled`, valid user MFA | `user` (the session) | Any authenticated action without team permission checks (e.g., `teams.create`, `account.*`) |
| `abilityProcedure` | `protectedProcedure` | `allows`, `denies`, `authorize` | Everything scoped to a team: `await authorize(ability, ...args)` |
| `platformAdminProcedure` | `protectedProcedure` + active row in `PlatformAdmin` with MFA + elevated session cookie (TOTP in last 30 min) | `platformAdmin` | Everything under `admin.*`. Records automated audit log for every mutation |

- **`platformAdminProcedure` is parallel to team RBAC, not derived from
  `abilityProcedure`**, by deliberate design: routing through tenant ability layers
  is how tenant permissions could inadvertently grant platform access. Never rebuild it atop `abilityProcedure`.
- Failure in `platformAdminProcedure` produces a silent `FORBIDDEN` without error message,
  identically across all three checks: never reveal which specific security gate failed.
- `authorize` converts errors into `TRPCError FORBIDDEN` and logs `console.warn("authz denied", …)`.
- Enforced MFA returns `FORBIDDEN` with `message: "MFA_REQUIRED"`.

## 4. Router Composition and Layers

- `apps/app/server/trpc/routers/index.ts` constructs `appRouter = router({ account, public: pub, ...layerRouters })`
  and exports `AppRouter`, `RouterInput`, `RouterOutput`.
- `routers/.composition/layer-routers.ts` is **AUTOMATICALLY GENERATED** by
  `scripts/compose-layers.ts` on every `nuxt.config.ts` invocation. Do not edit manually;
  it dynamically updates based on `config.ts` (`layers.core` + `layers.features`).
- Each layer exports from `layers/<layer>/server/trpc/router.ts` strictly:
  `export const routers = { <key>: <router> } satisfies Record<string, AnyRouter>`.
  **A map, never a loose router**: a single layer can own multiple top-level keys
  (`teams` owns both `teams` and `invites`).
- **`satisfies`, never `: Record<string, AnyRouter>`.** Explicit type annotations widen
  types and break input/output inference on caller clients (`AppRouter` is inferred through this object).
  Pages derive types directly (`RouterOutput["admin"]["teams"]["listTeams"][number]`).
- Routers from other layers mounted under `admin.*` (`admin.plans`, `admin.notifications`)
  are named exports **outside** the layer's primary `routers` map, imported directly by
  `layers/admin/server/trpc/router.ts`. Platform concerns live under `admin.*`; procedure
  paths indicate whether they are guarded by `platformAdminProcedure`.

Namespace map today: `account`, `public` (app) · `teams`, `invites` (layer-teams) ·
`billing`, `stripe` (layer-billing) · `notifications` (layer-notifications) ·
`kanban` (layer-kanban, feature) · `admin` with `teams`, `plans`, `queue`, `auditLog`, `notifications` (layer-admin).

## 5. How Layers Import the Backend

Layers **explicitly** import Composition Root primitives, avoiding reliance on Nitro cross-layer merging:

```ts
import { abilityProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { teams } from "@nuxfire/functions/schema";
```

Decision: "Layers manage the frontend; the backend uses explicit imports".
NuxtHub auto-imports (`hubBlob()`) and `nuxt-authorization` (`defineAbility`) are exceptions:
they lack statically importable package paths.

## 6. Real Code Patterns

- **Validation**: `zod` via `.input(z.object({...}))`, with error messages embedded in schema
  (`.min(2, "Board name must be at least 2 characters")`).
- **Tenant Scoping**: procedures receiving `teamIdentifier` (ID **or** slug) resolve the
  team and verify membership in the query itself (`requireTeamMembership`, `requireBoard`,
  `requireColumn` in `layers/kanban/server/trpc/router.ts`). Ability checks answer "can this user
  perform X in team T", never "does T exist and does the user belong to T": both checks are required.
- **Tenant Isolation**: `moveCard` rejects moving cards to columns of another board (`BAD_REQUEST`),
  preventing multi-team members from leaking data across tenants.
- **Errors**: always `TRPCError` with standard `code` (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`,
  `BAD_REQUEST`, `UNAUTHORIZED`, `INTERNAL_SERVER_ERROR`). Postgres uniqueness violation is
  `error.code === "23505"` (postgres.js), not Prisma's `P2002` (`routers/public.ts`).
- **Suspended Teams**: the sole check resides in `teams.get`, which resolves active team context
  globally (`middleware/1.teams.global.ts`). Do not duplicate across individual procedures.
- **Database**: `useDB()` (request-scoped). See `$fireskill-specialist-cloudflare-workers` and `$fireskill-specialist-drizzle`.
- **Realtime & Email**: `ctx.sendWebsocketsEvent(userId, payload)`, `ctx.sendEmail(to, template, props)` (the sender is the installation's `BRAND_EMAIL`, applied by the Emails Worker — never passed by the caller).

## 7. Client Usage

- `useTrpcClient().<namespace>.<proc>.useQuery(input)` (SSR/`useAsyncData`) and
  `.mutate(input)` for mutations — e.g., `useTrpcClient().teams.create.mutate`.
- Types: `RouterInput` / `RouterOutput` from `~~/server/trpc/routers`.
- No centralized frontend `TRPCClientError` handling currently exists (0 usages of `TRPCClientError`);
  each view handles errors locally with `useToast()`.

## 8. What Does NOT Exist (Do Not Assume)

- tRPC router unit tests: no `*.test.ts` files under `server/trpc`. Domain tests reside
  in `shared/utils/abilities.test.ts` and layer `server/utils/*.test.ts`.
- `superjson`/`transformer`, subscriptions, `httpBatchStreamLink`, tRPC v11.
