# OpenAuth in Nuxfire — What Actually Exists in the Codebase

Each statement includes concrete file evidence. The codebase supersedes this document.

## 1. Architecture

- **`@openauthjs/openauth`** (`^0.3.6` in `apps/functions/package.json`; patched via
  `patches/@openauthjs%2Fopenauth@0.3.9.patch` — locked to exact patch version).
- Issuer deployed on a **dedicated Worker**: `apps/functions/src/auth.ts`, serving
  `auth.<domain>`, created in `infra/auth.ts` linked to `AuthKV` and the `Emails`
  Worker (service binding).
- UI is `apps/login` (static `nuxt generate` bundle), hosted as static assets from
  the same Worker. Login, signup, and recovery are pre-rendered **and** driven by query
  strings (`?state=code`); this combination breaks hydration, requiring `{ ssr: false }`
  in `routeRules`. **Do not remove `ssr: false`.**
- The application (`apps/app`) is an **OAuth client** to the issuer: `createClient`
  from `@openauthjs/openauth/client`, with `issuer`/`clientID` populated from
  `runtimeConfig.public` (`authUrl`, `authClientID`).
- App → `Auth` requests route via **service binding** `env.Auth`
  (`server/utils/auth.ts` → `getClient`), never across public URLs. The binding is
  re-read on each request because initial isolate invocations may arrive via internal
  dispatches lacking bindings; caching without bindings locks the isolate onto slow public paths.

## 2. Authentication Providers

`PasswordProvider` (with `ScryptHasher`) and `CodeProvider` are always enabled;
`GithubProvider` and `GoogleProvider` activate **only if credentials exist**
(`Boolean(id && secret)`, not just feature flags). `apps/login` mirrors this state via
`NUXT_PUBLIC_GITHUB_AUTH_ENABLED` / `NUXT_PUBLIC_GOOGLE_AUTH_ENABLED` (`infra/auth.ts`),
preventing buttons that fail on click.
Scopes: GitHub `read:user user:email`; Google `openid email profile`.

`getIssuer(env)` is instantiated **per request, never cached**: `issuer()` initiates
KV reads of signing keys and holds pending promises; cached across requests, the first
request failing to await them leaves hanging promises, locking all subsequent requests
(~10s freezes on session checks). Reinstantiation overhead is minimal.

The issuer `success` callback (`ctx.subject("user", {...})`):
1. retrieves `{ email, name?, image?, data? }` from the provider (Google userinfo;
   GitHub `/user` and `/user/emails`, selecting primary verified email);
2. reads/updates user profiles in `["users", email]` (only `createId()` on cache miss);
3. sends a `Welcome` email on **new account creation**;
4. returns the subject payload `{ id, name, email, image }`.

Verification code emails dispatch through `sender(env.Emails)` (`"VerificationCode"`).

## 3. Subjects (`apps/functions/src/subjects.ts`)

`createSubjects({ user: baseUser })`, using `valibot` (`id`, `email`, `name`, `image`, all strings).
`FullUser` (with `createdAt`, `updatedAt`, `accounts[]`) represents the complete record stored in KV.
The app depends on `@nuxfire/functions/subjects`.

## 4. What Resides in `AuthKV` (And Why Postgres Lacks `sessions`)

- Password Credentials: key `["email", email, "password"]` (Scrypt digest) —
  lives **strictly in KV**.
- Identity Profile: `["users", email]` = `{ id, email, name, image, accounts[] }`.
  Its `id` becomes the subject, then `session.id` in the app, then `User.id` in Postgres.
- `["email", email, "subject"]` and tokens `["oauth:refresh", subject, token]`.
- Issuer cryptographic signing keys.

**Two independent keys exist per user, both required** (password and profile).
Wiping only Postgres (`User`) or only KV induces **split-brain**: new registrations fail
with `email_taken`, or newly generated `createId()` collides on `User_email_unique` (`23505`,
which `callback.ts` catches and refuses to mask). Dev resets touching `User` must purge
both keys for affected emails simultaneously (using delimiter `\x1f`, `String.fromCharCode(0x1f)`
— not `:`), or flush the entire namespace on disposable test stages.

## 5. Internal `Auth` Worker Endpoints (Protected by Secret)

Endpoints defined in `config.ts` (shared paths across both boundaries):

| Constant | Path | Operation |
|---|---|---|
| `identityDeletePath` | `/internal/identity/delete` | Purges credentials, profile, and all refresh tokens for an email |
| `signOutOthersPath` | `/internal/identity/sign-out-others` | Revokes all refresh tokens for an email except the caller's |
| `seedAccountPath` | `/internal/identity/seed` | Creates/resets identities with known passwords (demo seed only) |

