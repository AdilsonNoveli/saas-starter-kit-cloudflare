---
name: fireskill-specialist-billing
description: Create and review Nuxfire payments and subscriptions (`layers/billing`) — Stripe (Checkout, portal, webhook, sync) and Paddle (Paddle.js, webhook), idempotency ledger in KV, Plan/Subscription tables, platform admin plans console. Use when modifying checkout, webhooks, subscription status, plans, pricing, or seat limits.
---

# Billing (Stripe and Paddle)

## When to Use

- Trigger when modifying `layers/billing/**`: webhooks, checkout, portal, `Plan`,
  `Subscription`, price catalog, or `/admin/plans` console.
- Do not trigger for general permissions (`$fireskill-specialist-nuxt-authorization`),
  procedures (`$fireskill-specialist-trpc`), or tables (`$fireskill-specialist-drizzle`);
  combine with them instead. Secrets and stages: `$fireskill-specialist-sst`.

## Workflow

1. Read [references/nuxfire-billing.md](references/nuxfire-billing.md).
2. Identify the provider involved (Stripe, Paddle, or both) and the affected event.
3. Follow the established pattern: thin webhook (verify → deduplicate → dispatch) and
   state resolved in a single place (`syncStripeSubscription`, `upsertSubscription`).
4. Validate (below).

## Core Rules

- Every webhook verifies signature before any side effect and uses the ledger
  (`wasEventProcessed` / `markEventProcessed`); mark as processed **only after**
  successful handling, preserving safe provider retries.
- For Stripe, never trust webhook payload data: re-fetch the subscription via the API
  (`stripe.subscriptions.retrieve`) with the version pinned in `utils/stripe.ts`.
- Provider status enters through an exhaustive map (`status-map.ts`); unknown statuses must
  break compilation, never silently default to `INCOMPLETE`.
- Every procedure operating on a team verifies the user's `teamMembership`.
- Plans are never hard-deleted: use `isArchived`. `providerPriceId` links `Plan` to
  the provider price.
- `useDB()` per request; secrets exclusively via `useRuntimeConfig`. Never log keys
  or full payloads.

## Validation

- `bun run test` (existing tests for ledger, subscription repository, status map).
- Typechecks for `apps/app` and `bunx vue-tsc --noEmit -p server/tsconfig.json`.
- Schema changes: include `[MIGRATION]` task and run `$fireskill-aux-database`.
- Live webhooks only with authorization (provider sandbox); deployment only with explicit authorization.
