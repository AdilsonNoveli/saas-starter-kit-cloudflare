---
name: fireskill-specialist-billing
description: Criar e revisar pagamentos e assinaturas do Nuxfire (`layers/billing`) — Stripe (Checkout, portal, webhook, sincronização) e Paddle (Paddle.js, webhook), ledger de idempotência no KV, tabelas Plan/Subscription, console de planos do platform admin. Use ao mexer em checkout, webhook, status de assinatura, planos, preços ou limite de assentos.
---

# Billing (Stripe e Paddle)

## Quando usar

- Acionar ao alterar `layers/billing/**`: webhooks, checkout, portal, `Plan`,
  `Subscription`, catálogo de preços ou o console `/admin/plans`.
- Não acionar para permissões em geral (`$fireskill-specialist-nuxt-authorization`),
  procedures (`$fireskill-specialist-trpc`) ou tabelas (`$fireskill-specialist-drizzle`);
  combine com eles. Segredos e stages: `$fireskill-specialist-sst`.

## Fluxo

1. Ler [references/nuxfire-billing.md](references/nuxfire-billing.md).
2. Identificar o provedor da mudança (Stripe, Paddle ou ambos) e o evento afetado.
3. Seguir o padrão existente: webhook fino (verificar → deduplicar → despachar) e
   estado resolvido em um único lugar (`syncStripeSubscription`, `upsertSubscription`).
4. Validar (abaixo).

## Regras principais

- Todo webhook verifica a assinatura antes de qualquer efeito e usa o ledger
  (`wasEventProcessed` / `markEventProcessed`); marcar como processado **só depois**
  do sucesso, para o retry do provedor continuar seguro.
- No Stripe, nunca confiar no payload do webhook: re-buscar a assinatura pela API
  (`stripe.subscriptions.retrieve`) com a versão fixada em `utils/stripe.ts`.
- Status do provedor entra por mapa exaustivo (`status-map.ts`); status novo deve
  quebrar a compilação, não virar `INCOMPLETE` em silêncio.
- Toda procedure que age sobre uma equipe confere a `teamMembership` do usuário.
- Plano nunca é apagado: `isArchived`. `providerPriceId` é o elo entre `Plan` e o
  preço no provedor.
- `useDB()` por requisição; segredos só via `useRuntimeConfig`. Nunca logar chave
  ou payload completo.

## Validação

- `bun run test` (há testes de ledger, repositório de assinatura e mapa de status).
- Typecheck de `apps/app` e `vue-tsc -p server/tsconfig.json`.
- Mudança de schema: tarefa `[MIGRATION]` e `$fireskill-aux-database`.
- Webhook real só com autorização (sandbox do provedor); deploy só com autorização.
