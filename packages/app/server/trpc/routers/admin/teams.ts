import { TRPCError } from "@trpc/server";
import type { H3Event } from "h3";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { platformAdminProcedure, router } from "../../trpc";
import {
  jobs,
  plans,
  subscriptions,
  teamMemberships,
  teams,
} from "@nuxfire/functions/schema";

const teamStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

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
          planName: plans.name,
          planTier: plans.tier,
          memberCount: count(teamMemberships.id),
        })
        .from(teams)
        .leftJoin(plans, eq(plans.id, teams.planId))
        .leftJoin(teamMemberships, eq(teamMemberships.teamId, teams.id))
        .where(filters.length ? and(...filters) : undefined)
        .groupBy(teams.id, plans.id)
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

      const [subscription, [jobCount]] = await Promise.all([
        useDB().query.subscriptions.findFirst({
          where: eq(subscriptions.teamId, team.id),
          with: { plan: true },
          orderBy: desc(subscriptions.createdAt),
        }),
        useDB()
          .select({ value: count() })
          .from(jobs)
          .where(eq(jobs.teamId, team.id)),
      ]);

      return {
        ...team,
        subscription: subscription ?? null,
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

/**
 * Suspend and reactivate are the same statement with a different value, so
 * they share one body — including the explicit audit line. The middleware
 * already records a generic entry as a safety net, but it cannot know that
 * `teamId` means a team, so the real `targetType`/`targetId` is recorded here.
 * Both lines existing is expected.
 */
async function setTeamStatus(
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
