# System Stack

Document structural technologies and the executable evidence that confirms each
one. Preserve human decisions in the freeform sections of this file.

## Detected Inventory

<!-- specsfy:stack:start -->
| Layer | Technology | Evidence |
| --- | --- | --- |
| Framework | Nuxt | `package.json` (`nuxt`) |
| Library | Vue | `package.json` (`vue`) |
| Library | @nuxt/ui | `package.json` (`@nuxt/ui`) |
| API | tRPC (trpc-nuxt) | `package.json` (`trpc-nuxt`) |
| State | Pinia | `package.json` (`pinia`) |
| Authorization | nuxt-authorization | `package.json` (`nuxt-authorization`) |
| Authentication | OpenAuth.js | `package.json` (`@openauthjs/openauth`) |
| Infrastructure | SST | `package.json` (`sst`) |
| Library | React | `package.json` (`react`) |
| Language | TypeScript | `package.json` (`typescript`) |
| Tests | Vitest | `package.json` (`vitest`) |
| Persistence | Drizzle ORM | `package.json` (`drizzle-orm`) |
| Runtime | Node.js | `package.json` |
| Package Manager | Bun 1.4.0, pinned by `packageManager` in `package.json` | `bun.lock`, `package.json` |
| Runtime | Cloudflare Workers (SST) | `sst.config.ts` |
<!-- specsfy:stack:end -->

## Project Decisions and Notes

Technical details for each item live in the corresponding specialist (`fireskills/specialists/`). Here are only the decisions that the code does not make obvious.

- **Runtime**: Cloudflare Workers via SST, no `wrangler.toml`, no Docker, no Linux server.
- **Database**: PostgreSQL via Hyperdrive with Drizzle (see `.fireskills/DATABASE.md`). Not `hubDatabase()` nor Prisma.
- **Migrations (SPEC-0006, extended to admin, notifications, teams, and SPEC-0010 account)**: seven independent Drizzle Kit histories, not one. `drizzle-kit` is a `devDependency` of `apps/functions` (base) **and** of every layer that owns tables and has a one-directional-or-no FK against `core-schema.ts` — `layers/admin`, `layers/notifications`, `layers/teams`, `layers/account` (`layers.core`, always applied) and `layers/kanban`, `layers/billing` (`layers.features`, gated) — each with its own `drizzle.config.ts`, `migrations/` folder, and tracking table (`drizzle.__drizzle_migrations[_<layer>]`). `layers/teams` broke its cycle in SPEC-0006 (`Job`/`DeadLetterRecord` moved to teams), and `layers/account` owns `0000_account.sql` (`UserPreference`, `UserMfa`, `UserMfaRecoveryCode`, `UserSession`, tracking table `__drizzle_migrations_account`). Applied via `scripts/run-migrations.mjs` (never `drizzle-kit migrate`'s own CLI) in `infra/utils/nuxt.ts`, unconditionally for core histories, gated on `config.ts`'s `layers.features` for feature histories — an inactive feature never runs its migration, so its tables never reach that database. See `apps/functions/src/database/MIGRATIONS.md` and `fireskill-specialist-drizzle`.
- **Preferences and theme (SPEC-0010)**: the theme is stored in a cookie (`colorMode.storage: "cookie"` in `apps/app/nuxt.config.ts`, default key `nuxt-color-mode`) so the server renders the first paint in the person's theme; the language cookie is the module's `i18n_redirected`. The server row `UserPreference` is the source and the login callback copies it to both cookies. `ColorModeSwitch` and `LocaleSwitch` come from the `@nuxfire/tokens` Nuxt layer (`packages/tokens/app/components/`), which `apps/web` and `apps/app` already extend.
- **Security primitives (SPEC-0009)**: two internal Bun workspace packages, both `private`, exporting their `.ts` source like `packages/tokens`, with their own Vitest project listed explicitly in `vitest.config.mts`. `packages/crypto` (`@nuxfire/crypto`) holds AES-GCM secret encryption, HMAC-SHA256, the base64/base64url/hex conversions, the constant-time `secretsMatch`, the pure half of the MFA recovery codes and the WebSocket ticket, using Web Crypto only. `packages/rate-limit` (`@nuxfire/rate-limit`) holds the fixed-window core behind a `get`/`set` storage port, with one adapter for NuxtHub's `hubKV()` and one for a `KVNamespace`. Only `apps/app/server/utils/rate-limit.ts` and `apps/functions/src/rate-limit.ts` bind it to a KV; the layers call the app wrapper by path, so no layer declares the package. Neither imports h3, Nitro, the database or a layer (`scripts/primitives-policy.test.ts`); the rule that keeps them the single source is in `.fireskills/RULES.md`.
- **Authentication**: OpenAuth.js in dedicated Worker (`PasswordProvider` + `CodeProvider`, plus GitHub and Google when credentials exist). Not NextAuth/Lucia/Clerk.
- **Authorization**: `nuxt-authorization` (Bouncer style, `defineAbility`); not CASL.
- **KV and cache**: NuxtHub's `hubKV()`/`hubCache()`.
- **Email**: React Email; Resend active. Mailgun, SES, SparkPost, and SMTP exist in the mailer fork (`packages/emails/mailer`), disabled in `config.ts` and commented out in `apps/functions/src/emails.ts`.
- **React** exists solely in `packages/emails`; product UI is Vue.
- **Testing**: Vitest; no Playwright or Cypress.
- **Continuous integration** (SPEC-0007): `.github/workflows/ci.yml` validates every pull request and every push to `stage` with `bun install --frozen-lockfile`, `bun run test`, `nuxt typecheck` and `vue-tsc -p server/tsconfig.json` in `apps/app`, `bun run check:i18n` and `bun run check:copy`. It publishes nothing and holds no credentials; publishing stays manual (`bun run deploy`). The Bun version in the workflow is the one in `packageManager` (checked by `scripts/ci-workflow.test.ts`).
- **Content SEO**: page metadata of `apps/web` comes from pure builders (`apps/web/app/utils/seo/content-seo.ts`) applied through `nuxt-seo-utils`/`nuxt-schema-org`; social images are PNGs rendered at build time from SVG covers with `sharp` (an exact root `devDependency`, scripts only, never bundled into the Worker) and audited by `bun run check:seo`. See `fireskill-specialist-content-seo`. Not `nuxt-og-image` (disabled).
- **Web delivery, search requirements and copy gates** (SPEC-0002, no new dependency: Node and Bun built-ins only, never bundled into a Worker): `bun run check:perf` (byte and structure budgets in `perf-budgets.json`, dated baselines that only shrink), `bun run check:seo -- --live <origin>` (read-only HTTP audit), `bun run indexnow` (dry run by default), `bun run check:copy` (claim ledger `.fireskills/CLAIMS.yml`, testimonials, urgency, literal text in templates). Moved URLs are `301` lines in `apps/web/public/_redirects` and the `Web` Worker serves `assets.htmlHandling: drop-trailing-slash`. See `fireskill-specialist-web-performance`, `fireskill-specialist-seo` and `fireskill-specialist-copywriting`.
