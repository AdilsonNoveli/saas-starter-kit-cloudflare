import { TRPCError } from "@trpc/server";
import { and, count, eq, or } from "drizzle-orm";
import { z } from "zod";
import { authEmail } from "../../../../../config";
import {
  deleteInvite,
  sendInvite,
  updateInvite,
} from "#shared/utils/abilities";
import {
  abilityProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../trpc";
import {
  teamInvites,
  teamMemberships,
  teams,
} from "@nuxfire/functions/schema";

export default router({
  sendInvite: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        email: z.string().email(),
        roleId: z.string(),
      }),
    )
    .mutation(
      async ({ ctx: { user, origin, authorize, sendEmail }, input }) => {
        const team = await useDB().query.teams.findFirst({
          where: or(
            eq(teams.id, input.teamIdentifier),
            eq(teams.slug, input.teamIdentifier),
          ),
          with: {
            memberships: {
              where: eq(teamMemberships.userId, user.id),
            },
            plan: {
              columns: { maxSeats: true },
            },
          },
        });

        if (!team || !team.memberships.length) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to invite members",
          });
        }
        await authorize(sendInvite, team.id);

        // The single point where a plan's seat limit is enforced. Deliberately
        // only about *new* invites: a team that is already over its limit
        // (because the plan changed under it) keeps every member it has —
        // nothing here removes anyone.
        if (team.plan.maxSeats !== null) {
          const [memberCount] = await useDB()
            .select({ value: count() })
            .from(teamMemberships)
            .where(eq(teamMemberships.teamId, team.id));

          if ((memberCount?.value ?? 0) >= team.plan.maxSeats) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "This team has reached its member limit for the current plan",
            });
          }
        }

        const existingInvite = await useDB().query.teamInvites.findFirst({
          where: and(
            eq(teamInvites.teamId, team.id),
            eq(teamInvites.email, input.email),
          ),
        });

        if (existingInvite) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An invite for this email already exists",
          });
        }

        const [invite] = await useDB()
          .insert(teamInvites)
          .values({
            teamId: team.id,
            email: input.email,
            invitedById: user.id,
            roleId: input.roleId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            status: "PENDING",
          })
          .returning();
        if (!invite) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create invite",
          });
        }
        const inviteLink = `${origin}/invite/${invite.id}`;
        await sendEmail(authEmail, invite.email, "Invitation", {
          teamName: team.name,
          invitedBy: user.name,
          inviteLink,
        });
        return invite;
      },
    ),
  acceptInvite: protectedProcedure
    .input(
      z.object({
        inviteId: z.string(),
      }),
    )
    .mutation(async ({ ctx: { user }, input }) => {
      const invite = await useDB().query.teamInvites.findFirst({
        where: eq(teamInvites.id, input.inviteId),
      });
      if (!invite || invite.email !== user.email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired invite",
        });
      }
      if (invite.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite is no longer valid",
        });
      }
      const membership = await useDB().insert(teamMemberships).values({
        teamId: invite.teamId,
        userId: user.id,
        roleId: invite.roleId,
      });
      await useDB()
        .update(teamInvites)
        .set({
          status: "ACCEPTED",
        })
        .where(eq(teamInvites.id, input.inviteId));
      return membership;
    }),
  updateInviteRole: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        inviteId: z.string(),
        newRoleId: z.string(),
      }),
    )
    .mutation(async ({ ctx: { user, authorize }, input }) => {
      const team = await useDB().query.teams.findFirst({
        where: and(
          or(
            eq(teams.id, input.teamIdentifier),
            eq(teams.slug, input.teamIdentifier),
          ),
        ),
        with: {
          memberships: {
            where: eq(teamMemberships.userId, user.id),
          },
        },
      });
      if (!team || !team.memberships.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to change invite roles",
        });
      }
      await authorize(updateInvite, team.id);

      await useDB()
        .update(teamInvites)
        .set({
          roleId: input.newRoleId,
        })
        .where(eq(teamInvites.id, input.inviteId));

      const updatedInvite = await useDB().query.teamInvites.findFirst({
        where: and(
          eq(teamInvites.id, input.inviteId),
          eq(teamInvites.teamId, team.id),
        ),
        with: {
          role: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
      return updatedInvite;
    }),
  deleteInvite: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        inviteId: z.string(),
      }),
    )
    .mutation(async ({ ctx: { user, authorize }, input }) => {
      const team = await useDB().query.teams.findFirst({
        where: or(
          eq(teams.id, input.teamIdentifier),
          eq(teams.slug, input.teamIdentifier),
        ),
        with: {
          memberships: {
            where: eq(teamMemberships.userId, user.id),
          },
        },
      });
      if (!team || !team.memberships.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete invites",
        });
      }
      await authorize(deleteInvite, team.id);

      const deletedInvite = await useDB()
        .delete(teamInvites)
        .where(
          and(
            eq(teamInvites.id, input.inviteId),
            eq(teamInvites.teamId, team.id),
          ),
        );
      return deletedInvite;
    }),
  getInvite: publicProcedure
    .input(
      z.object({
        inviteId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const invite = await useDB().query.teamInvites.findFirst({
        where: eq(teamInvites.id, input.inviteId),
        with: {
          team: {
            columns: {
              name: true,
              slug: true,
              logo: true,
            },
          },
          role: {
            columns: {
              name: true,
            },
          },
          invitedBy: {
            columns: {
              name: true,
              email: true,
            },
          },
        },
      });
      if (!invite || invite.status !== "PENDING") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired invite",
        });
      }
      return invite;
    }),
});
