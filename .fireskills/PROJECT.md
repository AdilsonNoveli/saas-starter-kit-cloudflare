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
| Billing: database-driven plans, Stripe and Paddle checkout, webhooks with KV idempotency ledger | `layers/billing` |
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
- Pricing page on website (`LandingPricing.vue`) is static; does not read `Plan` records from database.
- Team dashboard chart is illustrative (random walk), not real data.
- i18n: `apps/app` only extracted the `welcome` key; the rest of the interface is fixed in English.

## Technical Context

Verifiable details in `.fireskills/STACK.md` and `.fireskills/DATABASE.md`. For each area, load the corresponding specialist in `fireskills/specialists/` (see `AGENTS.md`).
