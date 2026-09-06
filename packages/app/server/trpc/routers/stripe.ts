import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { createStripeClient } from "~~/server/utils/stripe";

export default router({
  createStripeCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
        teamId: z.string(),
        redirectUrl: z.string(),
      }),
    )
    .mutation(async ({ ctx: { event, origin, user }, input }) => {
      if (!input.priceId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "priceId is required",
        });
      }

      const stripe = createStripeClient(event);

      const customer = await stripe.customers.create({
        email: user?.email || "",
        metadata: {
          team_id: input.teamId,
        },
      });

      const stripeCustomerId = customer.id;

      const redirectUrl = new URL(input.redirectUrl, origin).toString();

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        billing_address_collection: "auto",
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: redirectUrl,
        cancel_url: redirectUrl,
      });

      if (session.url) {
        return { url: session.url };
      }
    }),
});
