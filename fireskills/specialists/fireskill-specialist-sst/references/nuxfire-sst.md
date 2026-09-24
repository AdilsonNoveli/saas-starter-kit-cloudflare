# SST in Nuxfire — What Actually Exists in the Codebase

Each statement includes concrete file evidence. The codebase supersedes this document.

## 1. Architecture Model

- **SST 4.14.0** (root `package.json`), `home: "cloudflare"`, providers
  `cloudflare 6.20.0`, `command 1.0.1`, `random 4.17.0` (`sst.config.ts`).
- `sst.config.ts` imports **every `.ts` in `infra/`** and merges the `outputs` export
  of each; no monolithic central stack file exists. A new resource = a new file (or snippet) in `infra/`.
- `#nuxfire/config` maps to the root `config.ts`.
- No `wrangler.toml` or `wrangler.jsonc` exist: everything provisions via `sst.cloudflare.*`.
- **No CI/CD exists** (`.github/workflows/` does not exist). The sole deployment path
  is manual `bun run deploy`. Adding automated CI pipelines is new work, not a fix.
- `.sst/` and `sst-env.d.ts` are generated; `Resource.<Name>` only provides types after
  `sst dev`/`deploy` runs.

## 2. Infrastructure Inventory (`infra/`)

| File | Provisions |
|---|---|
| `dns.ts` | Stage domains and `sst.Linkable` URLs (`AuthUrl`, `WebUrl`, `AppUrl`, `WebsocketsUrl`) |
| `secret.ts` | All `sst.Secret` definitions (governed by feature flags) |
| `database.ts` | `sst.cloudflare.Hyperdrive("AppDB")` |
| `auth.ts` | `Kv("AuthKV")`, `Auth` Worker, `adminSecret`, static bundle of `apps/login` |
| `emails.ts` | `Emails` Worker |
| `websockets.ts` | `Websockets` Worker + Durable Object (`flags.websockets`) |
| `jobs.ts` | `Queue("JobQueue")` + `Queue("JobDLQ")` and consumers (`flags.jobsQueue`) |
| `cron.ts` | `Cron("Cron")`, scheduled hourly at `0 * * * *` |
| `app.ts` | `deployWorker("App", …)` (vars, secrets, links) |
| `web.ts` | `D1("DB")` + `deployWorker("Web", …)` |
| `utils/nuxt.ts` | `deployWorker`: build execution + native Worker + migrations + seeds |
| `utils/builder.ts` | `command.local.Command` running `bun run build`, throttled by `SST_BUILD_CONCURRENCY_SITE` (default 1) |
| `utils/constants.ts` | `COMPATIBILITY` (`date "2025-09-01"`, `nodejs_compat`) |
| `utils/durable-objects.ts` | Queries Cloudflare API: does the DO class exist in this stage? |
| `utils/semaphore.ts` | Builder concurrency semaphore |

## 3. Stages and DNS

- Stage is specified via **CLI flag**, never an environment variable:
  `bun run deploy -- --stage production` (the `--` argument separator is mandatory).
  **Not** `SST_STAGE=production`.
- Dev stages default to the system username; domain is `<stage>.dev.<BRAND_DOMAIN>`
  (`infra/dns.ts`: `production` → `BRAND_DOMAIN`); subdomains `app.`, `auth.`, `websockets.`.
- **Branding is `BRAND_NAME` / `BRAND_DOMAIN` / `BRAND_EMAIL` (full address) in the stage's env file**
  (`.env.production` for `production`, `.env.stage` otherwise; a real env var overrides the file) — the single
  source of truth, with **no** counterpart in `config.ts` and no defaults. `scripts/branding.ts` is the only
  loader/validator (used by `infra/branding.ts`, the doctor, tests in `scripts/branding.test.ts`); it throws
  `BrandingError` naming the variable. It is deploy-time only: Workers can't read files, so infra hands the
  values over as plain `environment` (`infra/emails.ts` → the Emails Worker, which owns the sender:
  `sendEmail(to, template, props)` has no `from`). Never hardcode a domain/sender/brand name, and never add a
  `Resource` for it (`sst-env.d.ts` is generated).
