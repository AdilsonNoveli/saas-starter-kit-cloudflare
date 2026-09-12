namespace $Enums {
  export const UserStatus: {
    ACTIVE: "ACTIVE";
    INACTIVE: "INACTIVE";
    SUSPENDED: "SUSPENDED";
  } = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    SUSPENDED: "SUSPENDED",
  };

  export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

  export const InviteStatus: {
    PENDING: "PENDING";
    ACCEPTED: "ACCEPTED";
    DECLINED: "DECLINED";
    EXPIRED: "EXPIRED";
  } = {
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    DECLINED: "DECLINED",
    EXPIRED: "EXPIRED",
  };

  export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

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

export type UserStatus = $Enums.UserStatus;

export const UserStatus: typeof $Enums.UserStatus = $Enums.UserStatus;

export type InviteStatus = $Enums.InviteStatus;

export const InviteStatus: typeof $Enums.InviteStatus = $Enums.InviteStatus;

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
