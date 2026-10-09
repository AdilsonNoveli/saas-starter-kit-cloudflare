// `bun run db:reset -- --stage <stage> [--dry-run] [--confirm-production]`
//
// Brings a stage's database back to zero so the whole app can be redeployed fresh after an init
// migration was edited (database change policy, .fireskills/RULES.md — in force until launch).
// It is NOT part of `bun run deploy`: run it, then `bun run deploy -- --stage <stage>`.
//
// Only the person responsible for the project runs this. Agents never do. The guards and the order
// of operations live in ./reset-database-core.ts (unit-tested without a database); this file only
// wires them to the stage's env file, the Cloudflare KV API and Postgres.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import postgres from "postgres";
import { envFileName, parseEnvFile } from "./branding";
import {
  AUTH_KV_USER_PREFIXES,
  ResetRefusal,
  authKvMatches,
  describeTarget,
  parseArgs,
  planReset,
  requireStage,
  runReset,
  type Target,
} from "./reset-database-core";

const root = join(import.meta.dir, "..");
const REQUIRED = [
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
] as const;
type Settings = Record<(typeof REQUIRED)[number], string>;

/** The stage's env file, with real environment variables taking precedence (same rule as branding). */
function readSettings(stage: string): Settings {
  const file = join(root, envFileName(stage));
  if (!existsSync(file)) {
    throw new ResetRefusal(
      `${envFileName(stage)} does not exist; it holds the DATABASE_* and Cloudflare values of this stage.`,
    );
  }
  const values = parseEnvFile(readFileSync(file, "utf8"));
  const missing = REQUIRED.filter(
    (key) => !(process.env[key] ?? values.get(key)),
  );
  if (missing.length)
    throw new ResetRefusal(
      `${envFileName(stage)} is missing: ${missing.join(", ")}.`,
    );
  return Object.fromEntries(
    REQUIRED.map((key) => [key, process.env[key] ?? values.get(key) ?? ""]),
  ) as Settings;
}

function targetOf(settings: Settings): Target {
  const port = Number(settings.DATABASE_PORT);
  if (!Number.isInteger(port) || port <= 0)
    throw new ResetRefusal("DATABASE_PORT is not a valid port number.");
  return {
    host: settings.DATABASE_HOST,
    port,
    database: settings.DATABASE_NAME,
    user: settings.DATABASE_USER,
    password: settings.DATABASE_PASSWORD,
  };
}

type KvNamespace = { id: string; title: string };
type CloudflareBody = {
  success: boolean;
  errors?: { message: string }[];
  result?: unknown;
  result_info?: { cursor?: string };
};

function isCloudflareBody(value: unknown): value is CloudflareBody {
  return typeof value === "object" && value !== null && "success" in value;
}

async function cloudflare(
  settings: Settings,
  path: string,
  init?: RequestInit,
): Promise<CloudflareBody> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${settings.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${settings.CLOUDFLARE_API_TOKEN}`,
      "content-type": "application/json",
    },
  });
  const body: unknown = await response.json();
  if (!isCloudflareBody(body) || !body.success) {
    const reason = isCloudflareBody(body)
      ? body.errors?.map((error) => error.message).join("; ")
      : `HTTP ${response.status}`;
    throw new ResetRefusal(
      `Cloudflare KV request failed (${path || "list"}): ${reason}`,
    );
  }
  return body;
}

/** The SST app name, the prefix of every resource title (`sst.config.ts`, the one place that defines it). */
function appName(): string {
  const config = readFileSync(join(root, "sst.config.ts"), "utf8");
  const found = /\bname:\s*"([^"]+)"/.exec(config);
  if (!found) throw new ResetRefusal("Could not read the app name from sst.config.ts.");
  return found[1];
}

/** AuthKV of this stage: exactly one namespace must match, otherwise nothing is touched. */
async function resolveAuthKv(
  settings: Settings,
  stage: string,
): Promise<KvNamespace> {
  const body = await cloudflare(settings, "?per_page=100");
  const namespaces = (
    Array.isArray(body.result) ? body.result : []
  ) as KvNamespace[];
  const matches = authKvMatches(namespaces, appName(), stage);
  if (matches.length !== 1) {
    const seen = namespaces
      .filter((entry) => entry.title.toLowerCase().includes("authkv"))
      .map((entry) => entry.title);
    throw new ResetRefusal(
      `Expected exactly one AuthKV namespace for stage "${stage}", found ${matches.length}. AuthKV namespaces in this account: ${seen.join(", ") || "none"}.`,
    );
  }
  return matches[0];
}

async function userKeys(
  settings: Settings,
  namespace: KvNamespace,
): Promise<string[]> {
  const names: string[] = [];
  for (const prefix of AUTH_KV_USER_PREFIXES) {
    let cursor: string | undefined;
    do {
      const query = `?prefix=${encodeURIComponent(prefix)}&limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const body = await cloudflare(settings, `/${namespace.id}/keys${query}`);
      for (const key of (Array.isArray(body.result) ? body.result : []) as {
        name: string;
      }[])
        names.push(key.name);
      cursor = body.result_info?.cursor || undefined;
    } while (cursor);
  }
  return names;
}

async function purgeAuthKv(
  settings: Settings,
  namespace: KvNamespace,
): Promise<void> {
  const names = await userKeys(settings, namespace);
  for (let index = 0; index < names.length; index += 10_000) {
    await cloudflare(settings, `/${namespace.id}/bulk/delete`, {
      method: "POST",
      body: JSON.stringify(names.slice(index, index + 10_000)),
    });
  }
  console.log(
    `AuthKV: ${names.length} user key(s) removed from "${namespace.title}".`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stage = requireStage(args);
  const settings = readSettings(stage);
  const plan = planReset(args, targetOf(settings));
  console.log(`\n${describeTarget(plan)}\n`);

  const namespace = await resolveAuthKv(settings, stage).catch(
    (error: unknown) => {
      // A dry run only reports the problem; a real run stops here, before anything is touched.
      if (plan.dryRun) {
        console.warn(
          `Warning: ${error instanceof Error ? error.message : String(error)}`,
        );
        return undefined;
      }
      throw error;
    },
  );
  if (namespace)
    console.log(
      `AuthKV namespace: "${namespace.title}" (${(await userKeys(settings, namespace)).length} user key(s))`,
    );

  let confirmation: string | undefined;
  if (!plan.dryRun) {
    const terminal = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    confirmation = (
      await terminal.question(
        `Type the database name (${plan.target.database}) to erase it: `,
      )
    ).trim();
    terminal.close();
  }

  const sql = plan.dryRun
    ? undefined
    : postgres({ ...plan.target, ssl: "require", max: 1 });
  try {
    const result = await runReset({
      plan,
      confirmation,
      purgeKv: async () => {
        if (!namespace)
          throw new ResetRefusal(
            "AuthKV namespace was not resolved; nothing was touched.",
          );
        await purgeAuthKv(settings, namespace);
      },
      executeSql: async (statement) => {
        await sql?.unsafe(statement);
        console.log(`OK: ${statement}`);
      },
    });
    console.log(
      result.executed
        ? `\nDone. Next: ${result.nextStep}`
        : `\nDry run only. When ready: bun run db:reset -- --stage ${stage}, then ${result.nextStep}`,
    );
  } finally {
    await sql?.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof ResetRefusal ? `Refused: ${error.message}` : error,
  );
  process.exit(1);
});
