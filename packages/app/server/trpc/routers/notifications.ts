import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { notifications } from "@movimenta-bairro/functions/schema";
import { desc } from "drizzle-orm";

export default router({
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
