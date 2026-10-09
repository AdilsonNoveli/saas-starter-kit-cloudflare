import { z } from "zod/v4";
// See the note in notifications.ts: layers reach the Composition Root's tRPC
// primitives and server utils by explicit import, never by Nitro's merge.
// `platformAdminProcedure` in particular is built on `protectedProcedure`, NOT
// on `abilityProcedure` — platform authority never routes through the tenant
// ability layer (see nuxfire-authorization.md).
import { platformAdminProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { notifications } from "@nuxfire/functions/schema";

/**
 * Demo/showcase endpoint for this Starter Kit: `notifications.create` (the
 * tenant router) only ever notifies the calling user — there is no
 * `targetUserId` there because nothing yet decides who is allowed to notify
 * whom. This is that missing "who": a platform admin, already vetted by
 * `platformAdminProcedure`, picking an arbitrary user to demonstrate the
 * real-time delivery pipeline (DB row + Cloudflare Durable Objects
 * WebSocket push) end to end. Broader "team owner notifies their members"
 * delivery is intentionally not built here — it needs a real role check
 * this app doesn't have yet.
 */
export const adminNotificationsRouter = router({
  send: platformAdminProcedure
    .input(
      z.object({
        targetUserId: z.string(),
        title: z.string().min(1).max(200),
        message: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx: { sendWebsocketsEvent }, input }) => {
      const [notification] = await useDB()
        .insert(notifications)
        .values({
          title: input.title,
          message: input.message,
          userId: input.targetUserId,
        })
        .returning();

      await sendWebsocketsEvent(input.targetUserId, {
        type: "notification",
        payload: notification,
      });

      return notification;
    }),
});
