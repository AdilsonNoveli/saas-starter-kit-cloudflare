import type { H3Event } from "h3";
import { createStripeClient } from "./stripe";
import type { PlanBillingInterval } from "~~/types/enums";

export interface StripePlanCatalogInput {
  name: string;
  description: string;
  unitAmount: number;
  currency: string;
  interval: PlanBillingInterval;
}

export interface StripePlanCatalogExisting {
  providerProductId: string | null;
  providerPriceId: string | null;
}

export interface StripePlanCatalogResult {
  providerProductId: string;
  providerPriceId: string;
}

/**
 * Creates or updates the Stripe catalog objects behind a plan, so an operator
 * never has to hand-paste a price ID copied from the Stripe Dashboard.
 *
 * Prices are immutable on Stripe — there is no "edit amount" call — so a
 * changed amount/currency/interval always creates a *new* Price and archives
 * the old one. The Product persists across that (created once, reused by every
 * later price change) because the official guidance is one Product per plan
 * tier: creating a new Product on every edit would make Checkout line items
 * and invoices show a fresh, disconnected product name each time the price
 * changes instead of one consistent line item across the plan's history.
 */
export async function syncStripePlanCatalog(
  event: H3Event,
  input: StripePlanCatalogInput,
  existing: StripePlanCatalogExisting,
): Promise<StripePlanCatalogResult> {
  const stripe = createStripeClient(event);

  const product = existing.providerProductId
    ? await stripe.products.update(existing.providerProductId, {
        name: input.name,
        description: input.description,
      })
    : await stripe.products.create({
        name: input.name,
        description: input.description,
      });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: input.unitAmount,
    currency: input.currency,
    recurring: { interval: input.interval },
  });

  if (existing.providerPriceId && existing.providerPriceId !== price.id) {
    await stripe.prices.update(existing.providerPriceId, { active: false });
  }

  return { providerProductId: product.id, providerPriceId: price.id };
}

/**
 * Whether a plan's Stripe catalog objects need to be (re)created: no price
 * yet, or one of the fields Stripe treats as immutable on a Price changed.
 * Renaming a plan or editing seats/limits must not spend a Price/Product pair
 * it does not need.
 */
export function planCatalogNeedsSync(
  current: {
    unitAmount: number | null;
    currency: string | null;
    period: string | null;
  },
  next: { unitAmount: number; currency: string; period: string },
): boolean {
  return (
    current.unitAmount !== next.unitAmount ||
    current.currency !== next.currency ||
    current.period !== next.period
  );
}

/** Renders a plan's display price from the same amount Stripe charges, so the two can never drift apart. */
export function formatPlanPrice(unitAmount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(unitAmount / 100);
}
