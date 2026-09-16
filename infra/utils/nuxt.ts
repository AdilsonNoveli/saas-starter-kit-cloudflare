import * as path from "node:path";
import { flags } from "#nuxfire/config";
import { emails } from "../emails";
import { websockets } from "../websockets";
import { jobsQueue } from "../jobs";
import { database } from "../database";
import { secret } from "../secret";
import { COMPATIBILITY } from "./constants";
import { build as buildPackage } from "./builder";

export async function deployWorker(
  name: string,
  {
    root,
    domain,
    app,
    vars = {},
    link: extraLink = [],
  }: {
    root: string;
    domain: string;
    app?: boolean;
    vars?: Record<string, any>;
    link?: any[];
  },
) {
  const nuxtHubSecret = new random.RandomUuid(`${name}NuxtHubSecret`);
  // @nuxthub/core unconditionally sets nitro.output.dir = "dist" whenever the
  // `hub:` module is active (verified in
  // node_modules/@nuxthub/core/dist/module.mjs:659) — it does not respect
  // Nitro's own ".output" default. `app` is exactly our own "this package has
  // `hub:` enabled" signal (see the NuxtHub-only bindings below), so it's the
  // right thing to key this off of. Without this, the Worker's handler points
  // at a build output directory the build never actually wrote to.
  const nitroOutputDirName = app ? "dist" : ".output";
  const outputDir = path.resolve(root, nitroOutputDirName);
  const environment = {
    NUXT_HUB_PROJECT_SECRET_KEY: nuxtHubSecret.result,
    ...vars,
  };

  const built = await buildPackage(name, { dir: root, environment });

  const link: any[] = [...extraLink];
  if (app) {
    // NuxtHub's self-hosted mode (apps/app/nuxt.config.ts's `hub:` block)
    // expects these bindings named exactly BLOB/KV/CACHE — that's fixed by
    // NuxtHub itself, not something `link` can rename, so the resources are
    // named to match directly instead of being prefixed per-app.
    link.push(
      database,
      new sst.cloudflare.Bucket("BLOB"),
      new sst.cloudflare.Kv("KV"),
      new sst.cloudflare.Kv("CACHE"),
      emails,
    );
    if (flags.websockets) link.push(websockets);
    if (flags.jobsQueue) link.push(jobsQueue);
  }

  const worker = new sst.cloudflare.Worker(
    // "App" alone is a reserved SST component name; the suffix keeps the
    // other resources here ({name}NuxtHubSecret, read by scripts/dev.ts as
    // Resource.AppNuxtHubSecret) on their original names.
    `${name}Worker`,
    {
      // relative — see infra/emails.ts for why (assets.directory below is
      // fine absolute, SST explicitly supports both there)
      handler: `${root}/${nitroOutputDirName}/server/index.mjs`,
      domain,
      compatibility: COMPATIBILITY,
      assets: {
        directory: path.resolve(outputDir, "public"),
      },
      link,
      environment,
    },
    { dependsOn: [built] },
  );

  if (app) {
    // Postgres migrations run directly against the database (via
    // drizzle-kit), not through a Workers binding — reads the same
    // Database* secrets Hyperdrive uses (infra/database.ts).
    const databaseEnvironment = {
      DATABASE_HOST: secret.DatabaseHost.value,
      DATABASE_PORT: secret.DatabasePort.value,
      DATABASE_USER: secret.DatabaseUser.value,
      DATABASE_PASSWORD: secret.DatabasePassword.value,
      DATABASE_NAME: secret.DatabaseName.value,
    };
    const migrations = new command.local.Command(
      `${name}Migrations`,
      {
        dir: path.resolve("apps/functions"),
        create: "bunx drizzle-kit migrate",
        triggers: [new Date().toString()],
        environment: databaseEnvironment,
      },
      { dependsOn: [worker] },
    );
    // Guarantees the built-in team roles (Owner/Admin/Member) and the free
    // Plan exist after every deploy, fresh installs included — not just
    // reactively, the first time some request happens to need one (the
    // fallback in server/utils/roles.ts and server/utils/plans.ts, kept as
    // a safety net for a database reset independently of a deploy). Runs
    // directly against Postgres the same way migrations do, right after
    // them so the tables it writes to already exist. Idempotent: see
    // apps/functions/src/database/seed/index.ts.
    new command.local.Command(
      `${name}Seed`,
      {
        dir: path.resolve("apps/functions"),
        create: "bun run src/database/seed/index.ts",
        triggers: [new Date().toString()],
        environment: databaseEnvironment,
      },
      { dependsOn: [migrations] },
    );
  }

  return worker;
}