- **`www` redirect (production only)**: `infra/dns.ts` exports `webRedirects` (`["www.<domain>"]` on
  `production`, `[]` elsewhere), passed by `infra/web.ts` to `deployWorker`'s `redirects`, which forwards
  `domain: { name, redirects }` to `sst.cloudflare.Worker`. SST then creates a proxied `AAAA 100::` record and a
  301 Page Rule (`https://<apex>/$1`) per hostname (`.sst/platform/src/components/cloudflare/worker.ts`,
  `createRedirects`). Consequences: the token needs zone-scoped `DNS: Edit` + `Page Rules: Edit` on top of
  `Workers Routes: Edit`, and the hostname must have **no** pre-existing record. A Workers Custom Domain (the
  apex itself) likewise fails with Cloudflare error `100117` if the hostname already has an A/AAAA/CNAME.
- `production`: `removal: "retain"` and `protect: true`; other stages: `remove`,
  unprotected (`sst.config.ts`).
- New Cloudflare accounts require the `workers.dev` subdomain initialized once
  (navigate to **Workers & Pages** in dashboard) — otherwise deployments fail mid-run
  with `403 … workers.dev subdomain` (error code 10063). This is not an API token error.

## 4. Secrets and Variables

- Secret names use **`SCREAMING_SNAKE_CASE`**, matching identically in three locations:
  `.env.example`, `infra/secret.ts` (`new sst.Secret("DATABASE_HOST", "")`), and
  `Resource.DATABASE_HOST` in application code. JS keys (`secretList.DatabaseHost`)
  are internal syntax ergonomics; string literals govern runtime. Do not introduce camelCase secrets.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are **shell environment variables**,
  never `sst.Secret`: SST requires them before decrypting vaults. Required for all `sst`
  commands (`secret load`, `secret set`, `deploy`, `dev`).
- Secrets load **per stage**, from stage-named files:
  `bunx sst secret load .env.stage --fallback` (dev) or
  `bunx sst secret load .env.production --stage production` (production, **without**
  `--fallback`, which would leak production secrets as defaults across other stages).
  Never share a generic `.env` or `.env.local`.
- `.env.example` is the canonical schema template. **Never commit, paste, or track**
  `.env.stage` / `.env.production`: they contain production credentials.
- Sensitive secrets enter Workers via `vars` (`infra/app.ts`); only public variables
  use the `NUXT_PUBLIC_` prefix.
- Operator-managed secrets (`PLATFORM_MFA_SESSION_SECRET`, `PLATFORM_ADMIN_ENCRYPTION_KEY`,
  `USER_MFA_*`) default to `""`: stages provision successfully, and corresponding endpoints
  **fail closed** until secrets are loaded. Encryption keys protect stored TOTP data;
  losing them forces user MFA re-enrollment.

## 5. Flags (`config.ts`)

`flags` provisions **Cloudflare infrastructure resources** (`infra/*.ts`); `layers` governs
which **Nuxt layers** compose into the app. They are separate mechanisms by design.
Integration flags: `stripe`, `paddle`, `githubAuth`, `googleAuth`, `resend`, `smtp`,
`ses`, `sparkPost`, `mailgun`, `websockets`, `cron`, `jobsQueue`. Currently
`stripe`, `paddle`, `githubAuth`, `googleAuth`, `resend`, `websockets`, and `jobsQueue`
are `true`. `websockets` and `jobsQueue` require Workers Paid plans.
(Note: `flags.cron` exists only in TypeScript definitions — `infra/cron.ts` does not inspect
it; the Cron worker is always provisioned.)
Authentication providers only activate if credentials exist: the `Auth` Worker and
`apps/login` build evaluate the identical condition (`!!id && !!secret`).

## 6. Infrastructure Gotchas Learned from Previous Incidents

1. **Worker `handler` is a relative path, never `path.resolve()`** — absolute paths
   corrupt artifact staging on Windows. (`assets.directory` accepts absolute paths.)
2. **`link` uses the exact resource name**: you cannot link `AppDB` and reference it
   as `DB`. NuxtHub demands literal `BLOB`/`KV`/`CACHE` — hence resources are created
   with those exact names in `infra/utils/nuxt.ts`. The D1 database for `apps/web`
   must also be named `DB`.
3. **Durations are strings** (`"120 seconds"`), never raw numbers (error
   `duration.split is not a function`).
