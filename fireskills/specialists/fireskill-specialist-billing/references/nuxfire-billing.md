# Billing in Nuxfire — What Actually Exists in Code

Every statement cites its evidence file. Code supersedes this document.

## 1. Providers and Configuration

- Stripe (`stripe ^17.5.0`) and Paddle (`@paddle/paddle-node-sdk ^2.4.0`, `@paddle/paddle-js ^1.3.3`) in `layers/billing/package.json`. Both enabled in `config.ts` (`stripe: true`, `paddle: true`).
- Stripe client with **pinned** API version (`2025-02-24.acacia`): `layers/billing/server/utils/stripe.ts`.
- Runtime config (`apps/app/nuxt.config.ts`): `stripeSecretKey`, `stripeWebhookSecretKey`, `paddleApiKey`, `paddleWebhookSecret`, `paddleSandbox`. Sourced from `NUXT_STRIPE_*` / `NUXT_PADDLE_*` in `infra/app.ts`; SST secrets in `infra/secret.ts` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_KEY`, `PADDLE_*`). Paddle sandbox = any stage other than `production`.
- Public config: `NUXT_PUBLIC_PADDLE_CLIENT_TOKEN` and `NUXT_PUBLIC_PADDLE_ENVIRONMENT` (only `"production"` leaves sandbox mode).

## 2. Webhooks

- `layers/billing/server/api/webhooks/stripe.post.ts` and `paddle.post.ts`: rate limit (60/min), signature verification, deduplication, dispatch.
- Stripe handles `customer.subscription.{created,updated,deleted}`, `checkout.session.{completed,async_payment_succeeded}` (ignores `unpaid`), and `invoice.payment_failed`. `invoice.paid` is intentionally **not** handled (covered by `subscription.updated`).
- Idempotency ledger in NuxtHub KV (`hubKV()`), key `webhook-event:<provider>:<eventId>`, TTL 7 days: `utils/billing/event-ledger.ts`. Thrown error = event not marked = safe retry (500 response).
- `syncStripeSubscription` (`utils/stripe/subscription-sync.ts`): re-fetches subscription, customer, and invoice; team extracted from `customer.metadata.team_id`; plan from `Plan.providerPriceId`; saved via `upsertSubscription` (`utils/billing/subscription-repository.ts`).
- `mapStripeStatus` (`utils/stripe/status-map.ts`): exhaustive `Record<Stripe.Subscription.Status, SubscriptionStatus>`.

## 3. Checkout, Portal, and Catalog

- Stripe Checkout, `subscription` mode only: `server/trpc/stripe.ts` (`createStripeCheckoutSession`, `protectedProcedure`, verifies `teamMemberships`, reuses `Team.stripeCustomerId`).
- Paddle: in-browser checkout via Paddle.js in `app/composables/use-payments.ts` (`usePayments("PADDLE" | "STRIPE")`, supports `discountCode`).
- UI reads: `server/trpc/billing.ts` (`getBillingInfo`, latest subscription by `createdAt`).
- Stripe portal restricted to cancellation: `utils/stripe-portal.ts`; configuration created by `admin.plans.setupStripeCancelConfiguration` (ID in KV `config:stripeCancelConfigPortalId`).
- Price catalog: `utils/stripe-catalog.ts`; console `/admin/plans` in `server/trpc/admin-plans.ts` (all `platformAdminProcedure`).

## 4. Data and Permissions

- Tables (`layers/billing/server/database/schema.ts`): `Plan` (`tier`, `price`, `period`, `provider`, `providerPriceId`, `providerProductId`, `unitAmount`, `currency`, `maxSeats`, `limits`, `isArchived`), `Subscription` (`teamId`, `status`, `provider`, `providerSubscriptionId`, `planId`, periods, `cancelAtPeriodEnd`, payment dates), `Benefit`, `BenefitsOnPlan`. Migrations: `apps/functions/src/database/migrations/`.
- Enums `SubscriptionStatus` (`ACTIVE`, `PAUSED`, `CANCELED`, `PAST_DUE`, `UNPAID`, `INCOMPLETE`, `TRIALING`) and `PaymentProvider` (`PADDLE`, `STRIPE`, `LEMONSQUEEZY`, `MANUAL`): `shared/types/enums.ts`.
- UI permission: `teams:billing:view` (manifest string from `teams`; function in `layers/billing/shared/utils/abilities.ts`).
- Existing tests: `event-ledger.test.ts`, `subscription-repository.test.ts`, `status-map.test.ts`, `abilities.test.ts`. None touch the database.

## 5. What Does NOT Exist

- Invoice history and download, plan switching with proration, seat limit warnings, internal coupon system (only Paddle.js `discountCode`), plan change/cancellation notification emails. Logged in backlog under `specs/inbox/`.
- LemonSqueezy or `MANUAL` implementations (exist only in the enum).
- Webhook handler for `invoice.paid`; Stripe checkout outside `subscription` mode.
- Integration tests for tRPC billing routes or webhooks.
