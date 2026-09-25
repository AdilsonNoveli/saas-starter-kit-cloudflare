# System Rules

These rules complement agent instructions without superseding specs or acceptance criteria. Evidence for each lives in the referenced specialist.

## Architecture

- Separation of Concerns: one file, single responsibility.
- Extreme componentization; folder and file structures designed for maintainability.
- DRY: maximum code reuse. YAGNI: do not implement unrequested functionality. KISS: simplest robust solution.
- Business domain lives in `layers/`; `apps/app` (Composition Root) contains no domain business logic. See `fireskill-specialist-nuxfire-layers`.
- "Active layer" has a single source of truth: `config.ts` → `activeLayerNames`. Never determine activation by disk presence.
- Abilities (`defineAbility`) carry layer prefix; tRPC procedures do not. Each layer router exports a `routers` map matching `satisfies`.
- Drizzle Schema: barrel `apps/functions/src/database/schema.ts` imports each layer by **package specifier**, never relative path.

## Code and Quality

- Strict typing, **zero `any`**, enforced by `scripts/no-explicit-any.test.ts` (parses every tracked `.ts`/`.vue`). Third-party constraints that require `any` are derived from the library (see `AnyAbility` in `apps/app/server/trpc/trpc.ts`), never restated.
- Zero dead or speculative code; clean, verified, optimized implementation.
- Styling and customization rules (semantic tokens only, `packages/tokens` as the single source): `.fireskills/DESIGNSYSTEM.MD`. See `fireskill-specialist-nuxt-ui`.
- Inside Workers, never log raw `Error` objects: serialize `message`, `name`, `stack`.

## Testing

