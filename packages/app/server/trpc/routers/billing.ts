import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { teamMemberships, teams } from "@nuxfire/functions/schema";
import { createStripeClient } from "~~/server/utils/stripe";
import { STRIPE_CANCEL_CONFIG_KV_KEY } from "~~/server/utils/stripe-portal";

export default router({
  getBillingInfo: protectedProcedure
    .input(
      z.object({
        teamIdentifier: z.string(),
        returnUrl: z.string(),
      }),
    )
    .query(async ({ ctx: { user, runtimeConfig, event, origin }, input }) => {
      // Find the team and verify user access

      const team = await useDB().query.teams.findFirst({
        where: eq(teams.slug, input.teamIdentifier),
        with: {
          memberships: {
            where: eq(teamMemberships.userId, user.id),
          },
          subscriptions: {
            with: {
              plan: {
                with: {
                  benefits: {
                    with: {
                      benefit: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Check team access
      if (!team || team.memberships.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this team",
        });
      }

      // Fetch all available plans with their benefits
      const availablePlans = await useDB().query.plans.findMany({
        with: {
          benefits: {
            with: {
              benefit: true,
            },
          },
        },
      });

      // Determine current plan (or default to FREE)
      const currentPlan =
        team.subscriptions?.[0]?.plan ||
        availablePlans.find((plan) => plan.tier === "FREE");

      // Get the current subscription details
      const currentSubscription =
        team.subscriptions?.[team.subscriptions.length - 1];

      async function getPortalLinks(
        subscription: NonNullable<typeof currentSubscription>,
      ) {
        const providerMetadata = subscription.providerMetadata
          ? typeof subscription.providerMetadata === "string"
            ? JSON.parse(subscription.providerMetadata)
            : subscription.providerMetadata
          : {};

        if (subscription.provider === "PADDLE") {
          const { paddleApiKey, paddleSandbox } = runtimeConfig;
          const paddle = new Paddle(paddleApiKey || "", {
            environment: paddleSandbox
              ? Environment.sandbox
              : Environment.production,
          });
          const res = await paddle.customerPortalSessions.create(
            providerMetadata.customerId,
            [providerMetadata.id],
          );
          return res?.urls.subscriptions[0];
        } else if (subscription.provider === "STRIPE") {
          const stripe = createStripeClient(event);
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: providerMetadata.customer,
            return_url: `${origin}${input.returnUrl}`,
          });

          let cancelSubscriptionLink;
          const cancelConfigPortalId = (await hubKV().get(
            STRIPE_CANCEL_CONFIG_KV_KEY,
          )) as string | null;
          if (cancelConfigPortalId) {
            cancelSubscriptionLink = await stripe.billingPortal.sessions.create(
              {
                customer: providerMetadata.customer,
                configuration: cancelConfigPortalId,
                return_url: `${origin}${input.returnUrl}`,
              },
            );
          }

          return {
            updateSubscriptionPaymentMethod: portalSession.url,
            cancelSubscription:
              cancelSubscriptionLink?.url || portalSession.url,
          };
        }
      }

      // Prepare subscription details
      const subscriptionInfo = currentSubscription
        ? {
            status: currentSubscription.status,
            provider: currentSubscription.provider,
            currentPeriodStart: currentSubscription.currentPeriodStart,
            currentPeriodEnd: currentSubscription.currentPeriodEnd,
            nextPaymentDate: currentSubscription.nextPaymentDate,
            lastPaymentDate: currentSubscription.lastPaymentDate,
            cancelAtPeriodEnd: currentSubscription.cancelAtPeriodEnd,
            billingPortalLinks: currentSubscription
              ? await getPortalLinks(currentSubscription)
              : null,
          }
        : null;
      return {
        currentPlan: currentPlan
          ? {
              ...currentPlan,
              benefits: currentPlan.benefits.map((b) => ({
                ...b.benefit,
              })),
            }
          : null,
        subscription: subscriptionInfo,
        availablePlans: availablePlans.map((plan) => ({
          ...plan,
          benefits: plan.benefits.map((b) => ({
            ...b.benefit,
          })),
        })),
      };
    }),
});
