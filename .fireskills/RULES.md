# System Rules

These rules complement agent instructions without superseding specs or acceptance criteria. They contain engineering rules verified against actual codebase files (details and evidence for each reside in the referenced specialist).

## Architecture

- Separation of Concerns: one file, single responsibility.
- Extreme componentization; folder and file structures designed for maintainability.
- DRY: maximum code reuse. YAGNI: do not implement unrequested functionality. KISS: simplest robust solution.
- Business domain lives in `layers/`; `apps/app` (Composition Root) contains no domain business logic. See `fireskill-specialist-nuxfire-layers`.
- "Active layer" has a single source of truth: `config.ts` → `activeLayerNames`. Never determine activation by disk presence.
- Abilities (`defineAbility`) carry layer prefix; tRPC procedures do not. Each layer router exports a `routers` map matching `satisfies`.
- Drizzle Schema: barrel `apps/functions/src/database/schema.ts` imports each layer by **package specifier**, never relative path.

## Code and Quality

- Strict typing, **zero `any`**.
- Zero dead or speculative code; clean, verified, optimized implementation.
- Only semantic `@nuxt/ui` tokens (`text-default`, `bg-elevated`...), never raw color palettes; theming centralized in `packages/tokens`. See `fireskill-specialist-nuxt-ui`.
- Inside Workers, never log raw `Error` objects: serialize `message`, `name`, `stack`.

## Testing

- Vitest is the test runner (`bun run test`). Each layer executes independently with its own `vitest.config.ts`; `defineAbility` is mocked in `vitest.setup.ts`.
- `nuxt typecheck` does **not** cover server routes: also run `bunx vue-tsc --noEmit -p server/tsconfig.json` in `apps/app`.
- Green `tsc`/`vitest`/`nuxt build` does **not** prove deployment: for `apps/functions` and `layers/`, the real verification gate is `sst deploy` on a test stage.
- Tests never run against development database (`fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs`).

## Security and Privacy

- Secrets in `SCREAMING_SNAKE_CASE`, identical across `.env.example`, `infra/secret.ts`, and `Resource.<NAME>`; only public values carry `NUXT_PUBLIC_`. Never commit or expose `.env.stage` / `.env.production`.
- Empty secret routes **fail closed** (platform and user MFA).
- Internal Worker `Auth` endpoints require constant-time `x-admin-secret`.
- `platformAdminProcedure` requires active `PlatformAdmin` + MFA + elevated 30-minute session; never derived from `abilityProcedure`.
- Never attach admin creation or hardcoded credentials to database seeds or deployments.
- Data reset of `User` requires purging both `AuthKV` keys (`["email", email, "password"]` and `["users", email]`).

## Operations

- Deployment: `bun run deploy -- --stage <stage>` (`--stage` CLI flag is mandatory; never `SST_STAGE=`). Production has `retain` + `protect`.
- Migrations: generate with `drizzle-kit generate` (review SQL); apply **only** via deployment. No rollbacks: use expand/contract patterns.
- Do not modify without verified understanding: `linker = "hoisted"`, split `unenv` (root v2 / apps v1), exact version patches, `ssr: false` on auth views.
- Optional Cloudflare resources live behind `flags` in `config.ts`; code gracefully handles missing bindings.
- See `fireskill-specialist-sst` and `fireskill-specialist-cloudflare-workers`.

## Specific Project Rules

- **Dark mode mandatory across all UI surfaces.**
- **User notifications via `useNotification`** (`success`/`error`/`info`/`confirm`); never `window.confirm`. Legacy `useToast()` occurrences must be migrated to `useNotification` when touched.
- **Media and file storage via Cloudflare R2** (`hubBlob()` in NuxtHub, S3-compatible API); there is no AWS S3 bucket in this project.
- Always apply clean-up improvements to files within touched scope.
