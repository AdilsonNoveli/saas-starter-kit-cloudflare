import * as path from "node:path";
// Type-only: SST does not export its `Input`/`Link` types as globals. Erased at build time.
import type { Input } from "../../.sst/platform/src/components/input";
import { Semaphore } from "./semaphore";

const limiter = new Semaphore(
  parseInt(process.env.SST_BUILD_CONCURRENCY_SITE || "1"),
);

// Nuxt/Nitro builds aren't wrapped by any native SST component (there's no
// Nuxt framework component like Astro/React Router have) — this just runs
// `bun run build` for a package, capped at SST_BUILD_CONCURRENCY_SITE
// concurrent builds so CI with limited CPU doesn't choke. The resulting
// command.local.Command is what a native sst.cloudflare.Worker's `handler`/
// `assets.directory` then depend on (via `dependsOn`) — the actual
// deployment itself stays 100% sst.cloudflare.Worker, this only produces
// the files it deploys.
export async function build(
  name: string,
  {
    dir,
    environment,
  }: { dir: string; environment?: Record<string, Input<string> | undefined> },
): Promise<command.local.Command> {
  return new Promise((res) => {
    $resolve({ environment }).apply(async ({ environment }) => {
      await limiter.acquire();
      // An unset variable (e.g. a flag-gated secret) is simply not passed to the build.
      const defined = Object.fromEntries(
        Object.entries(environment ?? {}).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      );
      const cmd = new command.local.Command(`${name}Build`, {
        dir: path.resolve(dir),
        create: "bun run build",
        update: "bun run build",
        triggers: [new Date().toString()],
        environment: defined,
      });
      cmd.urn.apply(() => {
        limiter.release();
        res(cmd);
      });
    });
  });
}
