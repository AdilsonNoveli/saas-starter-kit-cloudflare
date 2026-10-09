// Pure logic of `bun run db:reset` (scripts/reset-database.ts). Nothing here touches a database,
// a KV namespace or a terminal: those side effects come in as parameters, so every guard below is
// tested without any of them (scripts/reset-database.test.ts).
//
// The database change policy (.fireskills/RULES.md) says a schema adjustment edits the init of the
// owning history and the database is brought up again from zero, until the application launches.
// This is the sanctioned way to do the "from zero" part. It is deliberately NOT part of
// `bun run deploy`, and only the person responsible for the project runs it — never an agent.

export type Target = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};
export type ResetArgs = {
  stage: string | undefined;
  dryRun: boolean;
  confirmProduction: boolean;
};
export type ResetPlan = {
  stage: string;
  dryRun: boolean;
  target: Target;
  schemas: readonly string[];
  statements: readonly string[];
};
export type ResetResult = { executed: boolean; nextStep: string };

/** Schemas the reset removes: the application's and Drizzle's migration bookkeeping. */
export const SCHEMAS = ["public", "drizzle"] as const;

/**
 * OpenAuth stores its records in AuthKV under keys joined by U+001F (`["users", email]`).
 * Sessions (`oauth:refresh`) go too, or they would outlive the users they point to;
 * the issuer's `signing:` and `encryption:` keys are left alone.
 */
export const AUTH_KV_USER_PREFIXES = ["email\u001f", "users\u001f", "oauth:refresh\u001f"] as const;

export const USAGE =
  "Usage: bun run db:reset -- --stage <stage> [--dry-run] [--confirm-production]";

/**
 * The AuthKV namespaces that belong to this app and stage. SST names them `<app>-<stage>-authkvnamespace-<id>`,
 * so matching on the app as well keeps a namespace left by an earlier name of the project (the same stage
 * under `nuxfire-`) from making the match ambiguous.
 */
export function authKvMatches<T extends { title: string }>(namespaces: readonly T[], app: string, stage: string): T[] {
  const prefix = `${app}-${stage}-authkv`.toLowerCase();
  return namespaces.filter((entry) => entry.title.toLowerCase().startsWith(prefix));
}

export class ResetRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResetRefusal";
  }
}

export function parseArgs(argv: readonly string[]): ResetArgs {
  const args: ResetArgs = {
    stage: undefined,
    dryRun: false,
    confirmProduction: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--stage") {
      args.stage = argv[index + 1];
      index += 1;
    } else if (flag === "--dry-run") {
      args.dryRun = true;
    } else if (flag === "--confirm-production") {
      args.confirmProduction = true;
    } else {
      throw new ResetRefusal(`Unknown argument ${flag}. ${USAGE}`);
    }
  }
  return args;
}

/** The stage is mandatory and is never guessed: a reset must always name what it will erase. */
export function requireStage(args: ResetArgs): string {
  const stage = args.stage?.trim();
  if (!stage || stage.startsWith("--"))
    throw new ResetRefusal(`A stage is required. ${USAGE}`);
  return stage;
}

export function planReset(args: ResetArgs, target: Target): ResetPlan {
  const stage = requireStage(args);
  if (stage === "production" && !args.confirmProduction) {
    throw new ResetRefusal(
      "Refusing to reset the production stage without --confirm-production.",
    );
  }
  const statements = [
    ...SCHEMAS.map((schema) => `DROP SCHEMA IF EXISTS "${schema}" CASCADE`),
    'CREATE SCHEMA "public"',
  ];
  return { stage, dryRun: args.dryRun, target, schemas: SCHEMAS, statements };
}

/** What will be erased and where. Never includes the password. */
export function describeTarget(plan: ResetPlan): string {
  const { host, port, database, user } = plan.target;
  return [
    `Stage:     ${plan.stage}`,
    `Host:      ${host}:${port}`,
    `Database:  ${database}`,
    `User:      ${user}`,
    `Removes:   schemas ${plan.schemas.map((schema) => `"${schema}"`).join(" and ")} (every table, migration record and seed row)`,
    "AuthKV:    the user keys (email/*, users/*) are purged first",
    plan.dryRun
      ? "Mode:      dry run — nothing will be touched"
      : "Mode:      REAL — this cannot be undone",
  ].join("\n");
}

export async function runReset(input: {
  plan: ResetPlan;
  /** What the person typed when asked for the database name. */
  confirmation: string | undefined;
  purgeKv: () => Promise<void>;
  executeSql: (statement: string) => Promise<void>;
}): Promise<ResetResult> {
  const { plan, confirmation, purgeKv, executeSql } = input;
  const nextStep = `bun run deploy -- --stage ${plan.stage}`;
  if (plan.dryRun) return { executed: false, nextStep };

  if (confirmation !== plan.target.database) {
    throw new ResetRefusal(
      "Confirmation does not match the database name; nothing was touched.",
    );
  }
  // The KV purge comes first on purpose: if it fails the database is still intact, and re-running
  // the reset is safe. The other order would leave users in the database with no credentials.
  await purgeKv();
  for (const statement of plan.statements) await executeSql(statement);
  return { executed: true, nextStep };
}
