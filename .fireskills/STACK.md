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
| Package Manager | Bun | `bun.lock` |
| Runtime | Cloudflare Workers (SST) | `sst.config.ts` |
<!-- specsfy:stack:end -->

## Project Decisions and Notes

Technical details for each item live in the corresponding specialist (`fireskills/specialists/`). Here are only the decisions that the code does not make obvious.

- **Runtime**: Cloudflare Workers via SST, no `wrangler.toml`, no Docker, no Linux server.
- **Database**: PostgreSQL via Hyperdrive with Drizzle (see `.fireskills/DATABASE.md`). Not `hubDatabase()` nor Prisma.
- **Migrations (SPEC-0006)**: three independent Drizzle Kit histories, not one. `drizzle-kit` is a `devDependency` of `apps/functions` (base, `layers.core`) **and** of every feature layer that owns tables (`layers/kanban`, `layers/billing`), each with its own `drizzle.config.ts`, `migrations/` folder, and tracking table (`drizzle.__drizzle_migrations[_<layer>]`). Applied by separate `drizzle-kit migrate` invocations in `infra/utils/nuxt.ts`, gated on `config.ts`'s `layers.features` — a feature turned off never runs its migration, so its tables never reach that database. See `apps/functions/src/database/MIGRATIONS.md` and `fireskill-specialist-drizzle`.
- **Authentication**: OpenAuth.js in dedicated Worker (`PasswordProvider` + `CodeProvider`, plus GitHub and Google when credentials exist). Not NextAuth/Lucia/Clerk.
- **Authorization**: `nuxt-authorization` (Bouncer style, `defineAbility`); not CASL.
- **KV and cache**: NuxtHub's `hubKV()`/`hubCache()`.
- **Email**: React Email; Resend active. Mailgun, SES, SparkPost, and SMTP exist in the mailer fork (`packages/emails/mailer`), disabled in `config.ts` and commented out in `apps/functions/src/emails.ts`.
- **React** exists solely in `packages/emails`; product UI is Vue.
- **Testing**: Vitest; no Playwright or Cypress.
- **Content SEO**: page metadata of `apps/web` comes from pure builders (`apps/web/app/utils/seo/content-seo.ts`) applied through `nuxt-seo-utils`/`nuxt-schema-org`; social images are PNGs rendered at build time from SVG covers with `sharp` (an exact root `devDependency`, scripts only, never bundled into the Worker) and audited by `bun run check:seo`. See `fireskill-specialist-content-seo`. Not `nuxt-og-image` (disabled).
- **Web delivery, search requirements and copy gates** (SPEC-0002, no new dependency: Node and Bun built-ins only, never bundled into a Worker): `bun run check:perf` (byte and structure budgets in `perf-budgets.json`, dated baselines that only shrink), `bun run check:seo -- --live <origin>` (read-only HTTP audit), `bun run indexnow` (dry run by default), `bun run check:copy` (claim ledger `.fireskills/CLAIMS.yml`, testimonials, urgency, literal text in templates). Moved URLs are `301` lines in `apps/web/public/_redirects` and the `Web` Worker serves `assets.htmlHandling: drop-trailing-slash`. See `fireskill-specialist-web-performance`, `fireskill-specialist-seo` and `fireskill-specialist-copywriting`.
