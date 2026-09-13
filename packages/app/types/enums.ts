// What is LEFT of this file after Fase 3 passo 2a.
//
// It used to mix four domains in one module. The billing slice
// (`SubscriptionStatus`, `PaymentProvider`, `STRIPE_PLAN_CURRENCIES`,
// `PLAN_BILLING_INTERVALS`) moved to `layers/billing/shared/types/enums.ts`;
// `InviteStatus` moved to `layers/teams/shared/types/enums.ts` (it describes
// `TeamInvite.status`, a table extracted back in passo 1a).
//
// `UserStatus` stays here on purpose: `User` lives in
// `packages/functions/src/database/core-schema.ts`, not in any layer, so this
// type belongs to no single domain. It arguably belongs next to that table in
// `packages/functions`, but moving it there is a separate decision from this
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

// ---------------------------------------------------------------------------
// TEMPORARY re-export bridge — delete in Fase 3 passo 2b.
//
// Two Composition Root frontend files still import the billing enums from this
// path: `app/pages/[[team]]/settings/billing.vue` and
// `app/components/admin/plans/CreateEditModal.vue`. Passo 2a is backend-only
// and deliberately does not touch `packages/app/app/**`, so the alternative to
// this bridge would be editing exactly the files the next step is going to move
// anyway.
//
// This is the same pattern, and the same lifecycle, as the
// `#shared/utils/abilities` bridge that passo 1a created and passo 1b deleted:
// a backend extraction leaves one re-export behind, and the matching frontend
// extraction removes it together with the last importer. When those two files
// move into `layers/billing/app/`, they import
// `@nuxfire/layer-billing/shared/types/enums` directly and everything below
// this line goes away.
// `PaymentProvider` and `SubscriptionStatus` are each a const AND a type in the
// source module; a plain `export { ... } from` carries both meanings across, so
// `import { PaymentProvider }` and `import type { PaymentProvider }` both keep
// resolving exactly as they did before the move. The two below them are
// type-only and need the `export type` form.
export {
  PaymentProvider,
  PLAN_BILLING_INTERVALS,
  STRIPE_PLAN_CURRENCIES,
  SubscriptionStatus,
} from "@nuxfire/layer-billing/shared/types/enums";
export type {
  PlanBillingInterval,
  StripePlanCurrency,
} from "@nuxfire/layer-billing/shared/types/enums";
