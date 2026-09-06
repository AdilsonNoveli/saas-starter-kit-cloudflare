import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, count, eq, ne } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import {
  notifications,
  roles,
  teamInvites,
  teamMemberships,
  users,
} from "@nuxfire/functions/schema";
import { identityDeletePath, signOutOthersPath } from "../../../../../config";

export default router({
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
   * cascade between them — they are separate systems, and the schema does
   * not even declare foreign keys onto User — so the erasure is an ordered,
   * explicit operation rather than a delete that fans out.
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
          body: JSON.stringify({ email }),
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

      // Step 2 — application data. Ordered children-before-parent by hand,
      // since the schema declares no foreign keys to fall back on.
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

      console.log("account deleted", { userId: user.id });
      return { message: "Your account has been permanently deleted." };
    }),

  /**
   * Revokes every other refresh token issued to the caller's identity,
   * leaving the session making this call untouched. Mirrors deleteAccount's
   * shape: this app doesn't hold sessions, AuthKV does, so the request goes
   * over the same service binding to the auth Worker
   * (packages/functions/src/auth.ts's signOutOtherSessions).
   */
  signOutOtherSessions: protectedProcedure.mutation(
    async ({ ctx: { user, event, runtimeConfig } }) => {
      const email = user.email?.toLowerCase();
      if (!email) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This account has no email address to identify sessions.",
        });
      }

      const { refresh } = getTokens(event);

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
        `${runtimeConfig.public.authUrl}${signOutOthersPath}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-admin-secret": runtimeConfig.authAdminSecret,
          },
          body: JSON.stringify({ email, currentRefreshToken: refresh }),
        },
      );
      if (!response.ok) {
        console.error("sign out other sessions: request failed", {
          userId: user.id,
          status: response.status,
          body: await response.text().catch(() => ""),
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not sign out other sessions.",
        });
      }

      const { revoked } = (await response.json()) as { revoked: number };
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