- Vitest is the test runner (`bun run test`). Each layer with tests has its own `vitest.config.ts`, and its `vitest.setup.ts` exposes `defineAbility` as a global (Nuxt's auto-import does not exist in Vitest). `scripts/` and `packages/tokens` are their own projects.
- `nuxt typecheck` does **not** cover server routes: also run `bunx vue-tsc --noEmit -p server/tsconfig.json` in `apps/app`.
- Green `tsc`/`vitest`/`nuxt build` does **not** prove deployment: for `apps/functions` and `layers/`, the real verification gate is `sst deploy` on a test stage.
- Tests never run against development database (`fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs`).

## Security and Privacy

- Secrets in `SCREAMING_SNAKE_CASE`, identical across `.env.example`, `infra/secret.ts`, and `Resource.<NAME>`; only public values carry `NUXT_PUBLIC_`. Never commit or expose `.env.stage` / `.env.production`.
- Installation identity (product name, domain, full sender e-mail) is only the `BRAND_*` variables of the stage env file, read solely by `scripts/branding.ts`; never hardcode a domain, sender or brand name in code, and never add defaults for them.
- Empty secret routes **fail closed** (platform and user MFA).
- Internal Worker `Auth` endpoints require constant-time `x-admin-secret`.
- `platformAdminProcedure` requires active `PlatformAdmin` + MFA + elevated 30-minute session; never derived from `abilityProcedure`.
- Seeds that run on deploy (`apps/functions/src/database/seed/index.ts`) never create admins or carry credentials. `apps/functions/src/database/seed/demo-accounts.ts` and `apps/functions/src/database/grant-platform-admin.ts` and `apps/functions/src/database/reset-mfa.ts` are manual-only; the demo script's default passwords are throwaway.
- Data reset of `User` requires purging both `AuthKV` keys (`["email", email, "password"]` and `["users", email]`).

## Operations

- Deployment: `bun run deploy -- --stage <stage>` (`--stage` CLI flag is mandatory; never `SST_STAGE=`). Production has `retain` + `protect`.
- Migrations: generate with `drizzle-kit generate` (review SQL); apply **only** via deployment. No rollbacks: use expand/contract patterns.
- Do not modify without verified understanding: `linker = "hoisted"`, split `unenv` (root v2 / apps v1), exact version patches, `ssr: false` on auth views.
- Optional Cloudflare resources live behind `flags` in `config.ts`; code gracefully handles missing bindings.
- See `fireskill-specialist-sst` and `fireskill-specialist-cloudflare-workers`.

## Specific Project Rules

- **Dark mode mandatory across all UI surfaces.**
- **User notifications via `useNotification`** (`success`/`error`/`info`/`warning`/`message`/`confirm`); `useToast()` is called only inside the three `useNotification` wrappers (`apps/app`, `apps/login`, `apps/web`) and `window.confirm` is never used, enforced by `scripts/notification-rules.test.ts`. Error messages from `catch` come from `getErrorMessage(error)` (`apps/app/shared/utils/error-message.ts`).
- **Media and file storage via Cloudflare R2** (`hubBlob()` in NuxtHub, S3-compatible API); there is no AWS S3 bucket in this project.
- Always apply clean-up improvements to files within touched scope.
- **Blog posts and content pages (SEO contract).** Every post under `apps/web/content/blog` declares `title`, `description`, `date`, `author` and `lang` (`en`, `pt-br` or `es`; there is no default and it is never inferred), a raster `ogImage` (`.png`/`.jpg`, generated from the SVG cover with `bun run generate:og`), and the same `translations` block on every language version (each language to its slug, itself included). **Every post exists in all three languages** (`en`, `pt-br`, `es`), each with its own cover when the image has text: the site follows the visitor's language, and `check:seo` rejects a post that lacks one. Titles are specific and never carry the brand (it is appended); every page has one `<h1>` and its own description. Metadata comes only from the builders in `apps/web/app/utils/seo/content-seo.ts` through `useArticleSeo`/`usePageSeo`: a layout that renders content never leaves the SEO module’s fallback title. A content URL that resolves to nothing answers 404, never 200. Build with the real `SITE_URL` and run `bun run check:seo` before declaring content work done. Writing posts: load `fireskill-specialist-content-seo`.
- **Human-readable text (copy contract).** Every string a person reads in `apps/*`, `layers/*` and `packages/emails` (interface text, errors, empty states, emails, notifications, docs, landing, pricing, legal; not the names of menus, tools and features) is written with `fireskill-specialist-copywriting`, lives in the locale files (`en`, `pt-br` and `es` change together, `bun run check:i18n`) and never as a literal in a `.vue` template. A number, comparison, guarantee, result, price, deadline, named source or testimonial needs a record in `.fireskills/CLAIMS.yml` with a verifier a machine can run; a countdown or "only today" exists only with a real, dated limit in the ledger; a testimonial is a person who exists, used the product and consented, shown with their own photo or with none. `bun run check:copy` enforces it; known defects are dated entries of `scripts/copy-baseline.json`, each owned by a spec or backlog item, and the list only shrinks. Not legal advice: the owner confirms the rules of the markets served.
- **Public page weight and delivery.** Changes to what `apps/web` ships to the browser (scripts, images, fonts, third-party code, hydration, `routeRules`) load `fireskill-specialist-web-performance`; the budgets and their dated baselines are in `perf-budgets.json` and only shrink; `bun run check:perf` runs against a fresh build. LCP, INP and CLS are recorded by the lab protocol of the specialist and never claimed from the byte gate.
- **What search engines require of a page.** Status codes, redirects, canonical, sitemap and `lastmod`, robots directives, structured data and IndexNow are governed by `fireskill-specialist-seo`: a moved URL is a `301` line in `apps/web/public/_redirects` (never a `redirect` route rule or a meta refresh), the `Web` Worker serves `drop-trailing-slash`, the sitemap `lastmod` carries date and time, no `FAQPage`, no rating or review markup without real reviews. `bun run check:seo` (and `--live` against a running server) enforces it. `bun run indexnow` is a dry run unless the owner authorizes `--submit`.
