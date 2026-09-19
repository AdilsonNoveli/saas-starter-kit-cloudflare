# Infrastructure Recipes (SST 4 in Nuxfire)

All recipes stem from existing patterns in `infra/`. Confirm the reference file before copying.

## Adding a Secret

1. Declare in `infra/secret.ts`, inside the corresponding `if (flags.<x>)`:
   `secretList.MySecret = new sst.Secret("MY_SECRET", "");`
   (name in `SCREAMING_SNAKE_CASE`; default `""` if the stage can boot without it).
2. Add the key commented out in `.env.example`.
3. Pass to Worker: in `infra/app.ts` (`vars`, prefix `NUXT_` on the key read by
   Nuxt `runtimeConfig`) or in `link: [...]` of a native Worker (`Resource.MY_SECRET.value`).
4. If the value is **public** (sent to browser), use `NUXT_PUBLIC_…`; otherwise, never.
5. Load per stage: `bunx sst secret load .env.<stage> --stage <stage>`.
6. Code reading the secret handles the empty case and **fails closed**.

## Adding a Native Worker

1. Create a new file `infra/<name>.ts` with `new sst.cloudflare.Worker("Name", {
   handler: "apps/functions/src/<file>.ts", compatibility: COMPATIBILITY,
   link: [...] })`. `handler` must be **relative**; `COMPATIBILITY` from
   `infra/utils/constants.ts`.
2. Database requirement: `link: [database]` and in handler use
   `env.AppDB.connectionString`.
3. Export `outputs` if a public URL is needed; `sst.config.ts` merges them.
4. Calling the Worker from another Worker: use `link: [worker]` (service binding),
   never `fetch` via the public URL.
5. Code behavior: consult `$fireskill-specialist-cloudflare-workers`.

## Adding a Feature-Flagged Resource

1. Add the key to both the type and value of `flags` in `config.ts`.
2. In the `infra/` file, instantiate the resource as `flags.<x> ? new … : undefined`
   and export conditional `outputs` (standard pattern in `jobs.ts`/`websockets.ts`).
3. Where linked (`infra/utils/nuxt.ts`), use `if (flags.<x>) link.push(...)`.
4. In application code, handle missing bindings (`event.context.cloudflare.env.<Name>`
   can be `undefined`).

## Adding a Queue or Cron Job

- Queue: copy `infra/jobs.ts` (queue + DLQ + `subscribe`). **Retain** the
  `transform.consumer` that enforces `retryDelay` in seconds (SST 4.14.0 workaround)
  and pass durations always as strings.
- Cron: `infra/cron.ts` (`schedules: ["0 * * * *"]`, `job.handler`, `link`).

## Adding a Durable Object

1. Worker with `transform.worker` adding the `durable_object_namespace` binding
   (via `$output(args.bindings ?? []).apply(...)`).
2. Migration `newSqliteClasses` **only** if the class does not yet exist in the stage:
   reuse `isDurableObjectClassProvisioned` (`infra/utils/durable-objects.ts`).
3. Never resend a migration for an already provisioned class (error 10074).

## Deploying

1. Export `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in shell.
2. Load stage secrets (`sst secret load`).
3. `bun run deploy -- --stage <stage>`.
4. Migrations and seeds execute automatically at the end of `App`.
5. Confirm the live deployment outcome (not merely the typecheck).

## Quick Debugging Reference

| Symptom | Probable Cause |
|---|---|
| `403 … workers.dev subdomain` (10063) | New account without `workers.dev` subdomain initialized (open Workers & Pages) |
| `duration.split is not a function` | Duration passed as number instead of string |
| Error 10074 on Durable Object | Class migration resent on already provisioned DO class |
| `Could not resolve …/layers/…/schema` | Relative path in schema barrel file |
| Worker points to non-existent build directory | Nitro output is `dist` when `hub:` is present; `deployWorker` uses `app: true` |
| Nuxt build crashes CI/CPU | `SST_BUILD_CONCURRENCY_SITE` (defaults to 1) |
| `nodemailer` patch disappeared | Resolved package version differs from key in `patchedDependencies` |
| `Invalid database credentials` (2013) | Host of one connection mode paired with user credentials of another |
