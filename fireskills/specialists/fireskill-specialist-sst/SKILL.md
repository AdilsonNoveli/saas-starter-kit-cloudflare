---
name: fireskill-specialist-sst
description: Define, modify, and deploy Nuxfire infrastructure with SST 4 on Cloudflare — resources in `infra/*.ts` (Workers, Hyperdrive, KV, R2, Queues, Cron, Durable Objects, D1), secrets by stage, `config.ts` flags, domains, `bun run deploy`, and edge cases that break deployments. Use when touching `infra/`, `sst.config.ts`, `config.ts` (flags), `.env.example`, or when preparing/debugging deployments; Worker runtime code behavior belongs to `$fireskill-specialist-cloudflare-workers`.
---

# SST 4 (Infrastructure as Code on Cloudflare)

## When to Use

- Activate when creating/modifying resources in `infra/*.ts`, adding secrets, flags, domains, queues, cron triggers, Durable Objects, or Workers.
- Activate when executing or debugging `sst deploy`, `sst secret load`, stage changes, Nitro build failures during deployment, or migrations/seeds executed on deployment.
- Do not activate for logic inside Worker handlers (`$fireskill-specialist-cloudflare-workers`), schema/migrations themselves (`$fireskill-specialist-drizzle`), or release/version workflows (`$fireskill-specialist-delivery-engineering`).
- Combine with `$fireskill-specialist-nuxfire-layers` (flags vs layers), `$fireskill-specialist-openauth` (Auth Worker), and `$fireskill-specialist-application-security` (secrets management).

## Workflow

1. Read [references/nuxfire-sst.md](references/nuxfire-sst.md); for common recipes, consult [references/recipes.md](references/recipes.md).
2. Locate the existing `infra/` file creating similar resources and follow its patterns.
3. Modify **infrastructure and application code in the same step** when dependencies exist (new binding -> `link` + runtime consumption + missing binding fallback).
4. Verify mandatory binding names (`BLOB`, `KV`, `CACHE`, `DB`) and relative path rules.
5. Validate; for code touching `apps/functions`/`layers`, the real gate is an actual deployment.

## Key Rules

- One resource = one definition chunk in `infra/`; `sst.config.ts` auto-imports all `.ts` files and merges `outputs`. No centralized stack file, no `wrangler.toml`.
- Stage is a CLI flag: `bun run deploy -- --stage <name>` (the `--` separator is mandatory); never `SST_STAGE=`.
- `production` has `retain` + `protect`; do not alter without an explicit user decision.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are actual shell environment variables, never `sst.Secret`.
- Secrets must be uppercase `SCREAMING_SNAKE_CASE`, identical across `.env.example`, `infra/secret.ts`, and `Resource.<NAME>`; loaded per stage (`.env.stage`, `.env.production`); production **without** `--fallback`.
- Never open, paste, or commit `.env.stage`/`.env.production`.
- Only public frontend variables carry `NUXT_PUBLIC_`.
- Worker `handler` is a **relative path**; `link` uses resource name and prevents renaming (hence literal `BLOB`/`KV`/`CACHE`/`DB`).
- Durations are strings. `dlq.retryDelay` has an SST 4.14.0 bug: actual delay comes from `transform.consumer` in `infra/jobs.ts`.
- Durable Object `new_sqlite_classes` migration only applies when class is not yet provisioned in stage (`isDurableObjectClassProvisioned`).
- Nuxt build is orchestrated via `command.local.Command` (`infra/utils/builder.ts`) + `dependsOn`; with `hub:` enabled Nitro outputs to `dist`, otherwise `.output`.
- Worker-to-Worker communication uses `link` (service binding), never public HTTP URLs.
- `flags` (Cloudflare resources) and `layers` (Nuxt domain layers) are distinct mechanisms; optional resources live behind flags and code handles missing bindings.
- `bunfig.toml` with `linker = "hoisted"`, `unenv` split (root v2 / apps v1), and exact version patches **must not be touched** without verified intent.
- There is no automated CI/CD pipeline; automating deployments is a distinct task.

## Anti-patterns

- Using `path.resolve()` in `handler` definitions.
- Passing duration as a number; trusting SST 4.14.0 `dlq.retryDelay`.
- Renaming `BLOB`/`KV`/`CACHE` or the D1 `DB` of `apps/web`.
- Hardcoding `true`/`false` in Durable Object migrations instead of checking stage state.
- Re-submitting `new_sqlite_classes` (Cloudflare error 10074).
- Running `SST_STAGE=production bun run deploy`.
- Converting `CLOUDFLARE_API_TOKEN` into an `sst.Secret`.
- Defining secrets in camelCase, or omitting them from one of the three required locations.
- Running `sst secret load … --fallback` with `.env.production`.
- Global `unenv` overrides; switching linker to `isolated`; ignoring `patchedDependencies` after lockfile regeneration.
- Relative paths to `layers/` in code packaged by SST (`apps/functions`).
- Declaring resources while forgetting `link` (or the runtime `if (flags.x)` check).
- Adding `wrangler.toml` or running standalone `wrangler deploy`.
- Assuming passing `tsc`/`vitest`/`nuxt build` proves deployment succeeds.

## Validation

- `bunx sst diff --stage <stage>` (or test deployment) before any shared stage; never test first in `production`.
- For each new/modified `handler`: `bunx esbuild <handler> --bundle --platform=node` as minimal bundling proxy.
- Verify upon deployment: output URLs, migrations and seeds executed cleanly, Workers responding.
- Verify `.env.example` is updated alongside every new secret.
- After toggling a flag: resource appears/disappears **and** application handles missing bindings gracefully.
- `bun run test` (Vitest) and `bun run check:i18n` remain green.

## Related Skills

- `$fireskill-specialist-cloudflare-workers` — code running inside Workers.
- `$fireskill-specialist-drizzle` — migrations/seeds triggered by deploy.
- `$fireskill-specialist-nuxfire-layers` — `layers` vs `flags`.
- `$fireskill-specialist-openauth` — Auth Worker, `AuthKV`.
- `$fireskill-specialist-delivery-engineering` — release management and rollouts.
- `$fireskill-specialist-application-security` — secrets hygiene and stage boundaries.
- `$fireskill-specialist-observability` — logs and traces.