4. **SST 4.14.0 bug**: `dlq.retryDelay` converts to milliseconds instead of seconds;
   above ~86s Cloudflare rejects the value. Workaround in `infra/jobs.ts`:
   override `args.settings.retryDelay` (seconds count) in `transform.consumer`.
   Do not revert without verifying upstream fixes.
5. **Durable Object `new_sqlite_classes` is a one-time irreversible migration**
   (error 10074 upon resending). `infra/websockets.ts` queries Cloudflare's API
   to determine if the class already exists before including migrations. Absent
   `CLOUDFLARE_API_TOKEN`, it assumes "already provisioned".
6. **No Nuxt native component exists in SST.** Builds execute via
   `command.local.Command` (`infra/utils/builder.ts`), and `sst.cloudflare.Worker`
   awaits build completion using `dependsOn`. This is the designated architecture
   passing Nitro outputs to native Workers, not a temporary workaround.
7. **`@nuxthub/core` forces Nitro output directory to `dist`** (not `.output`)
   when `hub: {…}` is active. `deployWorker` determines output path using the same
   `app: boolean` flag that binds `BLOB`/`KV`/`CACHE`.
8. **Queue consumers and DOs lack top-level Pulumi props**: consumers bind via
   `queue.subscribe(...)`; DOs attach exclusively via `transform.worker`, where
   `args.bindings` is a Pulumi `Output` (`$output(args.bindings ?? []).apply(...)`).
9. **`emails.ts`**: `nodemailer` functions on Workers only with an explicit patch
   (`patches/nodemailer@<version>.patch`, `patchedDependencies`). If `bun install`
   resolves a new version, update patch keys accordingly (Bun matches exact versions
   and silently skips unkeyed patches).
10. **Deployments run migrations and seeds** for the `App` (`infra/utils/nuxt.ts`):
    `bunx drizzle-kit migrate` and `bun run src/database/seed/index.ts` run directly
    against Postgres using `Database*` secrets. The workstation executing deployments
    must have network reachability to the database host (IPv6/IPv4).
11. **Nothing locally executed substitutes for `sst deploy`** when `apps/functions`
    imports from `layers/` (see `$fireskill-specialist-drizzle`): require a live deployment
    or `bunx esbuild <handler> --bundle --platform=node` for each `handler:` in `infra/*.ts`.

## 7. Bun and Workspaces (Impact on Deployments)

- `bunfig.toml` pins `linker = "hoisted"`: the `isolated` linker breaks SST's
  embedded esbuild on Windows (`ERROR_INVALID_FUNCTION`). Do not revert.
- `unenv` versions are split intentionally: repository root requires v2 (SST bundler);
  Nuxt application packages (`app`/`web`/`login`) require v1 (Nitro). **Never**
  introduce a global `overrides` for `unenv`.
- Every package imported directly by application code must be declared as an explicit
  dependency in that package's `package.json`, never inherited transitively (e.g., `@nuxt/ui`).
- Patches in `patches/` are pinned to **exact versions** (currently: `nodemailer@9.1.1`
  and `@openauthjs/openauth@0.3.9`); re-verify `patchedDependencies` after regenerating `bun.lock`.
- Workspaces: `apps/*`, `packages/*`, `layers/*`.
- Root CLI scripts: `bun run deploy` (`scripts/deploy.ts`: runs the preflight `scripts/doctor.ts`,
  then `sst deploy`, forwarding the same args, e.g. `--stage`; `bun run doctor [-- --stage <s>]` runs it alone —
  blocks on missing workspace links, missing Cloudflare env vars, invalid token, empty `DATABASE_*` in
  `.env.stage`/`.env.production`, missing/malformed `BRAND_*` (same validation as the deploy); unprovable items such as the zone
  not being listed are warnings only), `bun run app` (`sst shell -- bun scripts/dev.ts app`),
  `bun run web`, `-remote` variants, `bun run test`, `bun run check:i18n`, `bun run format`.

## 8. What Does NOT Exist

- CI/CD, GitHub Actions, non-SST `wrangler` deployments.
- Monolithic stack file, SST Nuxt component, application `wrangler.toml`.
- Code-declared observability blocks in Workers (see `$fireskill-specialist-cloudflare-workers`, §6).
