import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
// See the note in billing.ts: layers reach the Composition Root's tRPC
// primitives and server utils by explicit import, never by Nitro's merge.
import { protectedProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { teamMemberships, teams } from "@nuxfire/functions/schema";
import { createStripeClient } from "../utils/stripe";

export const stripeRouter = router({
  createStripeCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string().min(1),
        teamId: z.string().min(1),
        redirectUrl: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx: { event, origin, user }, input }) => {
      // Every other billing procedure verifies team access before acting; this
      // one did not, so any signed-in user could open a checkout session whose
      // subscription attaches to a team they are not a member of.
      const membership = await useDB().query.teamMemberships.findFirst({
        where: and(
          eq(teamMemberships.teamId, input.teamId),
          eq(teamMemberships.userId, user.id),
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this team",
        });
      }

      const stripe = createStripeClient(event);

      // Reused across every checkout attempt for this team, instead of
      // creating a fresh Stripe Customer per click — an abandoned or failed
      // checkout used to leave one orphaned customer behind every time
      // "Select Plan" was clicked again.
      const team = await useDB().query.teams.findFirst({
        where: eq(teams.id, input.teamId),
        columns: { stripeCustomerId: true },
      });

      const customerId =
        team?.stripeCustomerId ??
        (
          await stripe.customers.create({
            email: user.email ?? "",
            metadata: { team_id: input.teamId },
          })
        ).id;

      if (!team?.stripeCustomerId) {
        await useDB()
          .update(teams)
          .set({ stripeCustomerId: customerId })
          .where(eq(teams.id, input.teamId));
      }

      // Distinct outcomes need distinct destinations: sharing one URL left the
      // return page unable to tell a completed payment from an abandoned one.
      const successUrl = new URL(input.redirectUrl, origin);
      successUrl.searchParams.set("checkout", "success");
      const cancelUrl = new URL(input.redirectUrl, origin);
      cancelUrl.searchParams.set("checkout", "cancelled");

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        billing_address_collection: "auto",
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        // Stripe substitutes this placeholder itself, so it is appended after
        // serialisation — `searchParams` would percent-encode the braces. The
        // `checkout` param above guarantees the query string already exists.
        success_url: `${successUrl.toString()}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl.toString(),
      });

      // Returning undefined made every caller guess why: the composable raised
      // a generic "failed to create session" with nothing to act on.
      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe returned a checkout session without a URL",
        });
      }

      return { url: session.url };
    }),
});
