---
name: fireskill-specialist-openauth
description: Build and review authentication with OpenAuth.js in Nuxfire — issuer Worker (`apps/functions/src/auth.ts`), password/code/GitHub/Google providers, subjects, sessions and credentials stored in `AuthKV`, application cookies and auth callbacks, internal endpoints protected by admin secret, login rate limiting, and identity deletion. Use when touching `apps/functions/src/auth.ts`, `apps/functions/src/subjects.ts`, `apps/app/server/utils/auth.ts`, `server/api/auth/*`, `apps/login`, or `infra/auth.ts`; team permissions belong to `$fireskill-specialist-nuxt-authorization`, and MFA/general application security belongs to `$fireskill-specialist-application-security`.
---

# OpenAuth.js

## When to Use

- Activate when modifying the issuer Worker, providers, subjects, session cookies, auth callback, `getUser`/`getUserSession`, login/registration/recovery pages, or `/internal/identity/*` endpoints.
- Activate when debugging `/authorize` redirect loops, `email_taken` errors, `23505` unique key violations on `User_email_unique`, or stalled session resolutions.
- Activate when resetting user data in development environments.
- Do not activate for team permissions (`nuxt-authorization`) or MFA/TOTP implementation (`$fireskill-specialist-application-security`).
- Combine with `$fireskill-specialist-cloudflare-workers` (KV, service bindings), `$fireskill-specialist-sst` (`infra/auth.ts`, secrets), `$fireskill-specialist-drizzle` (`User`), and `$fireskill-specialist-nuxt-ui` (`apps/login` views).

## Workflow

1. Read [references/nuxfire-openauth.md](references/nuxfire-openauth.md).
2. Identify where modifications apply: **issuer** (`apps/functions`), **client/session** (`apps/app/server`), or **UI** (`apps/login`).
3. When touching secrets, cookies, or credentials, prioritize **fail-closed** behavior.
4. Implement and validate against checks below, including edge cases and error responses.

## Key Rules

- Password hashes and identity profiles live **strictly in KV `AuthKV`**; PostgreSQL contains no sessions table or password fields.
- `AuthKV` is bound **exclusively** to the `Auth` Worker. External callers request identity operations via internal endpoints (`config.ts`: `identityDeletePath`, `sessionsRevokePath`, `identityStatePath`, `emailChangePath`, `seedAccountPath`), always via `POST` with `x-admin-secret`.
- Internal endpoints: use **constant-time comparisons**, return **503** if secret is unconfigured, return **403** on mismatch; never fall back to open access. Invocation via service binding grants zero implicit authorization.
- App-to-Auth communication goes through service binding `env.Auth`, re-read per request; if missing, fail with explicit error.
- `getIssuer(env)` is instantiated **per request**; never cache `issuer()` promises globally.
- OAuth providers are registered only when valid credentials exist (`id && secret`); `apps/login` mirrors this truth via public flags.
- PostgreSQL user records upsert by **`session.id`** (subject ID), never by email.
- `getUser` never returns `mfaSecret` and exposes only boolean flags for admin/MFA status.
- Every login issues the stable subject `user:<id>` with a per-login `sid` and a 15-minute access token (`ACCESS_TOKEN_TTL_SECONDS`); the issuer writes `["email", email, "subject"] = user:<id>` only **after** `ctx.subject`. Session revocation scans only the prefix `["oauth:refresh", "user:<id>"]` (`apps/functions/src/session-store.ts`) and spares the caller by `sid`; never scan all of `oauth:refresh`.
- Credential rate limiting executes **before** the issuer, only on `POST` requests of the four credential routes; do not throttle OAuth providers.
- Cookies and tokens: `nuxfire-access-token` (non-httpOnly for WebSocket handshakes), `nuxfire-refresh-token` (httpOnly); MFA and admin elevations live in separate, dedicated cookies.
- `apps/login` keeps `ssr: false` across login, registration, and recovery routes.
- Resetting a `User` requires purging **both** KV keys by email (`["email", email, "password"]` and `["users", email]`) in the same operation.
- Worker logging: never log raw `Error` objects; serialize `message`, `name`, and `stack`.

## Anti-patterns

- Removing `ssr: false` from login routes to "fix" hydration mismatches.
- Caching the issuer or client without re-reading runtime bindings.
- Looking up users by email in callback handlers; overwriting `User.id` upon encountering `23505`.
- Internal endpoints failing open when `ADMIN_SECRET` is unset; comparing secrets with `===`.
- Placing `NUXT_AUTH_ADMIN_SECRET` under `NUXT_PUBLIC_`.
- Truncating `User` without clearing KV (or vice-versa): produces account split-brain states.
- Counting attempt failures inside provider callbacks (callbacks execute only after valid credential verification).
- Leaking `mfaSecret` or "MFA verified in current session" status in `/api/auth/session` responses.
- Calling public HTTP endpoints of `Auth` from `App` instead of using `env.Auth`.

## Validation

- Test login via password, email code, and all **configured** OAuth providers; unconfigured providers must not appear in UI.
- Test lifecycle: registration -> login -> logout -> re-login; allow access token expiration and verify transparent refresh token renewal.
- Missing PostgreSQL user row: session remains valid without `/authorize` redirect loops.
- Rate limiting: 6th invalid password attempt within 5 minutes redirects with `err=too_many_requests` and `Retry-After` header.
- Internal endpoints: missing secret yields 403; missing `ADMIN_SECRET` in Worker yields 503.
- Account deletion: removes KV keys (password, user profile, refresh tokens) and PostgreSQL row; re-registration with same email succeeds cleanly.
- `sessionsRevokePath` with `exceptSid`: current session persists while other sessions are terminated; with `onlySid`: only that session ends; with neither: 400.
- Dev reset: re-registering previously deleted email triggers neither `email_taken` nor `23505`.
- `bun run test` (Vitest) and typecheck pass across `apps/app` and `apps/functions`.

## Related Skills

- `$fireskill-specialist-nuxt-authorization` — user permissions and access control.
- `$fireskill-specialist-application-security` — MFA, secrets, and cookies.
- `$fireskill-specialist-cloudflare-workers` — KV, service bindings, and I/O.
- `$fireskill-specialist-sst` — `infra/auth.ts`, secrets, and provider flags.
- `$fireskill-specialist-drizzle` — `User` table and data resets.
- `$fireskill-specialist-nuxt` — global middleware and `useSession`.
