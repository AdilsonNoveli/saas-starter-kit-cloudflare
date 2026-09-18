# Billing no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento.

## 1. Provedores e configuração

- Stripe (`stripe ^17.5.0`) e Paddle (`@paddle/paddle-node-sdk ^2.4.0`, `@paddle/paddle-js ^1.3.3`) em `layers/billing/package.json`. Ambos ligados em `config.ts` (`stripe: true`, `paddle: true`).
- Cliente Stripe com versão de API **fixada** (`2025-02-24.acacia`): `layers/billing/server/utils/stripe.ts`.
- Runtime config (`apps/app/nuxt.config.ts`): `stripeSecretKey`, `stripeWebhookSecretKey`, `paddleApiKey`, `paddleWebhookSecret`, `paddleSandbox`. Vêm de `NUXT_STRIPE_*` / `NUXT_PADDLE_*` em `infra/app.ts`; segredos SST em `infra/secret.ts` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_KEY`, `PADDLE_*`). Paddle sandbox = qualquer stage diferente de `production`.
- Público: `NUXT_PUBLIC_PADDLE_CLIENT_TOKEN` e `NUXT_PUBLIC_PADDLE_ENVIRONMENT` (só `"production"` sai do sandbox).

## 2. Webhooks

- `layers/billing/server/api/webhooks/stripe.post.ts` e `paddle.post.ts`: rate limit (60/min), verificação de assinatura, dedupe, despacho.
- Stripe trata `customer.subscription.{created,updated,deleted}`, `checkout.session.{completed,async_payment_succeeded}` (ignora `unpaid`) e `invoice.payment_failed`. `invoice.paid` **não** é tratado de propósito (o `subscription.updated` cobre).
- Ledger de idempotência no KV do NuxtHub (`hubKV()`), chave `webhook-event:<provedor>:<eventId>`, TTL 7 dias: `utils/billing/event-ledger.ts`. Erro lançado = evento não marcado = retry seguro (resposta 500).
- `syncStripeSubscription` (`utils/stripe/subscription-sync.ts`): re-busca assinatura, cliente e fatura; a equipe vem de `customer.metadata.team_id`; o plano de `Plan.providerPriceId`; grava via `upsertSubscription` (`utils/billing/subscription-repository.ts`).
- `mapStripeStatus` (`utils/stripe/status-map.ts`): `Record<Stripe.Subscription.Status, SubscriptionStatus>` exaustivo.

## 3. Checkout, portal e catálogo

- Stripe Checkout, modo `subscription`, só assinatura: `server/trpc/stripe.ts` (`createStripeCheckoutSession`, `protectedProcedure`, confere `teamMemberships`, reutiliza `Team.stripeCustomerId`).
- Paddle: checkout no navegador via Paddle.js em `app/composables/use-payments.ts` (`usePayments("PADDLE" | "STRIPE")`, aceita `discountCode`).
- Leitura para a tela: `server/trpc/billing.ts` (`getBillingInfo`, assinatura mais recente por `createdAt`).
- Portal Stripe restrito a cancelar assinatura: `utils/stripe-portal.ts`; a configuração é criada por `admin.plans.setupStripeCancelConfiguration` (id no KV `config:stripeCancelConfigPortalId`).
- Catálogo de preços: `utils/stripe-catalog.ts`; console `/admin/plans` em `server/trpc/admin-plans.ts` (todas `platformAdminProcedure`).

## 4. Dados e permissão

- Tabelas (`layers/billing/server/database/schema.ts`): `Plan` (`tier`, `price`, `period`, `provider`, `providerPriceId`, `providerProductId`, `unitAmount`, `currency`, `maxSeats`, `limits`, `isArchived`), `Subscription` (`teamId`, `status`, `provider`, `providerSubscriptionId`, `planId`, períodos, `cancelAtPeriodEnd`, datas de pagamento), `Benefit`, `BenefitsOnPlan`. Migrações: `apps/functions/src/database/migrations/`.
- Enums `SubscriptionStatus` (`ACTIVE`, `PAUSED`, `CANCELED`, `PAST_DUE`, `UNPAID`, `INCOMPLETE`, `TRIALING`) e `PaymentProvider` (`PADDLE`, `STRIPE`, `LEMONSQUEEZY`, `MANUAL`): `shared/types/enums.ts`.
- Permissão da tela: `teams:billing:view` (string do manifest de `teams`; a função vive em `layers/billing/shared/utils/abilities.ts`).
- Testes existentes: `event-ledger.test.ts`, `subscription-repository.test.ts`, `status-map.test.ts`, `abilities.test.ts`. Nenhum toca o banco.

## 5. O que NÃO existe

- Histórico e download de faturas, troca de plano com proration, alerta de limite de assentos, cupons próprios (só `discountCode` do Paddle.js), e-mail de troca de plano/cancelamento. Estão no backlog em `specs/inbox/`.
- Implementação de LemonSqueezy ou `MANUAL` (só existem no enum).
- Webhook para `invoice.paid`; checkout Stripe fora do modo `subscription`.
- Teste de integração de rota tRPC ou de webhook.
