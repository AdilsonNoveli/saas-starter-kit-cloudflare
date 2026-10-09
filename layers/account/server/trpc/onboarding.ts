import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { protectedProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import {
  teamInvites,
  teamMemberships,
  userPreferences,
  users,
} from "@nuxfire/functions/schema";
import { createTeamWithOwner } from "@nuxfire/layer-teams/server/utils/team-creation";
import { inviteMatchesUser } from "@nuxfire/layer-teams/server/utils/invite-policy";
import {
  countTeamMembers,
  hasSeatAvailable,
  isInviteAcceptable,
} from "@nuxfire/layer-teams/server/utils/team-seats";
import { validateSlug } from "@nuxfire/layer-teams/shared/utils/slug";
import {
  completeOnboarding,
  getOnboardingState,
  type OnboardingDeps,
  type OnboardingUser,
} from "../services/onboarding";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../../shared/utils/onboarding-name";

// Thin (DEC-018): builds the transaction, the Space creation and the invite
// acceptance over `useDB()` and hands the logic to services/onboarding.ts.
// Errors leave as the stable code (DEC-015).

type DbTransaction = Parameters<Parameters<ReturnType<typeof useDB>["transaction"]>[0]>[0];

/** What the dependencies below need from the transaction handle. */
interface AccountTx {
  db: DbTransaction;
}

function findPendingInvite(tx: AccountTx, emailLower: string) {
  // Invites are stored lower-cased (invites.sendInvite).
  return tx.db.query.teamInvites
    .findFirst({
      where: and(
        eq(teamInvites.email, emailLower),
        eq(teamInvites.status, "PENDING"),
        or(isNull(teamInvites.expiresAt), gt(teamInvites.expiresAt, new Date())),
      ),
      with: { team: { columns: { name: true, slug: true, maxSeats: true } } },
      orderBy: desc(teamInvites.createdAt),
    })
    .then((invite) => invite ?? null);
}

type PendingInvite = NonNullable<Awaited<ReturnType<typeof findPendingInvite>>>;

function onboardingDeps(user: OnboardingUser): OnboardingDeps<AccountTx, PendingInvite> {
  return {
    repo: {
      transaction: (fn) =>
        useDB().transaction((db) =>
          fn({
            db,
            async updateUserName(userId, name) {
              await db.update(users).set({ name }).where(eq(users.id, userId));
            },
            async insertPreferences(row) {
              await db.insert(userPreferences).values(row);
            },
          }),
        ),
    },
    // DEC-001: the one Space creation path, inside this transaction.
    createSpace: (tx, input) => createTeamWithOwner(tx.db, input),
    findPendingInvite,
    // The same checks and writes as invites.acceptInvite, inside this
    // transaction; any refusal is `invite_unavailable`.
    async acceptInvite(tx, invite, userId) {
      if (!inviteMatchesUser(invite, user) || !isInviteAcceptable(invite)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "invite_unavailable" });
      }
      const existingMembership = await tx.db.query.teamMemberships.findFirst({
        where: and(
          eq(teamMemberships.teamId, invite.teamId),
          eq(teamMemberships.userId, userId),
        ),
      });
      if (existingMembership) {
        throw new TRPCError({ code: "CONFLICT", message: "invite_unavailable" });
      }
      const maxSeats = invite.team.maxSeats;
      if (maxSeats !== null && !hasSeatAvailable(maxSeats, await countTeamMembers(invite.teamId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "invite_unavailable" });
      }
      await tx.db.insert(teamMemberships).values({
        teamId: invite.teamId,
        userId,
        roleId: invite.roleId,
      });
      await tx.db
        .update(teamInvites)
        .set({ status: "ACCEPTED" })
        .where(eq(teamInvites.id, invite.id));
      return { slug: invite.team.slug };
    },
    now: () => new Date(),
  };
}

function onboardingUser(user: { id: string; email?: string | null; name?: string | null }): OnboardingUser {
  if (!user.email) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "generic" });
  }
  return { id: user.id, email: user.email, name: user.name ?? null };
}

const name = z.string().trim().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH);
const preferences = z.object({
  // Plain strings: the service validates them and answers with the code.
  locale: z.string(),
  timeZone: z.string(),
  theme: z.string().optional(),
  dateFormat: z.string().optional(),
  nameOrder: z.string().optional(),
});

export default router({
  state: protectedProcedure.query(({ ctx }) => {
    const user = onboardingUser(ctx.user);
    return getOnboardingState(onboardingDeps(user), user);
  }),
  complete: protectedProcedure
    .input(
      z.union([
        z.object({
          name,
          preferences,
          space: z.object({
            name,
            // The one slug rule (teams shared/utils/slug.ts): the message is the code.
            slug: z.string().superRefine((slug, ctx) => {
              const result = validateSlug(slug);
              if (result !== "ok") ctx.addIssue({ code: "custom", message: result });
            }),
          }),
        }),
        z.object({ name, preferences, inviteId: z.string() }),
      ]),
    )
    .mutation(({ input, ctx }) => {
      const user = onboardingUser(ctx.user);
      return completeOnboarding(onboardingDeps(user), { ...input, user });
    }),
});
