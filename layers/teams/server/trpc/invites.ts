import { TRPCError } from "@trpc/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod/v4";
// See the note in teams.ts: layers reach the Composition Root's tRPC
// primitives and server utils by explicit import, never by Nitro's merge.
import {
  abilityProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import {
  teamInvites,
  teamMemberships,
  teams,
  userPreferences,
} from "@nuxfire/functions/schema";
import {
  countPendingInvites,
  countTeamMembers,
  hasSeatAvailable,
  isInviteAcceptable,
} from "../utils/team-seats";
import { inviteMatchesUser } from "../utils/invite-policy";
import {
  teamsDeleteInvite,
  teamsSendInvite,
  teamsUpdateInvite,
} from "../../shared/utils/abilities";

export const invitesRouter = router({
  sendInvite: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        // Stored lower-cased (AC-007), so the duplicate check below and the
        // match in acceptInvite never depend on how the address was typed.
        email: z.string().trim().toLowerCase().email(),
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
          },
        });

        if (!team || !team.memberships.length) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to invite members",
          });
        }
        await authorize(teamsSendInvite, team.id);

        // Seats are enforced here *and* again in acceptInvite. Counting only
        // members here let the limit be bypassed outright: every pending
        // invite saw the same member count, so a 3-seat team with 2 members
        // could send any number of invites and have them all accepted. A live
        // invite therefore holds a seat, exactly like a member does.
        //
        // Deliberately only about *new* invites: a team already over its limit
        // (because the plan changed under it) keeps every member it has —
        // nothing here removes anyone.
        //
        // `team.maxSeats` (not `team.plan.maxSeats`): denormalized onto Team
        // by billing whenever it sets a plan (SPEC-0005) — this base layer has
        // no relation to `Plan` to query through. `null` means unlimited,
        // whether because the plan has no seat cap or because there is no
        // plan at all (billing disabled, or none assigned yet) — the same
        // outcome either way. The two counts are only worth fetching when
        // there is a cap to check against.
        if (team.maxSeats !== null) {
          const [members, pendingInvites] = await Promise.all([
            countTeamMembers(team.id),
            countPendingInvites(team.id),
          ]);

          if (!hasSeatAvailable(team.maxSeats, members + pendingInvites)) {
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
        // The invitee may have no account, so the e-mail speaks the
        // inviter's language (DEC-016): their preferences row, English
        // without one. Read through the schema barrel, not the account layer
        // (the account -> teams edge is one way, AC-047).
        const inviterPreferences = await useDB().query.userPreferences.findFirst({
          where: eq(userPreferences.userId, user.id),
          columns: { locale: true },
        });
        const locale = inviterPreferences?.locale;
        await sendEmail(invite.email, "Invitation", {
          teamName: team.name,
          invitedBy: user.name,
          inviteLink,
          locale: locale === "pt-br" || locale === "es" ? locale : "en",
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
        with: {
          team: {
            columns: { maxSeats: true },
          },
        },
      });
      if (!invite || !inviteMatchesUser(invite, user)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired invite",
        });
      }

      // Expiry used to be decorative: `expiresAt` was written on every invite
      // and then never read, so a link stayed valid forever. The status check
      // alone could not catch that — an expired invite is still "PENDING".
      if (!isInviteAcceptable(invite)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite is no longer valid",
        });
      }

      const existingMembership = await useDB().query.teamMemberships.findFirst({
        where: and(
          eq(teamMemberships.teamId, invite.teamId),
          eq(teamMemberships.userId, user.id),
        ),
      });
      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this team",
        });
      }

      // The seat limit is re-checked here, not just when the invite was sent:
      // accepting is the moment a seat is actually taken, and the plan can
      // change (or other invites can land) between the two. Counts members
      // only — this invite is converting into one, so the seat it held as a
      // pending invite is the seat being filled.
      //
      // This read sits outside the transaction below, so two invites accepted
      // in the same instant can still both pass. Closing that fully needs row
      // locking on the team; the window is milliseconds and the failure mode
      // is one seat over, so it is deliberately not paid for here.
      //
      // `invite.team.maxSeats` (not `.plan.maxSeats`): see the identical note
      // in `sendInvite` above (SPEC-0005).
      const maxSeats = invite.team.maxSeats;
      if (maxSeats !== null) {
        const members = await countTeamMembers(invite.teamId);
        if (!hasSeatAvailable(maxSeats, members)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "This team has reached its member limit for the current plan",
          });
        }
      }

      // One transaction: the membership and the invite's new status have to
      // land together. As two separate statements, a failure between them left
      // the user a member of a team whose invite stayed PENDING — still
      // holding a seat, and still re-usable.
      return useDB().transaction(async (tx) => {
        const [membership] = await tx
          .insert(teamMemberships)
          .values({
            teamId: invite.teamId,
            userId: user.id,
            roleId: invite.roleId,
          })
          .returning();

        await tx
          .update(teamInvites)
          .set({ status: "ACCEPTED" })
          .where(eq(teamInvites.id, input.inviteId));

        return membership;
      });
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
      await authorize(teamsUpdateInvite, team.id);

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
      await authorize(teamsDeleteInvite, team.id);

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
