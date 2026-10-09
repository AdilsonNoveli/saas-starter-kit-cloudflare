import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { protectedProcedure, router } from "~~/server/trpc/trpc";
import type { Context } from "~~/server/trpc/context";
import { useDB } from "~~/server/utils/db";
import { rateLimit } from "~~/server/utils/rate-limit";
import { emailChangeRequests, users } from "@nuxfire/functions/schema";
import {
  confirmEmailChange,
  emailChangeStatus,
  requestEmailChange,
  type EmailChangeDeps,
} from "../services/email-change";
import { createIssuerClient } from "../utils/issuer-client";
import { createAuditPort } from "../utils/audit-port";

// `account.email.*` (SPEC-0010, FR-014). protectedProcedure already demands the
// MFA proof of this login when the person has MFA on; the service holds the
// limit per userId, the codes and the order issuer first, database second.

function emailChangeDeps(ctx: Pick<Context, "event" | "runtimeConfig" | "sendEmail">): EmailChangeDeps {
  const db = useDB();
  return {
    repo: {
      findRequest: async (userId) => {
        const [row] = await db
          .select()
          .from(emailChangeRequests)
          .where(eq(emailChangeRequests.userId, userId));
        return row ?? null;
      },
      saveRequest: async (row) => {
        const { userId, ...rest } = row;
        await db
          .insert(emailChangeRequests)
          .values(row)
          .onConflictDoUpdate({ target: emailChangeRequests.userId, set: rest });
      },
      bumpAttempts: async (userId) => {
        const [row] = await db
          .update(emailChangeRequests)
          .set({ attempts: sql`${emailChangeRequests.attempts} + 1` })
          .where(eq(emailChangeRequests.userId, userId))
          .returning({ attempts: emailChangeRequests.attempts });
        return row?.attempts ?? 0;
      },
      deleteRequest: async (userId) => {
        await db.delete(emailChangeRequests).where(eq(emailChangeRequests.userId, userId));
      },
      userEmailTaken: async (email) => {
        const [row] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        return Boolean(row);
      },
      setUserEmail: async (userId, email) => {
        await db.update(users).set({ email }).where(eq(users.id, userId));
      },
    },
    issuer: createIssuerClient(ctx.event, {
      authUrl: ctx.runtimeConfig.public.authUrl,
      adminSecret: ctx.runtimeConfig.authAdminSecret,
    }),
    audit: createAuditPort(ctx.event, "user"),
    sendEmail: ctx.sendEmail,
    rateLimit,
    // The key the user MFA already uses (DEC-011); an empty key fails closed.
    hashKey: ctx.runtimeConfig.userMfaEncryptionKey,
    now: () => new Date(),
  };
}

const TRPC_CODE = {
  too_many_requests: "TOO_MANY_REQUESTS",
  email_taken: "CONFLICT",
  email_managed_by_provider: "FORBIDDEN",
  email_unchanged: "BAD_REQUEST",
  invalid_code: "BAD_REQUEST",
  code_expired: "BAD_REQUEST",
} as const;

/** The stable code travels in `message`; the client translates it (DEC-015). */
function unwrap<T extends object>(result: T | { error: keyof typeof TRPC_CODE }): T {
  if ("error" in result) throw new TRPCError({ code: TRPC_CODE[result.error], message: result.error });
  return result;
}

/**
 * The provider that opened this login, from the token's properties as `getUser`
 * returns them. Anything else (missing, not text) is no provider at all, and the
 * service then keeps the e-mail read-only: it fails closed.
 */
function sessionProviderOf(user: { provider?: unknown }) {
  return typeof user.provider === "string" ? user.provider : "";
}

function requireEmail(email: string | null | undefined) {
  if (!email) throw new TRPCError({ code: "PRECONDITION_FAILED" });
  return email;
}

export const emailChangeRouter = router({
  status: protectedProcedure.query(async ({ ctx }) =>
    emailChangeStatus(emailChangeDeps(ctx), {
      userId: ctx.user.id,
      email: requireEmail(ctx.user.email),
      sessionProvider: sessionProviderOf(ctx.user),
    }),
  ),

  request: protectedProcedure
    .input(z.object({ newEmail: z.email().max(254) }))
    .mutation(async ({ input, ctx }) =>
      unwrap(
        await requestEmailChange(emailChangeDeps(ctx), {
          userId: ctx.user.id,
          email: requireEmail(ctx.user.email),
          sessionProvider: sessionProviderOf(ctx.user),
          newEmail: input.newEmail,
        }),
      ),
    ),

  confirm: protectedProcedure
    .input(
      z.object({
        currentCode: z.string().regex(/^\d{6}$/u),
        newCode: z.string().regex(/^\d{6}$/u),
      }),
    )
    .mutation(async ({ input, ctx }) =>
      unwrap(
        await confirmEmailChange(emailChangeDeps(ctx), {
          userId: ctx.user.id,
          email: requireEmail(ctx.user.email),
          currentSid: ctx.user.sid,
          currentCode: input.currentCode,
          newCode: input.newCode,
        }),
      ),
    ),
});
