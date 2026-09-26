# Project

## History and Motivation

Describe origin of the project, problem that motivated its creation, and major evolution milestones.

## Purpose

Explain what the system accomplishes and what core value it delivers.

## Users and Operational Context

Record target user personas, permissions, and environments in which they interact with the product.

## Core Capabilities

Base provided by the Nuxfire starter kit (Nuxt 4 + Cloudflare Workers + SST). Add your product capabilities here.

| Capability | Location |
|---|---|
| Identity and session: OpenAuth (password, email code, GitHub, Google), optional TOTP MFA, login rate limiting | `apps/functions/src/auth.ts`, `apps/login`, `apps/app/server/utils/auth.ts` |
| Teams, invitations (expire in 30 days), seats per plan, RBAC `Owner`/`Admin`/`Member`, team suspension | `layers/teams` |
| Platform console (`/admin`, MFA + elevated 30-minute session): companies, plans, queue/DLQ with replay, audit log, global notifications | `layers/admin`, `layers/billing`, `layers/notifications` |
| Billing: database-driven plans (each plan sets where a buyer lands after paying: a team of their own as Owner, or an existing team chosen in `/admin/plans`), Stripe and Paddle checkout, webhooks with KV idempotency ledger. A buyer without a team pays at `/buy/[planId]` (e-mail only), then claims access at `/claim/[id]` after creating an account, which creates the team/membership and activates the plan (`PendingPurchase`, `/admin/pending-purchases`) | `layers/billing` |
| In-app and real-time notifications (WebSocket/Durable Object) | `layers/notifications`, `apps/functions/src/websockets.js` |
| Queued jobs with DLQ and hourly cron (cron only writes a row to `Log`) | `infra/jobs.ts`, `infra/cron.ts`, `apps/functions/src/` |
| Transactional email (React Email; only Resend is active) | `packages/emails`, `apps/functions/src/emails.ts` |
| Public website, blog (posts in `en`/`pt-br`/`es` with validated frontmatter, one index card per post in the active locale, per-post SEO, sitemap `lastmod`/hreflang), docs, and legal pages (Nuxt Content v3), audited by `bun run check:seo`, weighed by `bun run check:perf` and its text checked by `bun run check:copy` | `apps/web`, `scripts/check-seo.ts`, `scripts/check-perf.ts`, `scripts/check-copy.ts` |
| Kanban (toggleable feature layer in `config.ts`) | `layers/kanban` |

## Boundaries and Non-Goals

What the starter does not do or does not have yet (absence verified in code):

- No CI/CD: `.github/workflows/` does not exist; deployment is manual.
- No invoice list or download: the Billing tab only mentions "invoices" in text.
- No in-app password change: button leads to the issuer's "forgot password" flow.
- MFA recovery: ten single-use recovery codes per factor (user and platform admin), issued at enrolment, redeemable at the challenge and regenerable after a fresh authenticator code; losing both is handled by the manual, audited `apps/functions/src/database/reset-mfa.ts`.
- No RSS feed, error tracking (Sentry etc.), tenant impersonation, IP allowlist in `/admin`, or MRR/ARR charts.
- Analytics: documentation page is "coming soon".
- The offer on the home page (`LandingOffer.vue`) reads one static configuration (`apps/web/app/utils/offer.ts`) for price/copy; it does not read `Plan` records from the database for that. Its Buy CTA (`CTAButton`, `--color-cta`/`--color-cta-foreground` brand green) links to apps/app's `/buy/[planId]` (SPEC-0004) for whichever `Plan` has `isPublicOffer: true` (at most one, toggled in `/admin/plans`) — read live from `apps/web` over a Cloudflare service binding to the `App` Worker (`infra/web.ts`'s `link: [contentDatabase, app]`, `layers/billing/server/api/public/offer.get.ts`, `apps/web/server/api/offer.get.ts`), no env var and no redeploy needed when the admin changes it. The CTA shows a "coming soon" state while no plan is flagged.
- Team dashboard chart is illustrative (random walk), not real data.
- The plan's buyer destination (`Plan.buyerTeamMode`, `Plan.buyerTeamId`) now provisions a real buyer, via `/buy/[planId]` and `/claim/[id]` (SPEC-0004): a first purchase for a destination with no paid plan yet. Re-purchase/upgrade of a team that already has an active paid plan is still out of scope, and a rejected or expired claim has no automatic refund — both are visible in `/admin/pending-purchases` for manual follow-up.
- i18n: `apps/app` only extracted the `welcome` key, and `layers/billing` the buyer-destination text of the plan form/table plus the Buy, Claim, and Pending-purchases screens (its locale files are declared in the layer's `nuxt.config.ts`); the rest of the interface is fixed in English.

## Technical Context

Verifiable details in `.fireskills/STACK.md` and `.fireskills/DATABASE.md`. For each area, load the corresponding specialist in `fireskills/specialists/` (see `AGENTS.md`).
