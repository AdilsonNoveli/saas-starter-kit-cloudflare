import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { and, count, eq, ne } from "drizzle-orm";
import { protectedProcedure, router } from "~~/server/trpc/trpc";
import { recordAuditLog } from "~~/server/utils/audit-log";
import { useDB } from "~~/server/utils/db";
import {
  emailChangeRequests,
  mfaRecoveryCodes,
  notifications,
  roles,
  teamInvites,
  teamMemberships,
  userPreferences,
  userSessions,
  users,
} from "@nuxfire/functions/schema";
import { deleteAccountRows } from "../services/account-deletion";
// Relative, not `#nuxfire/config`: Nitro does not resolve that tsconfig alias.
import { identityDeletePath } from "../../../../config";
import { signOutOthers } from "../services/sessions";
import { emailChangeRouter } from "./email-change";
import onboardingRouter from "./onboarding";
import preferencesRouter from "./preferences";
import { sessionsDeps, sessionsRouter } from "./sessions";

// Nested under `account` so the client calls `trpc.account.preferences.*`,
// `.onboarding.*`, `.sessions.*` and `.email.*` (SPEC-0010).
export default router({
  preferences: preferencesRouter,
  onboarding: onboardingRouter,
  sessions: sessionsRouter,
  email: emailChangeRouter,
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(2, "Name must be at least 2 characters")
          .max(50, "Name must be max 50 characters"),
      }),
    )
    .mutation(async ({ input, ctx: { user } }) => {
      const { name } = input;
      const updateData: {
        name?: string;
        passwordHash?: string;
        passwordSalt?: string;
      } = {};
      updateData.name = name;
      const [updatedUser] = await useDB()
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id))
        .returning({ id: users.id, name: users.name, email: users.email });
      return {
        user: updatedUser,
        message: "Profile updated successfully",
      };
    }),
  removeProfilePicture: protectedProcedure.mutation(
    async ({ ctx: { origin, user } }) => {
      const baseUrl = `${origin}/api/profile-pictures?key=`;
      if (user.image) {
        const previousKey = user.image.slice(baseUrl.length);
        if (previousKey.startsWith("profile/"))
          try {
            await hubBlob().del(previousKey);
          } catch {
            // didn't exist
          }
      }
      const [updatedUser] = await useDB()
        .update(users)
        .set({ image: "" })
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        });
      return {
        user: updatedUser,
        message: "Profile picture removed successfully",
      };
    },
  ),
  updateProfilePicture: protectedProcedure
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .mutation(async ({ input, ctx: { origin, user } }) => {
      const baseUrl = `${origin}/api/profile-pictures?key=`;
      if (user.image) {
        const previousKey = user.image.slice(baseUrl.length);
        if (previousKey.startsWith("profile/"))
          try {
            await hubBlob().del(previousKey);
          } catch {
            // didn't exist
          }
      }
      const imageUrl = `${baseUrl}${input.key}`;
      const [updatedUser] = await useDB()
        .update(users)
        .set({ image: imageUrl })
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        });
      return {
        user: updatedUser,
        message: "Profile picture updated successfully",
      };
    }),

  /**
   * Erases the caller's account from both stores.
   *
   * Identity (credentials, sessions) lives in the auth Worker's KV; the
   * profile and everything hanging off it lives in Postgres. There is no
   * cascade between them — they are separate systems, and most of the schema
   * does not even declare foreign keys onto User — so the erasure is an
   * ordered, explicit operation rather than a delete that fans out.
   *
   * Identity goes first on purpose. If a later step fails, the account is
   * already unusable and the leftover rows can be cleaned up; do it the
   * other way round and a failure leaves a working login whose profile the
   * next sign-in simply recreates (api/auth/callback.ts upserts it), so the
   * data the person asked to erase quietly comes back.
   */
  deleteAccount: protectedProcedure
    .input(
      z.object({
        // Typing the address is the confirmation step — this is destructive
        // and irreversible.
        confirmEmail: z.string(),
      }),
    )
    .mutation(async ({ input, ctx: { user, event, runtimeConfig } }) => {
      const email = user.email?.toLowerCase();
      if (!email) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This account has no email address to verify against.",
        });
      }
      if (input.confirmEmail.trim().toLowerCase() !== email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The email you typed does not match this account.",
        });
      }

      // Refuse to strand a team. Leaving a team with members but no owner
      // would make it unmanageable, and nothing else in the app can repair
      // that, so ownership has to be handed over first.
      const ownedTeams = await useDB()
        .select({ teamId: teamMemberships.teamId })
        .from(teamMemberships)
        .innerJoin(roles, eq(roles.id, teamMemberships.roleId))
        .where(
          and(eq(teamMemberships.userId, user.id), eq(roles.name, "Owner")),
        );
      for (const { teamId } of ownedTeams) {
        const [remaining] = await useDB()
          .select({ others: count() })
          .from(teamMemberships)
          .where(
            and(
              eq(teamMemberships.teamId, teamId),
              ne(teamMemberships.userId, user.id),
            ),
          );
        if ((remaining?.others ?? 0) > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "You are the only owner of a team that still has members. Transfer ownership or remove the members first.",
          });
        }
      }

      // Step 1 — identity. AuthKV is bound to the auth Worker only, so this
      // goes over the service binding (infra/app.ts's `link: [auth]`).
      const authBinding = (
        event.context as {
          cloudflare?: { env?: { Auth?: { fetch: typeof fetch } } };
        }
      )?.cloudflare?.env?.Auth;
      if (!authBinding) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Auth service binding is unavailable.",
        });
      }
      const response = await authBinding.fetch(
        `${runtimeConfig.public.authUrl}${identityDeletePath}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-admin-secret": runtimeConfig.authAdminSecret,
          },
          body: JSON.stringify({ userId: user.id, email }),
        },
      );
      if (!response.ok) {
        console.error("account deletion: identity erasure failed", {
          userId: user.id,
          status: response.status,
          body: await response.text().catch(() => ""),
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not delete the account. Nothing was removed.",
        });
      }

      // Step 2 — application data. Ordered children-before-parent by hand:
      // only this layer's own tables (preferences, sessions, e-mail change)
      // declare a foreign key onto User, and they go first.
      await deleteAccountRows(
        {
          repo: {
            async deletePreferences(userId) {
              await useDB()
                .delete(userPreferences)
                .where(eq(userPreferences.userId, userId));
            },
            async deleteSessions(userId) {
              await useDB()
                .delete(userSessions)
                .where(eq(userSessions.userId, userId));
            },
            async deleteEmailChangeRequest(userId) {
              await useDB()
                .delete(emailChangeRequests)
                .where(eq(emailChangeRequests.userId, userId));
            },
          },
        },
        user.id,
      );
      await useDB()
        .delete(notifications)
        .where(eq(notifications.userId, user.id));
      await useDB()
        .delete(teamInvites)
        .where(eq(teamInvites.invitedById, user.id));
      await useDB()
        .delete(teamMemberships)
        .where(eq(teamMemberships.userId, user.id));
      await useDB().delete(users).where(eq(users.id, user.id));

      // Step 3 — the now-worthless cookies, so the browser stops presenting
      // a session that no longer resolves to anything.
      deleteCookie(event, "nuxfire-access-token");
      deleteCookie(event, "nuxfire-refresh-token");
      deleteCookie(event, "nuxfire-mfa-verified");

      console.log("account deleted", { userId: user.id });
      return { message: "Your account has been permanently deleted." };
    }),

  /**
   * Turns off the caller's own two-factor authentication. Reachable at all
   * only because protectedProcedure already required this login to be
   * MFA-verified to get this far (see trpc.ts) — no separate re-auth step is
   * needed on top of that.
   *
   * A plain tRPC mutation, unlike the /api/mfa/* enrollment endpoints: those
   * exist outside protectedProcedure specifically because they run *before*
   * MFA is verified (enrolling, or re-verifying an expired session), which
   * disabling never needs to.
   */
  disableMfa: protectedProcedure.mutation(async ({ ctx: { user, event } }) => {
    // One transaction: the codes belong to the factor being removed, and a
    // half-applied disable must not leave either one behind.
    await useDB().transaction(async (tx) => {
      await tx
        .update(users)
        .set({ mfaSecret: null, mfaEnabledAt: null })
        .where(eq(users.id, user.id));
      await tx
        .delete(mfaRecoveryCodes)
        .where(
          and(
            eq(mfaRecoveryCodes.userId, user.id),
            eq(mfaRecoveryCodes.scope, "user"),
          ),
        );
    });
    await recordAuditLog({
      actorUserId: user.id,
      action: "user.mfa.disable",
      targetType: "user",
      targetId: user.id,
      ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
    });
    deleteCookie(event, "nuxfire-mfa-verified");
    return { message: "Two-factor authentication has been disabled." };
  }),

  /**
   * Revokes every other refresh token issued to the caller's identity,
   * leaving the session making this call untouched, and deletes their
   * `UserSession` rows. The sessions service goes over the `Auth` binding to
   * sessionsRevokePath in its "every session but this one" mode (exceptSid),
   * the same endpoint that ends one session from the list.
   */
  signOutOtherSessions: protectedProcedure.mutation(
    async ({ ctx: { user, event, runtimeConfig } }) => {
      // The sid, not the refresh cookie: a renewal earlier in this same
      // request has already replaced the refresh token the issuer holds.
      const { revoked } = await signOutOthers(
        sessionsDeps(event, {
          authUrl: runtimeConfig.public.authUrl,
          adminSecret: runtimeConfig.authAdminSecret,
        }),
        { userId: user.id, currentSid: user.sid },
      );
      return {
        revoked,
        message:
          revoked > 0
            ? `Signed out of ${revoked} other session${revoked === 1 ? "" : "s"}.`
            : "No other active sessions were found.",
      };
    },
  ),
});
