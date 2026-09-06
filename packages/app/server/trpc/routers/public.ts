import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { waitlistEmails } from "@movimenta-bairro/functions/schema";

export default router({
  addToWaitlist: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
      }),
    )
    .mutation(async ({ input }) => {
      const { email } = input;
      try {
        await useDB().insert(waitlistEmails).values({ email }).execute();
        return {
          success: true,
          message: "Email added to waitlist",
        };
      } catch (error) {
        // "23505" is Postgres's unique_violation code (postgres.js surfaces
        // it as `error.code`) — this stack is Drizzle + postgres.js, not
        // Prisma, whose "P2002" this previously (and incorrectly) checked
        // for, meaning a duplicate signup never actually got the friendly
        // CONFLICT below.
        const code = (error as { code?: string })?.code;
        if (code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This email is already on the waitlist",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add email to waitlist",
        });
      }
    }),
});
