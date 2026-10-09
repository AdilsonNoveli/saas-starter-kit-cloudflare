# Project

## History and Motivation

Serelius (`serelius.com`) is built on the Nuxfire starter kit (Nuxt 4, Cloudflare Workers, SST) and keeps everything the kit already does; the internal package scope stays `@nuxfire/*`. Product direction, closed decisions and the order of the phases live in one place, `_roadmaps/plano-mestre-serelius.md`; each decision is recorded as an ADR in `docs/adr/`. This file holds only what exists in the code.

## Purpose

A network app where the person is always the center ("expert in people"): from a person the possibilities appear. The principles every spec must meet are in the plano mestre, Part 0.2.

## Users and Operational Context

Anyone who keeps a network of relationships, alone or in a workspace shared with other users (roles and visibility: plano mestre, Part 4.3). Operation: Cloudflare Workers with PostgreSQL reached through Hyperdrive; database changes follow the database change policy in `.fireskills/RULES.md`.

## Core Capabilities

The single record of what exists in code today; each spec updates it when it delivers. Serelius extends these capabilities instead of rebuilding them.

| Capability | Location |
|---|---|
| Identity and session: OpenAuth (password, email code, GitHub, Google), optional TOTP MFA, login rate limiting. Every login, whatever the provider, goes through `issueUserSession` (`apps/functions/src/session-store.ts`, the single place that opens a session; a provider that returns no e-mail is refused first) and gets the stable subject `user:<id>` and a per-session `sid` (a UUID kept across renewals); the access token lasts 15 minutes (`ACCESS_TOKEN_TTL_SECONDS` in `config.ts`) and the app renews it with the refresh token. Revocation scans only the person's prefix `["oauth:refresh", "user:<id>"]`: "sign out other sessions" spares the caller's `sid`, deleting the identity removes all, and the issuer's password reset ends every session because the issuer rewrites `["email", <e-mail>, "subject"]` to `user:<id>` after each login. When verification fails, `getUserSession` clears the access and refresh cookies. Callback, session, middleware, `trpc.ts` and `audit-log.ts` stay in `apps/app` (Composition Root) | `apps/functions/src/auth.ts`, `apps/functions/src/session-store.ts`, `apps/functions/src/subjects.ts`, `apps/login`, `apps/app/server/utils/auth.ts` |
| Account and profile (`layers/account`, `layers.core`, SPEC-0009 and SPEC-0010): a three-step onboarding at `/onboarding` that records the preferences and creates the personal Space (or joins the pending invitation), preferences saved on the server (language, time zone, theme, date format, name order) with the language and theme switches in every header, profile and picture, the list of active sessions with end one or all the others, e-mail change with a code at each address (password and code logins only), delete account, MFA with recovery codes. Its own migration history `layers/account/migrations/0000_account.sql` | `layers/account/server/trpc/account.ts`, `layers/account/server/api/mfa/*`, `layers/account/server/api/upload/profile-picture.ts`, `layers/account/app/pages/account-settings/*`, `layers/account/app/components/{account,avatar,settings}/*`, `layers/account/server/utils/{user-mfa,user-mfa-session,mfa-recovery}.ts` |
| Security primitives with one source each, imported explicitly: AES-GCM, HMAC-SHA256, constant-time comparison, the pure half of the MFA recovery codes and the WebSocket ticket in `packages/crypto`; the fixed-window rate limit in `packages/rate-limit`. `layers/admin` imports them, plus the recovery-code database functions from `@nuxfire/layer-account/server/utils/mfa-recovery` | `packages/crypto`, `packages/rate-limit`, `layers/admin/server/utils/platform-admin.ts`, `scripts/primitives-policy.test.ts` |
| Continuous integration: validates pull requests and pushes to `stage` (tests, typechecks, i18n, copy); publishes nothing, no credentials | `.github/workflows/ci.yml` |
| Guarded database reset, separate from deploy (`bun run db:reset -- --stage <stage>`) | `scripts/reset-database.ts`, `scripts/reset-database-core.ts` |
| Teams, invitations (expire in 30 days), seats per plan, RBAC `Owner`/`Admin`/`Member`, team suspension | `layers/teams` |
| Platform console (`/admin`, MFA + elevated 30-minute session): companies, plans, queue/DLQ with replay, audit log, global notifications | `layers/admin`, `layers/billing`, `layers/notifications` |
| Billing (toggleable feature layer in `config.ts`, SPEC-0005): database-driven plans (each plan sets where a buyer lands after paying: a team of their own as Owner, or an existing team chosen in `/admin/plans`), Stripe and Paddle checkout, webhooks with KV idempotency ledger. A buyer without a team pays at `/buy/[planId]` (e-mail only), then claims access at `/claim/[id]` after creating an account, which creates the team/membership and activates the plan (`PendingPurchase`, `/admin/pending-purchases`). `layers/teams` does not import it (a team's `planId`/`maxSeats` are plain nullable columns) | `layers/billing` |
| In-app and real-time notifications (WebSocket/Durable Object) | `layers/notifications`, `apps/functions/src/websockets.js` |
| Queued jobs with DLQ and hourly cron (cron only writes a row to `Log`) | `infra/jobs.ts`, `infra/cron.ts`, `apps/functions/src/` |
| Transactional email (React Email; only Resend is active) | `packages/emails`, `apps/functions/src/emails.ts` |
| Design system (SPEC-0008): palettes `serelius` and `ink`, light and dark themes, radius, density, motion and focus, Atkinson Hyperlegible and IBM Plex Mono through `@nuxt/fonts` (provider `fontsource`), Phosphor duotone icons, and the brand files served to every app as a Nuxt layer | `packages/tokens`, `.fireskills/DESIGNSYSTEM.MD`, `scripts/design-tokens-policy.ts`, `scripts/generate-brand-icons.ts` |
| Public website: a 15-section landing page whose every text is a `landing.*` locale key in `en`, `pt-BR` and `es` (nothing written in the templates; example data in the cards is recorded as not a claim in `.fireskills/CLAIMS.yml`), blog (posts in `en`/`pt-br`/`es` with validated frontmatter, one index card per post in the active locale, per-post SEO, sitemap `lastmod`/hreflang), docs, and legal pages (Nuxt Content v3), audited by `bun run check:seo`, weighed by `bun run check:perf` and its text checked by `bun run check:copy` | `apps/web`, `scripts/check-seo.ts`, `scripts/check-perf.ts`, `scripts/check-copy.ts` |
| Kanban (toggleable feature layer in `config.ts`) | `layers/kanban` |
| Per-feature database migrations (SPEC-0006): `kanban` and `billing` each own an independent Drizzle Kit migration history (`layers/<name>/migrations/`), applied at deploy time by `scripts/run-migrations.mjs` (never the `drizzle-kit migrate` CLI, which crashes without a TTY), gated on `config.ts`'s `layers.features`. A feature turned off never runs its migration — its tables never reach that installation's database, not even empty | `layers/kanban/migrations`, `layers/billing/migrations`, `infra/utils/nuxt.ts`, `apps/functions/src/database/MIGRATIONS.md` |

## Boundaries and Non-Goals

What the code does not do or does not have yet (absence verified in code):

- No deployment automation: CI only validates (`.github/workflows/ci.yml`); publishing is manual (`bun run deploy`).
- No invoice list or download: the Billing tab only mentions "invoices" in text.
- No password-change form inside the app: for a person with a password credential the Security page leads to the issuer's "forgot password" flow in `apps/login`.
- MFA recovery: ten single-use recovery codes per factor (user and platform admin), issued at enrolment, redeemable at the challenge and regenerable after a fresh authenticator code; losing both is handled by the manual, audited `apps/functions/src/database/reset-mfa.ts`.
- The session record the issuer keeps (`["oauth:refresh", "user:<id>", <token>]`) holds `subject`, `type`, `properties` (with the `sid` and the login `provider`), `clientID`, `ttl` and `nextToken`, and drops `timeUsed` before saving (`@openauthjs/openauth` `issuer.js` `generateTokens`): it carries no device or place, which is why the app writes a `UserSession` row at login. "Last use" is the last token renewal (about fifteen minutes of resolution), because nothing writes to the database on a request with a valid access token.
- `User` has only `id`, `name`, `email`, `image`, `mfaSecret` and `mfaEnabledAt`; language, time zone, theme, date format and name order live in `UserPreference`, one row per person. A new person has no such row and is sent to `/onboarding` by `apps/app/app/middleware/2.onboarding.global.ts`; there is no phone, display name or per-category notification preference.
- Notifications have one per-user on/off preference; there are no per-category or per-channel preferences.
- Only the roles Owner, Admin and Member are seeded (`ensureSystemRoles`); there is no assistant or viewer role, no API token and no profile-picture cropping.
- No RSS feed, error tracking (Sentry etc.), tenant impersonation, IP allowlist in `/admin`, or MRR/ARR charts.
- Analytics: documentation page is "coming soon".
- The offer on the home page (`LandingOffer.vue`) reads one static configuration (`apps/web/app/utils/offer.ts`) for price/copy; it does not read `Plan` records from the database for that. Its Buy CTA (`CTAButton`, `--color-cta`/`--color-cta-foreground` brand green) links to apps/app's `/buy/[planId]` (SPEC-0004) for whichever `Plan` has `isPublicOffer: true` (at most one, toggled in `/admin/plans`) — read live from `apps/web` over a Cloudflare service binding to the `App` Worker (`infra/web.ts`'s `link: [contentDatabase, app]`, `layers/billing/server/api/public/offer.get.ts`, `apps/web/server/api/offer.get.ts`), no env var and no redeploy needed when the admin changes it. The CTA shows a "coming soon" state while no plan is flagged.
- Team dashboard chart is illustrative (random walk), not real data.
- The plan's buyer destination (`Plan.buyerTeamMode`, `Plan.buyerTeamId`) now provisions a real buyer, via `/buy/[planId]` and `/claim/[id]` (SPEC-0004): a first purchase for a destination with no paid plan yet. Re-purchase/upgrade of a team that already has an active paid plan is still out of scope, and a rejected or expired claim has no automatic refund — both are visible in `/admin/pending-purchases` for manual follow-up.
- i18n: the account (onboarding, Profile, Preferences, Security, header), the Space screens of `layers/teams` and `layers/billing`, the claim page and the invitation and purchase e-mails are in `en`, `pt-br` and `es`, with "Space", "Espaço" and "Espacio" for a team; each of those layers declares its locale files in its own `nuxt.config.ts`. The rest of the interface (kanban, notifications, platform console) is still fixed in English.

## Technical Context

Verifiable details in `.fireskills/STACK.md` and `.fireskills/DATABASE.md`. For each area, load the corresponding specialist in `fireskills/specialists/` (see `AGENTS.md`).
