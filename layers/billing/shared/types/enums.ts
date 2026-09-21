// Billing-domain enums, relocated from `apps/app/types/enums.ts` in Fase 3
// passo 2a. That file mixed three domains in one module (identity, teams,
// billing) and was missed by the teams extraction; this is its billing slice,
// moved verbatim — same `namespace $Enums` shape, same members, same order, so
// the relocation cannot change a single stored string value.
//
// `UserStatus` stayed behind (identity/core — `User` lives in core-schema.ts,
// not in any layer) and `InviteStatus` went to
// `layers/teams/shared/types/enums.ts`.

namespace $Enums {
  export const SubscriptionStatus: {
    ACTIVE: "ACTIVE";
    PAUSED: "PAUSED";
    CANCELED: "CANCELED";
    PAST_DUE: "PAST_DUE";
    UNPAID: "UNPAID";
    INCOMPLETE: "INCOMPLETE";
    TRIALING: "TRIALING";
  } = {
    ACTIVE: "ACTIVE",
    PAUSED: "PAUSED",
    CANCELED: "CANCELED",
    PAST_DUE: "PAST_DUE",
    UNPAID: "UNPAID",
    INCOMPLETE: "INCOMPLETE",
    TRIALING: "TRIALING",
  };

  export type SubscriptionStatus =
    (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

  export const PaymentProvider: {
    PADDLE: "PADDLE";
    STRIPE: "STRIPE";
    LEMONSQUEEZY: "LEMONSQUEEZY";
    MANUAL: "MANUAL";
  } = {
    PADDLE: "PADDLE",
    STRIPE: "STRIPE",
    LEMONSQUEEZY: "LEMONSQUEEZY",
    MANUAL: "MANUAL",
  };

  export type PaymentProvider =
    (typeof PaymentProvider)[keyof typeof PaymentProvider];
}

export type SubscriptionStatus = $Enums.SubscriptionStatus;

export const SubscriptionStatus: typeof $Enums.SubscriptionStatus =
  $Enums.SubscriptionStatus;

export type PaymentProvider = $Enums.PaymentProvider;

export const PaymentProvider: typeof $Enums.PaymentProvider =
  $Enums.PaymentProvider;

/**
 * Currencies a plan's Stripe-managed price can be created in. Not exhaustive
 * against Stripe's own 135+ supported currencies — narrowed to the ones this
 * app actually sells in, extendable by adding entries here (no migration:
 * `Plan.currency` is a plain text column, this is the write-side allow-list).
 */
export const STRIPE_PLAN_CURRENCIES = [
  "usd",
  "eur",
  "brl",
  "gbp",
  "cad",
  "aud",
  "mxn",
] as const;

export type StripePlanCurrency = (typeof STRIPE_PLAN_CURRENCIES)[number];

/**
 * Billing intervals a plan's `period` can hold. Stripe's `recurring.interval`
 * only accepts these two in this app's usage, and constraining `period` to
 * them fixes the same class of bug PaymentProvider's free-text field had: the
 * billing page's monthly/yearly toggle compares `plan.period === "year"`
 * exactly, so a plan saved with any other spelling (e.g. "Anual") silently
 * never matches either side of that toggle.
 */
export const PLAN_BILLING_INTERVALS = ["month", "year"] as const;

export type PlanBillingInterval = (typeof PLAN_BILLING_INTERVALS)[number];