All endpoints: `POST`, `x-admin-secret` header verified using **constant-time comparison**
(`secretsMatch`), **503** if `ADMIN_SECRET` is unconfigured (rejects instead of exposing
unauthenticated endpoints), **403** on mismatch. Secrets are generated per stage
(`random.RandomUuid("AuthAdminSecret")`), never committed to source, reaching the app
as `NUXT_AUTH_ADMIN_SECRET` (without `PUBLIC`). The URL is public, so **arriving via service
binding proves nothing**: the secret provides authorization.
Structural rationale: `AuthKV` links exclusively to the `Auth` Worker; callers outside
it (the app, seed scripts) must **request** mutations.
Revocation matches by `properties.email` (not subject hash) because subject hashes recalculate
from current properties and diverge if profiles mutate (e.g., `updateProfile` changing `name`).
Client refresh tokens format as `"{subject}:{token}"`; the final `:` separates subject from token.
`seedAccount` is idempotent and avoids issuing new IDs for existing emails (preventing orphaned
Postgres profiles and `TeamMembership` records).

## 6. Credential Rate Limiting

`enforceCredentialRateLimit` executes **prior to** the issuer (not inside provider callbacks,
which only run post-credential verification), on `POST` requests targeting `/password/authorize`,
`/password/register`, `/password/change`, `/code/authorize` (5 attempts; 5-min window on login,
15-min on other endpoints).
Key: `auth:<pathname>:<ip>:<email>`; for code verification steps lacking emails, email falls back
to `-` (IP-based bucket). On exhaustion: 302 redirect to origin page with `err=too_many_requests`
and `Retry-After`. Third-party OAuth providers (`/github/*`, `/google/*`) are omitted by design.
Implemented in `apps/functions/src/rate-limit.ts` (raw KV, minimum TTL 60s; `CF-Connecting-IP`).
This does not represent a general API throttle: standard tRPC procedures are **not** rate-limited.

## 7. App Integration (`apps/app/server/`)

- Cookies: `nuxfire-access-token` (**not** httpOnly: browser WebSockets require it) and
  `nuxfire-refresh-token` (httpOnly), `sameSite: "lax"`, 1-year duration (`setTokens`).
  Elevated platform admin session: `nuxfire-platform-mfa-verified`, sealed h3 session **distinct**
  from the token pair. User MFA: `nuxfire-mfa-verified` (`user-mfa-session.ts`).
- `api/auth/callback.ts`: exchanges `code` for tokens (`client.exchange`), sets cookies,
  reads session with **explicit tokens** (stale browser cookies could otherwise fail verification),
  executes **`User` upsert by `session.id`** (never by email: email is a mutable attribute;
  upserting by email duplicates profiles, stripping team memberships and roles), and redirects
  to `nuxfire-redirect` cookie or `/`. Error `23505` logs as "identity and profile out of sync"
  and re-throws — do not reuse another profile's row or overwrite `id`.
- `getUserSession`: returns early if access token is absent (avoids querying `Auth` merely to
  hear "unauthenticated"); calls `client.verify(subjects, access, { refresh })` and updates cookies
  upon refresh.
- `getUser(event)`: resolves profile by **id** (matching upsert and permission criteria),
  **excluding** `mfaSecret` (payload goes to `/api/auth/session`), with team permissions,
  `isPlatformAdmin` (boolean only), and `mfaEnabled` (boolean). Absent `User` rows, falls back
  to token subject (preventing redirect loops to `/authorize`).
- `getUserPermissions` degrades to "empty permissions" upon database errors — safety rail,
  not normal flow; logging indicates real defects.
- Routes: `api/auth/{callback,session.get,session.delete,ws-ticket.get}`,
  `api/mfa/{challenge,setup,status,verify}`.

## 8. Account Deletion

`account.deleteAccount` (`apps/app/server/trpc/routers/account.ts`) invokes the internal
`Auth` endpoint via service binding with `x-admin-secret`, ensuring identity and profile
remain synchronized.

## 9. Logging

Never pass raw `Error` objects to `console.error` in Cloudflare Workers: `message`, `stack`,
and `name` are non-enumerable and serialize as `{}`. Extract explicit fields
(`{ message, name, stack }`) beforehand — standardized across `auth.ts`, `callback.ts`, `emails.ts`.

## 10. What Does NOT Exist

- Sessions table in Postgres; NextAuth / Lucia / Clerk; magic-link as sole authentication
  (passwords **and** one-time codes coexist).
- Self-service MFA recovery: locked admins require direct database intervention to clear `mfaEnabledAt`.
- Distinct permission sets for `SUPER_ADMIN` versus `SUPPORT` (the enum exists; procedures do not yet differentiate).
