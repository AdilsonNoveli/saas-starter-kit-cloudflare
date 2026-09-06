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
