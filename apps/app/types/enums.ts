// What is LEFT of this file after Fase 3 passo 2a.
//
// It used to mix four domains in one module. The billing slice
// (`SubscriptionStatus`, `PaymentProvider`, `STRIPE_PLAN_CURRENCIES`,
// `PLAN_BILLING_INTERVALS`) moved to `layers/billing/shared/types/enums.ts`;
// `InviteStatus` moved to `layers/teams/shared/types/enums.ts` (it describes
// `TeamInvite.status`, a table extracted back in passo 1a).
//
// `UserStatus` stays here on purpose: `User` lives in
// `apps/functions/src/database/core-schema.ts`, not in any layer, so this
// type belongs to no single domain. It arguably belongs next to that table in
// `apps/functions`, but moving it there is a separate decision from this
// extraction and nothing imports it today either way.

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
}

export type UserStatus = $Enums.UserStatus;

export const UserStatus: typeof $Enums.UserStatus = $Enums.UserStatus;

// The temporary billing re-export bridge that passo 2a left at the bottom of
// this file is gone: passo 2b moved its last two importers
// (`settings/billing.vue` and `admin/plans/CreateEditModal.vue`) into
// `layers/billing/app/`, where they import
// `@nuxfire/layer-billing/shared/types/enums` directly. Nothing outside that
// layer reads a billing enum from this path any more.
