import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
// `~~` is the Composition Root (apps/app). Layers import the shared tRPC
// primitives and server utils explicitly instead of relying on Nitro's
// cross-layer merge — the decision recorded at the top of
// nuxfire-layers.md (layers own the frontend; the backend uses
// explicit imports), and the same pattern layers/teams' routers use.
import { protectedProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { teamMemberships, teams } from "@nuxfire/functions/schema";
import { createStripeClient } from "../utils/stripe";
import { STRIPE_CANCEL_CONFIG_KV_KEY } from "../utils/stripe-portal";

// `hubKV()` further down stays unimported: it is a NuxtHub module auto-import
// with no importable module path, registered globally in the Nitro scope (which
// covers every active layer's server/ dir). Same category as `hubBlob()` in
// layers/teams/server/trpc/teams.ts.
export const billingRouter = router({
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
            // Explicit ordering, and only the row that actually governs
            // billing today. Without an ORDER BY, Postgres returns these in
            // arbitrary order, so "first" and "last" were both non-
            // deterministic — the same team could get different answers on
            // consecutive requests once it had more than one subscription row
            // (plan change, provider switch, cancelled history).
            orderBy: (subscription, { desc }) => [desc(subscription.createdAt)],
            limit: 1,
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
      // Rebound to a definitely-non-null const: `team` stays narrowed here,
      // but `getPortalLinks` below is a closure defined and called later —
      // TypeScript doesn't carry a narrowing on a `let`/query-result binding
      // through into a closure's body, only through a `const` it can see was
      // assigned once, after the guard already ran.
      const verifiedTeam = team;

      // Fetch all available plans with their benefits (excluding archived ones)
      const availablePlans = await useDB().query.plans.findMany({
        where: (plan, { eq }) => eq(plan.isArchived, false),
        with: {
          benefits: {
            with: {
              benefit: true,
            },
          },
        },
      });

      // One subscription drives both values. They used to be read from
      // opposite ends of the same unordered list — `[0]` for the plan and
      // `[length - 1]` for everything else — so a team with more than one
      // subscription row could see the name of one plan next to the renewal
      // date, status and portal links of a different one.
      const currentSubscription = team.subscriptions?.[0];

      const currentPlan =
        currentSubscription?.plan ||
        availablePlans.find((plan) => plan.tier === "FREE");

      async function getPortalLinks(
        subscription: NonNullable<typeof currentSubscription>,
      ) {
        if (subscription.provider === "PADDLE") {
          // Paddle's customer id has no dedicated column yet — this is the
          // one value here still read from the raw stored payload rather
          // than a typed field.
          const providerMetadata = subscription.providerMetadata
            ? typeof subscription.providerMetadata === "string"
              ? JSON.parse(subscription.providerMetadata)
              : subscription.providerMetadata
            : {};

          const { paddleApiKey, paddleSandbox } = runtimeConfig;
          const paddle = new Paddle(paddleApiKey || "", {
            environment: paddleSandbox
              ? Environment.sandbox
              : Environment.production,
          });
          const res = await paddle.customerPortalSessions.create(
            providerMetadata.customerId,
            // The Paddle subscription id itself already has a typed column —
            // no need to round-trip it through the untyped JSON blob too.
            [subscription.providerSubscriptionId],
          );
          return res?.urls.subscriptions[0];
        } else if (subscription.provider === "STRIPE") {
          if (!verifiedTeam.stripeCustomerId) {
            // Every Stripe subscription this app creates goes through
            // createStripeCheckoutSession, which always sets this — reaching
            // here without it means the subscription was created some other
            // way, and there is no safe id to open a portal session for.
            return undefined;
          }

          const stripe = createStripeClient(event);
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: verifiedTeam.stripeCustomerId,
            return_url: `${origin}${input.returnUrl}`,
          });

          let cancelSubscriptionLink;
          const cancelConfigPortalId = (await hubKV().get(
            STRIPE_CANCEL_CONFIG_KV_KEY,
          )) as string | null;
          if (cancelConfigPortalId) {
            cancelSubscriptionLink = await stripe.billingPortal.sessions.create(
              {
                customer: verifiedTeam.stripeCustomerId,
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
