import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import type { H3Event } from "h3";
import { protectedProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { userSessions } from "@nuxfire/functions/schema";
import { listSessions, revokeSession, type SessionsDeps } from "../services/sessions";
import { createIssuerClient } from "../utils/issuer-client";
import { createAuditPort } from "../utils/audit-port";

/**
 * The real dependencies of the sessions service (DEC-018): the `UserSession`
 * table, the issuer over the `Auth` binding and the audit trail. Also used by
 * `account.signOutOtherSessions`.
 */
export function sessionsDeps(
  event: H3Event,
  config: { authUrl: string; adminSecret: string },
): SessionsDeps {
  return {
    repo: {
      listByUser: (userId) =>
        useDB().select().from(userSessions).where(eq(userSessions.userId, userId)),
      deleteBySid: async (userId, sid) => {
        await useDB()
          .delete(userSessions)
          .where(and(eq(userSessions.userId, userId), eq(userSessions.id, sid)));
      },
      deleteExcept: async (userId, sid) => {
        await useDB()
          .delete(userSessions)
          .where(and(eq(userSessions.userId, userId), ne(userSessions.id, sid)));
      },
    },
    issuer: createIssuerClient(event, config),
    audit: createAuditPort(event, "session"),
  };
}

export const sessionsRouter = router({
  list: protectedProcedure.query(async ({ ctx: { user, event, runtimeConfig } }) => {
    if (!user.email) throw new TRPCError({ code: "PRECONDITION_FAILED" });
    return listSessions(
      sessionsDeps(event, {
        authUrl: runtimeConfig.public.authUrl,
        adminSecret: runtimeConfig.authAdminSecret,
      }),
      { userId: user.id, email: user.email, currentSid: user.sid },
    );
  }),

  revoke: protectedProcedure
    .input(z.object({ sid: z.string().min(1) }))
    .mutation(async ({ input, ctx: { user, event, runtimeConfig } }) => {
      const result = await revokeSession(
        sessionsDeps(event, {
          authUrl: runtimeConfig.public.authUrl,
          adminSecret: runtimeConfig.authAdminSecret,
        }),
        { userId: user.id, sid: input.sid, currentSid: user.sid },
      );
      if ("error" in result) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      return result;
    }),
});
