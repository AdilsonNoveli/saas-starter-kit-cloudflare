import { eq } from "drizzle-orm";
import { subscriptions } from "@nuxfire/functions/schema";
import type { PaymentProvider, SubscriptionStatus } from "~~/types/enums";

export interface SubscriptionUpsertInput {
  teamId: string;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  planId: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  providerMetadata: unknown;
  customerEmail: string | null;
  lastPaymentDate: Date | null;
  nextPaymentDate: Date | null;
}

/**
 * The single write path for both Stripe and Paddle. Each provider's webhook
 * handler is responsible only for turning its own payload into this shape;
 * everything about *how* that becomes a database row lives here once.
 *
 * Before this existed, both webhooks carried their own copy of this
 * insert-or-update, and both copies had independently picked up the same
 * bug: the update was scoped by `teamId` instead of `providerSubscriptionId`,
 * so a team with more than one subscription row (a plan change, a provider
 * switch, cancelled history) had one event's update silently overwrite
 * another row's data. One write path is what makes that class of bug fixable
 * exactly once instead of once per provider — and stay fixed the next time
 * either handler is edited.
 */
export async function upsertSubscription(
  input: SubscriptionUpsertInput,
): Promise<void> {
  const existing = await useDB().query.subscriptions.findFirst({
    where: eq(
      subscriptions.providerSubscriptionId,
      input.providerSubscriptionId,
    ),
  });

  if (existing) {
    await useDB()
      .update(subscriptions)
      .set(input)
      .where(
        eq(subscriptions.providerSubscriptionId, input.providerSubscriptionId),
      );
  } else {
    await useDB().insert(subscriptions).values(input);
  }
}
