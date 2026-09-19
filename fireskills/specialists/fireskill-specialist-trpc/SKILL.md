---
name: fireskill-specialist-trpc
description: Author and review Nuxfire tRPC v10 (trpc-nuxt) routers, procedures, and client usage — publicProcedure, protectedProcedure, abilityProcedure, and platformAdminProcedure, context with Cloudflare bindings, layer router composition (`routers` + `satisfies`), and client consumption via `useTrpcClient()`. Use when touching `apps/app/server/trpc/`, `layers/*/server/trpc/`, or any `useTrpcClient()` call; does not cover database schemas (drizzle) or permission definitions (nuxt-authorization).
---

# tRPC (v10 via trpc-nuxt)

## When to Use

- Activate when creating/modifying routers or procedures, selecting procedure bases, altering context (`createContext`), or consuming endpoints on the frontend.
- Activate when adding a new domain layer containing backend routers (`routers` map).
- Do not activate for database tables and SQL queries: use `$fireskill-specialist-drizzle`; for defining `defineAbility`/permissions: use `$fireskill-specialist-nuxt-authorization`; for creating layers: use `$fireskill-specialist-nuxfire-layers`.
- Combine with `$fireskill-specialist-web-api-design` (contract, errors), `$fireskill-specialist-application-security` (auth, multi-tenancy, MFA), and `$fireskill-specialist-typescript`.

## Workflow

1. Read [references/nuxfire-trpc.md](references/nuxfire-trpc.md).
2. Locate an equivalent router (`layers/kanban/server/trpc/router.ts` for lean features; `layers/teams/server/trpc/teams.ts` for team/RBAC; `layers/admin/server/trpc/*` for platform admin) and follow conventions.
3. Select procedure base using reference table in section 3.
4. For new routers, follow [references/new-router-recipe.md](references/new-router-recipe.md).
5. Validate against recipe checklist and the validation section below.

## Key Rules

- Framework version is **tRPC v10** + `trpc-nuxt` 0.10; do not use v11 APIs.
- Select the least privileged procedure base that fits: `public` < `protected` < `ability`; `platformAdmin` is an independent security axis, never derived from `abilityProcedure`.
- For procedures acting on a team: resolve team from database, verify user membership, and **then** call `authorize(ability, ...)`. Abilities do not prove record existence or tenant membership.
- Verify all client-supplied entity IDs belong to user's team prior to reading or mutating; cross-entity operations verify common parentage (e.g. moving a card within the same board).
- Validate input using Zod in `.input()` with user-friendly error messages in the schema.
- Errors must throw `TRPCError` with appropriate `code`; Postgres unique violation code is `23505`.
- Each layer exports `export const routers = { key: router } satisfies Record<string, AnyRouter>` — named map, fixed identifier, `satisfies` operator, never explicit type annotation.
- `routers/.composition/layer-routers.ts` is auto-generated: never edit manually.
- Layers explicitly import `~~/server/trpc/trpc` and `~~/server/utils/db`.
- Platform admin procedures live strictly under `admin.*`.
- `platformAdminProcedure` fails with uniform `FORBIDDEN` code without leaking authorization failure reasons. Admin mutations log audits; procedures knowing target entity invoke `recordAuditLog()`.
- Optional Cloudflare bindings (`jobsQueue`, `Websockets`) may be disabled: handle absence gracefully.
- No `superjson` transformer: serialization is standard JSON (Date instances serialize as strings).
- Team suspension enforcement lives strictly in `teams.get`.

## Anti-patterns

- Throwing raw `new Error(...)` in procedures — clients receive generic internal errors.
- Stacking `abilityProcedure` on top of `platformAdminProcedure` or vice-versa.
- Relying solely on `authorize` without checking entity existence and team ownership.
- Manually editing `.composition/layer-routers.ts`.
- Annotating `routers` as `Record<string, AnyRouter>` (strips type inference on the client).
- Exporting a single router instance (`kanbanRouter`) instead of the required `routers` map.
- Importing from `~~/server/...` inside frontend code (`app/`); frontend only imports **types** (`AppRouter`, `RouterOutput`).
- Calling `ctx.jobsQueue.send()` without verifying the `jobsQueue` flag is enabled.
- Duplicating team suspension checks across procedures.
- Returning full database rows when clients only need selected columns (column leakage; use Drizzle `columns:` selection).

## Validation

- `bun run typecheck` in `apps/app`: full `AppRouter` inference must remain intact (`trpc.<ns>.<proc>` with typed input and output).
- Tests: `bun run test` (Vitest) at repository root; new abilities require tests in `shared/utils/abilities.test.ts`.
- Test procedure responses under 4 states: authenticated member, unauthenticated, member of another team, and pending MFA; expected responses: `OK`/`UNAUTHORIZED`/`FORBIDDEN`/`FORBIDDEN(MFA_REQUIRED)`.
- For `admin.*`: verify non-elevated sessions receive `FORBIDDEN`, and mutations generate records in `AuditLog`.
- When toggling layers in `config.ts`, confirm `layer-routers.ts` regenerates cleanly.

## Related Skills

- `$fireskill-specialist-nuxt-authorization` — abilities and `authorize`.
- `$fireskill-specialist-drizzle` — database queries and schema with `useDB()`.
- `$fireskill-specialist-nuxfire-layers` — structure and registration of domain layers.
- `$fireskill-specialist-nuxt` — composables and SSR query hooks (`useQuery`).
- `$fireskill-specialist-cloudflare-workers` — Cloudflare bindings and I/O rules.
- `$fireskill-specialist-openauth` — source of `ctx.session`.
- `$fireskill-specialist-web-api-design` and `$fireskill-specialist-application-security`.
