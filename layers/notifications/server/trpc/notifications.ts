import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
// `~~` is the Composition Root (apps/app). Layers import the shared tRPC
// primitives and server utils explicitly instead of relying on Nitro's
// cross-layer merge — the decision recorded at the top of
// nuxfire-layers.md (layers own the frontend; the backend uses
// explicit imports), and the same pattern layers/teams' and layers/billing's
// routers use. `useDB` and `eq` were bare auto-imports while this file lived in
// apps/app; a router module is imported as a plain module by the generated
// `.composition/layer-routers.ts`, so both are explicit here.
import { protectedProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
// This layer's OWN table, still imported through the aggregator barrel rather
// than from `../database/schema` — same as layers/billing's routers do for
// `plans`. The barrel is the single module every consumer of the Drizzle client
// reads, and `useDB().query.notifications` is typed from it.
import { notifications } from "@nuxfire/functions/schema";

/**
 * Tenant-facing notifications. Every procedure here is `protectedProcedure`
 * scoped to `ctx.user.id` — there is no `abilityProcedure` and no
 * `notifications:*` permission string, because a user only ever reads and
 * writes their OWN rows; ownership is the whole authorization model. Notifying
 * somebody else is a different question, answered by `admin-notifications.ts`
 * next door under platform authority.
 */
export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx: { user } }) => {
    const notificationList = await useDB().query.notifications.findMany({
      where: eq(notifications.userId, user.id),
      orderBy: desc(notifications.createdAt),
    });
    return notificationList;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx: { user, sendWebsocketsEvent }, input }) => {
      const [notification] = await useDB()
        .insert(notifications)
        .values({
          ...input,
          userId: user.id,
        })
        .returning();
      await sendWebsocketsEvent(user.id, {
        type: "notification",
        payload: notification,
      });
      return notification;
    }),

  updateReadStatus: protectedProcedure
    .input(z.array(z.string()))
    .mutation(async ({ input }) => {
      await Promise.all(
        input.map((notif) =>
          useDB()
            .update(notifications)
            .set({ read: true })
            .where(eq(notifications.id, notif)),
        ),
      );
    }),
});
