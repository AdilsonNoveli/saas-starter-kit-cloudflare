import * as path from "node:path";
import { existsSync } from "node:fs";
// Type-only: SST does not export its `Input`/`Link` types as globals. Erased at build time.
import type { Input } from "../../.sst/platform/src/components/input";
import type { Link } from "../../.sst/platform/src/components/link";
import { emails } from "../emails";
import { websockets } from "../websockets";
import { jobsQueue } from "../jobs";
import { database } from "../database";
import { secret } from "../secret";
import { layers } from "#nuxfire/config";
import { COMPATIBILITY } from "./constants";
import { build as buildPackage } from "./builder";

export async function deployWorker(
  name: string,
  {
    root,
    domain,
    aliases = [],
    htmlHandling,
    app,
    vars = {},
    link: extraLink = [],
  }: {
    root: string;
    domain: string;
    /**
     * Extra hostnames served by the same Worker, each as its own Workers
     * Custom Domain (same resource and token permission as `domain`). The
     * hostname must have no existing A/AAAA/CNAME record. Visitors stay on the
     * alias, so the app must emit absolute canonical URLs for `domain`.
     */
    aliases?: string[];
    /**
     * How Workers Static Assets treats the trailing slash of HTML pages. The
     * default (`auto-trailing-slash`) serves a prerendered `foo/index.html` at
     * `/foo/` and answers `/foo` with a 307, which contradicts a canonical URL
     * without the slash: a search engine is told, temporarily, to go to a URL
     * whose canonical points back. See SPEC-0002 research/redirect-spike.md.
     */
    htmlHandling?: "auto-trailing-slash" | "force-trailing-slash" | "drop-trailing-slash" | "none";
    app?: boolean;
    vars?: Record<string, Input<string> | undefined>;
    link?: Link.Linkable[];
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

  const link: Link.Linkable[] = [...extraLink];
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
    // Guarded by the resource itself: it only exists when its flag is on.
    if (websockets) link.push(websockets);
    if (jobsQueue) link.push(jobsQueue);
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
      domain: { name: domain, aliases },
      compatibility: COMPATIBILITY,
      assets: {
        directory: path.resolve(outputDir, "public"),
        ...(htmlHandling ? { htmlHandling } : {}),
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
    // `run-migrations.mjs`, never `bunx drizzle-kit migrate`: verified (a real
    // deploy failure, reproduced twice) that drizzle-kit's CLI spinner
    // reliably crashes with a bare "exit status 1" and no further output when
    // spawned without a TTY — exactly how command.local.Command runs it.
    // `run-migrations.mjs` calls drizzle-orm's own `migrate()` directly (the
    // same engine drizzle-kit's CLI wraps), with no interactive UI to crash,
    // and prints the real Postgres error (schema/table/constraint/hint) on
    // failure. `drizzle-kit generate` (author-time, always run interactively
    // by a human) is unaffected and stays the tool for producing new
    // migration files. See scripts/run-migrations.mjs and MIGRATIONS.md.
    // Relative to `dir`, unquoted — both "apps/functions" and "layers/<name>"
    // sit exactly two segments below the repo root, so "../../scripts/..."
    // resolves correctly from either. NOT an absolute, quoted path: verified
    // (reproduced the exact real-deploy failure locally, twice, via `cmd /c`)
    // that Pulumi's command.local.Command wraps `create` in its own `cmd /c
    // "..."` on Windows, and a quoted path nested inside that outer quoting
    // breaks cmd.exe's argument parsing (`error: File not found
    // ""C:\...\run-migrations.mjs""`, doubled quotes, exactly what a nested
    // `cmd /c "cmd /c "..."..."` mis-parse produces) — even though the same
    // quoted absolute path runs correctly under a single, unwrapped `cmd /c`.
    // The path has no spaces, so no quoting is needed in the first place.
    const runMigrationsScript = "../../scripts/run-migrations.mjs";
    const baseMigrations = new command.local.Command(
      `${name}Migrations`,
      {
        dir: path.resolve("apps/functions"),
        create: `bun run ${runMigrationsScript} ./src/database/migrations __drizzle_migrations drizzle`,
        triggers: [new Date().toString()],
        environment: databaseEnvironment,
      },
      { dependsOn: [worker] },
    );

    // SPEC-0006 (+ its admin/notifications follow-up): any layer — core or
    // feature — that owns a `layers/<name>/drizzle.config.ts` applies its
    // migrations from its own independent history, chained after whatever
    // ran before it. A layer's tables can FK into base tables (never the
    // reverse — a base layer must never import a feature layer, enforced by
    // scripts/layer-dependency-direction.test.ts), so the base migration
    // above always runs first. This one helper, and the `existsSync` check
    // inside it, is the entire mechanism: adding a new layer with its own
    // migration history — core or feature — needs zero edits here.
    let lastMigrations: typeof baseMigrations = baseMigrations;
    const applyLayerMigrations = (layerName: string) => {
      const layerRoot = path.resolve(`layers/${layerName}`);
      if (!existsSync(path.resolve(layerRoot, "migrations"))) return;
      const migrationsTable = `__drizzle_migrations_${layerName}`;
      lastMigrations = new command.local.Command(
        `${name}Migrations${layerName[0].toUpperCase()}${layerName.slice(1)}`,
        {
          dir: layerRoot,
          create: `bun run ${runMigrationsScript} ./migrations ${migrationsTable} drizzle`,
          triggers: [new Date().toString()],
          environment: databaseEnvironment,
        },
        { dependsOn: [lastMigrations] },
      );
    };

    // Core layers with their own history (today: admin, notifications,
    // teams) run unconditionally, right after the base — `layers.core` has
    // no on/off flag, unlike `layers.features` below. See
    // apps/functions/drizzle.config.ts for how a core layer opts into its
    // own history (owning a `drizzle.config.ts`) versus folding into base.
    for (const layerName of layers.core) applyLayerMigrations(layerName);

    // Feature layers with their own history (kanban, billing) run only when
    // active — declaration order, since no feature layer today depends on
    // another (see SPEC-0006 research); a future one that does would need
    // its manifest's `requires` reflected here too. A feature that is OFF
    // is skipped entirely: its tables never reach this database, not even
    // as an empty table — that is the whole point.
    for (const [featureName, enabled] of Object.entries(layers.features)) {
      if (enabled) applyLayerMigrations(featureName);
    }

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
      { dependsOn: [lastMigrations] },
    );
  }

  return worker;
}
