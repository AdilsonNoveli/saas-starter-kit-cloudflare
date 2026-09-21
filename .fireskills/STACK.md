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
- **Authentication**: OpenAuth.js in dedicated Worker (`PasswordProvider` + `CodeProvider`, plus GitHub and Google when credentials exist). Not NextAuth/Lucia/Clerk.
- **Authorization**: `nuxt-authorization` (Bouncer style, `defineAbility`); not CASL.
- **KV and cache**: NuxtHub's `hubKV()`/`hubCache()`.
- **Email**: React Email; Resend active. Mailgun, SES, SparkPost, and SMTP exist in the mailer fork (`packages/emails/mailer`), disabled in `config.ts` and commented out in `apps/functions/src/emails.ts`.
- **React** exists solely in `packages/emails`; product UI is Vue.
- **Testing**: Vitest; no Playwright or Cypress.
