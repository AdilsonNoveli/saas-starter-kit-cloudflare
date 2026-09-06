import { TRPCError } from "@trpc/server";
import { and, count, eq, or } from "drizzle-orm";
import { z } from "zod";
import {
  deleteTeam,
  getTeamDetails,
  listMembersAndInvites,
  listTeams,
  removeMember,
  updateMemberRole,
  updateTeamDetails,
} from "#shared/utils/abilities";
import { abilityProcedure, protectedProcedure, router } from "../trpc";
import {
  teamInvites,
  teamMemberships,
  teams,
  roles,
} from "@nuxfire/functions/schema";

export default router({
  list: abilityProcedure.query(async ({ ctx: { authorize, user } }) => {
    await authorize(listTeams);

    const teams = await useDB().query.teams.findMany({
      with: {
        memberships: {
          where: eq(teamMemberships.userId, user.id),
        },
      },
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
      },
    });

    return teams.filter((team) => team.memberships.length > 0);
  }),
  get: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
      }),
    )
    .query(async ({ ctx: { authorize, user }, input }) => {
      const team = await useDB().query.teams.findFirst({
        where: or(
          eq(teams.id, input.teamIdentifier),
          eq(teams.slug, input.teamIdentifier),
        ),
        with: {
          memberships: {
            where: eq(teamMemberships.userId, user.id),
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              role: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!team || !team.memberships?.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found or you do not have access",
        });
      }
      // The single enforcement point for a suspended team, deliberately here
      // and nowhere else. This procedure is what resolves "which team is this
      // URL" for the entire tenant app: middleware/1.teams.global.ts calls it
      // through useTeamsStore().fetchTeam() before any /[[team]]/* page
      // renders, and a rejection there sends the user to /select-team.
      // Repeating the check in the middleware, or in each of the other
      // team-scoped procedures, is how one forgotten path ends up still
      // serving a suspended tenant.
      if (team.status === "SUSPENDED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This team has been suspended",
        });
      }
      await authorize(getTeamDetails, team.id);
      return team;
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(2, "Team name must be at least 2 characters")
          .max(50, "Team name must be max 50 characters"),
        description: z
          .string()
          .max(500, "Description must be max 500 characters")
          .optional(),
        slug: z
          .string()
          .min(2, "Slug must be at least 2 characters")
          .max(50, "Slug must be max 50 characters")
          .regex(
            /^[a-z0-9-]+$/,
            "Slug can only contain lowercase letters, numbers, and hyphens",
          ),
      }),
    )
    .mutation(async ({ ctx: { user }, input }) => {
      const existingTeam = await useDB().query.teams.findFirst({
        where: eq(teams.slug, input.slug),
      });

      if (existingTeam) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Team slug is already in use",
        });
      }
      await ensureSystemRoles();
      const ownerRole = await useDB().query.roles.findFirst({
        where: (role) =>
          and(eq(role.name, "Owner"), eq(role.isSystemRole, true)),
      });

      if (!ownerRole) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Owner role could not be found or created",
        });
      }
      const freePlan = await ensureFreePlan();
      if (!freePlan) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Free plan could not be found or created",
        });
      }

      const [team] = await useDB()
        .insert(teams)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description,
          planId: freePlan.id,
        })
        .returning();

      if (!team) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create team",
        });
      }

      await useDB().insert(teamMemberships).values({
        teamId: team.id,
        userId: user.id,
        roleId: ownerRole.id,
      });

      return team;
    }),
  update: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        name: z
          .string()
          .min(2, "Team name must be at least 2 characters")
          .max(50, "Team name must be max 50 characters")
          .optional(),
        description: z
          .string()
          .max(500, "Description must be max 500 characters")
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx: { denies, user }, input }) => {
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

      if (
        !team ||
        team.memberships.length === 0 ||
        (await denies(updateTeamDetails, team.id))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this team",
        });
      }
      const updateData: { name?: string; description?: string | null } = {};
      if (input.name !== undefined) {
        updateData.name = input.name;
      }
      if (input.description !== undefined) {
        updateData.description = input.description;
      }
      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No update data provided",
        });
      }

      const updatedTeam = await useDB()
        .update(teams)
        .set(updateData)
        .where(eq(teams.id, team.id))
        .returning({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
          description: teams.description,
        });

      return updatedTeam;
    }),
  delete: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
      }),
    )
    .mutation(async ({ ctx: { denies, user }, input }) => {
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

      if (
        !team ||
        team.memberships.length === 0 ||
        (await denies(deleteTeam, team.id))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can delete a team",
        });
      }

      const deletedTeam = await useDB()
        .delete(teams)
        .where(eq(teams.id, team.id))
        .returning({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        });

      return deletedTeam;
    }),
  listMembersAndInvites: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
      }),
    )
    .query(async ({ ctx: { user, denies }, input }) => {
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

      if (
        !team ||
        team.memberships.length === 0 ||
        (await denies(listMembersAndInvites, team.id))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this team",
        });
      }

      const members = await useDB().query.teamMemberships.findMany({
        where: eq(teamMemberships.teamId, team.id),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          role: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
      const invites = await useDB().query.teamInvites.findMany({
        where: and(
          eq(teamInvites.teamId, team.id),
          eq(teamInvites.status, "PENDING"),
        ),
        with: {
          invitedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      const rolesList = await useDB().query.roles.findMany({
        where: or(eq(roles.teamId, team.id), eq(roles.isSystemRole, true)),
      });

      return {
        members,
        invites,
        roles: rolesList,
      };
    }),
  updateMemberRole: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        memberId: z.string(),
        newRoleId: z.string(),
      }),
    )
    .mutation(async ({ ctx: { denies, user }, input }) => {
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

      const membership = team?.memberships[0];
      if (
        !team ||
        !membership ||
        (await denies(updateMemberRole, team.id, input.memberId))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to change roles",
        });
      }

      const teamMembershipRole = await useDB().query.roles.findFirst({
        where: eq(roles.id, membership.roleId),
      });

      const targetMembership = await useDB().query.teamMemberships.findFirst({
        where: and(
          eq(teamMemberships.teamId, team.id),
          eq(teamMemberships.userId, input.memberId),
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

      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found in this team",
        });
      }

      const ownerRole = await useDB().query.roles.findFirst({
        where: and(eq(roles.name, "Owner"), eq(roles.teamId, team.id)),
      });

      const isCurrentlyOwner = targetMembership.roleId === ownerRole?.id;
      const isNewRoleOwner = input.newRoleId === ownerRole?.id;

      // Only team owners can change Owner roles
      if (
        (isCurrentlyOwner || isNewRoleOwner) &&
        teamMembershipRole?.name !== "Owner"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can modify Owner roles",
        });
      }

      await useDB()
        .update(teamMemberships)
        .set({
          roleId: input.newRoleId,
        })
        .where(
          and(
            eq(teamMemberships.teamId, team.id),
            eq(teamMemberships.userId, input.memberId),
          ),
        );

      const updatedMembership = await useDB().query.teamMemberships.findFirst({
        where: and(
          eq(teamMemberships.teamId, team.id),
          eq(teamMemberships.userId, input.memberId),
        ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
      return updatedMembership;
    }),
  removeMember: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ ctx: { denies, user }, input }) => {
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
      const membership = team?.memberships[0];
      if (
        !team ||
        !membership ||
        (await denies(removeMember, team.id, input.memberId))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to remove members",
        });
      }
      const teamMembershipRole = await useDB().query.roles.findFirst({
        where: eq(roles.id, membership.roleId),
      });

      const targetMembership = await useDB().query.teamMemberships.findFirst({
        where: and(
          eq(teamMemberships.teamId, team.id),
          eq(teamMemberships.userId, input.memberId),
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
      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found in this team",
        });
      }
      const ownerRole = await useDB().query.roles.findFirst({
        where: and(eq(roles.name, "Owner"), eq(roles.isSystemRole, true)),
      });
      if (!ownerRole) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Owner role not found",
        });
      }
      const isTargetOwner = targetMembership.roleId === ownerRole?.id;
      const isCurrentUserOwner = teamMembershipRole?.name === "Owner";
      if (isTargetOwner && !isCurrentUserOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can remove other owners",
        });
      }
      const [ownerCount] = await useDB()
        .select({
          count: sql`count(*)`.mapWith(Number),
        })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, team.id),
            eq(teamMemberships.roleId, ownerRole.id),
          ),
        );
      if (
        ownerCount == undefined ||
        (ownerCount?.count <= 1 && input.memberId === user.id)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the last team owner",
        });
      }
      await useDB()
        .delete(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, team.id),
            eq(teamMemberships.userId, input.memberId),
          ),
        );

      const removedMembership = await useDB().query.teamMemberships.findFirst({
        where: and(
          eq(teamMemberships.teamId, team.id),
          eq(teamMemberships.userId, input.memberId),
        ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return removedMembership;
    }),
  uploadTeamLogo: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        key: z.string(),
      }),
    )
    .mutation(async ({ input, ctx: { origin } }) => {
      const team = await useDB().query.teams.findFirst({
        where: or(
          eq(teams.id, input.teamIdentifier),
          eq(teams.slug, input.teamIdentifier),
        ),
      });

      const baseUrl = `${origin}/api/profile-pictures?key=`;
      if (team?.logo) {
        const previousKey = team.logo.slice(baseUrl.length);
        if (previousKey.startsWith("profile/"))
          try {
            await hubBlob().del(previousKey);
          } catch {
            // didn't exist
          }
      }
      const imageUrl = `${baseUrl}${input.key}`;
      const [updatedTeam] = await useDB()
        .update(teams)
        .set({ logo: imageUrl })
        .where(
          or(
            eq(teams.id, input.teamIdentifier),
            eq(teams.slug, input.teamIdentifier),
          ),
        )
        .returning({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
          logo: teams.logo,
        });
      return {
        team: updatedTeam,
        message: "Team Logo updated successfully",
      };
    }),
  removeTeamLogo: abilityProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
      }),
    )
    .mutation(async ({ ctx: { origin }, input }) => {
      const team = await useDB().query.teams.findFirst({
        where: or(
          eq(teams.id, input.teamIdentifier),
          eq(teams.slug, input.teamIdentifier),
        ),
      });

      const baseUrl = `${origin}/api/profile-pictures?key=`;
      if (team?.logo) {
        const previousKey = team.logo.slice(baseUrl.length);
        if (previousKey.startsWith("profile/"))
          try {
            await hubBlob().del(previousKey);
          } catch {
            // didn't exist
          }

        const [updatedTeam] = await useDB()
          .update(teams)
          .set({ logo: null })
          .where(eq(teams.id, team.id))
          .returning({
            id: teams.id,
            name: teams.name,
            slug: teams.slug,
            logo: teams.logo,
          });
        return {
          team: updatedTeam,
          message: "Team Logo removed successfully",
        };
      }
    }),
});
