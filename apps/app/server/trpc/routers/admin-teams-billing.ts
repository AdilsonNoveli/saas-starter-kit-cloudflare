import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import {
  jobs,
  plans,
  subscriptions,
  teamMemberships,
  teams,
} from "@nuxfire/functions/schema";
import {
  setTeamStatus,
  teamStatusSchema,
  type AdminTeamSubscription,
} from "@nuxfire/layer-admin/server/trpc/admin-teams";
import { platformAdminProcedure, router } from "../trpc";

// The billing-aware `admin.teams` (SPEC-0005): `layers/admin/server/trpc/
// admin-teams.ts` is a base layer and must never import `@nuxfire/layer-
// billing` (enforced by scripts/layer-dependency-direction.test.ts, which
// also checks past the schema barrel — this is exactly the file that made
// that check necessary: `listTeams`/`getTeamDetail` used to import `plans`/
// `subscriptions` from the barrel, gated at the point of use, which kept
// runtime safe but left a real build-time dependency on billing inside a
// base layer). This router lives in the Composition Root instead, which is
// allowed to know about every layer, and replaces `admin.teams` entirely
// (via `apps/app/server/trpc/routers/index.ts`) only when
// `layers.features.billing` is true — otherwise the base version from
// `@nuxfire/layer-admin` is used unchanged. `suspendTeam`/`reactivateTeam`
// never touch billing, so they reuse admin's own `setTeamStatus` instead of
// duplicating it.
export function buildAdminTeamsRouterWithBilling() {
  return router({
    listTeams: platformAdminProcedure
      .input(
        z
          .object({
            search: z.string().trim().max(100).optional(),
            planId: z.string().optional(),
            status: teamStatusSchema.optional(),
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

        const [subscriptionRow, [jobCount]] = await Promise.all([
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

        const subscription: AdminTeamSubscription | null = subscriptionRow
          ? {
              id: subscriptionRow.id,
              status: subscriptionRow.status,
              provider: subscriptionRow.provider,
              currentPeriodEnd: subscriptionRow.currentPeriodEnd,
              plan: { name: subscriptionRow.plan.name },
            }
          : null;

        return {
          ...team,
          subscription,
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
}
