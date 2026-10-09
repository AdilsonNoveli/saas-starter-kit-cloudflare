import { TRPCError } from "@trpc/server";
import type { H3Event } from "h3";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
// Layers reach the Composition Root's tRPC primitives and server utils by
// explicit import, never by Nitro's server-dir merge: these router modules are
// imported as plain modules by the generated
// `.composition/layer-routers.ts`, outside any auto-import transform.
import { platformAdminProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { recordAuditLog } from "~~/server/utils/audit-log";
// The aggregator barrel, deliberately — NOT `@nuxfire/layer-teams/server/
// database/schema`. Every one of these tables now lives in another layer,
// and going through `@nuxfire/functions/schema` is what let this file move
// with zero import edits and keeps this layer free of a direct dependency on
// the `teams` package for data access alone (see layer.manifest.ts's
// `requires`).
//
// Deliberately NOT `plans`/`subscriptions` (SPEC-0005): this file used to
// import them from this same barrel, gated at the point of use by an `if
// (layers.features.billing)` branch. That kept the runtime safe but not the
// build — `admin` (a base layer) still had a real import resolving into
// `@nuxfire/layer-billing` (a feature layer), caught by
// `scripts/layer-dependency-direction.test.ts`'s barrel-aware check once it
// learned to look past the barrel's re-export. The billing-aware versions of
// `listTeams`/`getTeamDetail` (with plan/subscription columns) now live in
// `apps/app/server/trpc/routers/admin-teams-billing.ts` (the Composition
// Root, which is allowed to know about every layer) and replace this file's
// `teams` export under `admin.teams` only when billing is active — see
// `apps/app/server/trpc/routers/index.ts`.
import { jobs, teamMemberships, teams } from "@nuxfire/functions/schema";

export const teamStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

/**
 * Platform-owner view over every tenant. The one thing that makes this router
 * different from `routers/teams.ts` is what it does *not* do: no query here is
 * filtered by `teamMemberships.userId` of the caller. That is the whole point
 * of the module, and also why every procedure sits behind
 * `platformAdminProcedure` — losing that guard turns each of these into a
 * cross-tenant leak.
 */
export default router({
  listTeams: platformAdminProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(100).optional(),
          planId: z.string().optional(),
          status: teamStatusSchema.optional(),
          // No server-side pagination: nothing else in this app paginates on
          // the server, and the admin table filters/sorts client-side
          // (TanStack). The cap is here so the payload stays bounded until
          // there is a real reason to page.
          limit: z.number().int().min(1).max(200).default(100),
        })
        .default({ limit: 100 }),
    )
    .query(async ({ input }) => {
      const filters = [
        input.search
          ? or(
              ilike(teams.name, `%${input.search}%`),
              ilike(teams.slug, `%${input.search}%`),
            )
          : undefined,
        input.planId ? eq(teams.planId, input.planId) : undefined,
        input.status ? eq(teams.status, input.status) : undefined,
      ].filter((filter) => filter !== undefined);

      // Member counts come from a grouped join, not a per-row query: one
      // statement for the whole page instead of N+1. `count()` over the joined
      // column (never `count()` over the row) is what makes a team with no
      // members come back as 0 rather than 1.
      //
      // `planName`/`planTier` are always null here (SPEC-0005): this base
      // router never queries `Plan` — see `apps/app/server/trpc/routers/
      // admin-teams-billing.ts` for the version with real values, which
      // replaces this procedure under `admin.teams` when billing is active.
      return useDB()
        .select({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
          description: teams.description,
          logo: teams.logo,
          status: teams.status,
          createdAt: teams.createdAt,
          planId: teams.planId,
          planName: sql<string | null>`null`,
          planTier: sql<string | null>`null`,
          memberCount: count(teamMemberships.id),
        })
        .from(teams)
        .leftJoin(teamMemberships, eq(teamMemberships.teamId, teams.id))
        .where(filters.length ? and(...filters) : undefined)
        .groupBy(teams.id)
        .orderBy(desc(teams.createdAt))
        .limit(input.limit);
    }),

  getTeamDetail: platformAdminProcedure
    .input(z.object({ teamIdentifier: z.string() }))
    .query(async ({ input }) => {
      const team = await useDB().query.teams.findFirst({
        where: or(
          eq(teams.id, input.teamIdentifier),
          eq(teams.slug, input.teamIdentifier),
        ),
        with: {
          // Every member, not just the caller's own membership — the tenant
          // router scopes this to `user.id`, and that scoping is exactly what
          // must not happen here.
          memberships: {
            with: {
              user: {
                columns: { id: true, name: true, email: true, image: true },
              },
              role: {
                columns: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      // `subscription` is always null here (SPEC-0005) — this base router
      // never queries `Subscription`. See `admin-teams-billing.ts`.
      const [jobCount] = await useDB()
        .select({ value: count() })
        .from(jobs)
        .where(eq(jobs.teamId, team.id));

      return {
        ...team,
        subscription: null as AdminTeamSubscription | null,
        jobCount: jobCount?.value ?? 0,
      };
    }),

  suspendTeam: platformAdminProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(({ ctx, input }) =>
      setTeamStatus(ctx, input.teamId, "SUSPENDED", "admin.teams.suspendTeam"),
    ),

  reactivateTeam: platformAdminProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(({ ctx, input }) =>
      setTeamStatus(ctx, input.teamId, "ACTIVE", "admin.teams.reactivateTeam"),
    ),
});

// Shape billing's enriched `getTeamDetail` (admin-teams-billing.ts) fills in;
// kept here so both versions return the exact same type and the client never
// sees a shape change depending on whether billing is active.
export interface AdminTeamSubscription {
  id: string;
  status: string;
  provider: string;
  currentPeriodEnd: Date | null;
  plan: { name: string } | null;
}

/**
 * Suspend and reactivate are the same statement with a different value, so
 * they share one body — including the explicit audit line. The middleware
 * already records a generic entry as a safety net, but it cannot know that
 * `teamId` means a team, so the real `targetType`/`targetId` is recorded here.
 * Both lines existing is expected.
 *
 * Exported so `admin-teams-billing.ts` (Composition Root) can reuse it for
 * its own `suspendTeam`/`reactivateTeam` — those two never touch billing, so
 * duplicating them there would just be the same code twice.
 */
export async function setTeamStatus(
  ctx: { user: { id: string }; event: H3Event },
  teamId: string,
  status: z.infer<typeof teamStatusSchema>,
  action: string,
) {
  const [team] = await useDB()
    .update(teams)
    .set({ status })
    .where(eq(teams.id, teamId))
    .returning({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      status: teams.status,
    });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  await recordAuditLog({
    actorUserId: ctx.user.id,
    action,
    targetType: "team",
    targetId: team.id,
    metadata: { status },
    ip: getRequestIP(ctx.event, { xForwardedFor: true }) ?? null,
  });

  return team;
}
