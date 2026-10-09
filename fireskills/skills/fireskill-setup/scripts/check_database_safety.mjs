/**
 * Verifies test database isolation and rejects commands capable of deleting
 * structures or records before a skill executes tests or migrations.
 */

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const arguments_ = process.argv.slice(2);
const value = (flag) => {
  const index = arguments_.indexOf(flag);
  return index >= 0 ? arguments_[index + 1] : undefined;
};
const project = resolve(value("--project") ?? ".");
const command = value("--command") ?? "";
const json = arguments_.includes("--json");

const destructiveCommands = [
  /\bmigrate:(?:fresh|refresh|reset|rollback)\b/iu,
  /\bdb:wipe\b/iu,
  /\bschema:drop\b/iu,
  /\bprisma\s+migrate\s+reset\b/iu,
  /\b(?:rails|rake)\s+db:(?:drop|reset|setup)\b/iu,
  /\bmanage\.py\s+flush\b/iu,
  /\bdoctrine(?::|\s+)schema(?::|\s+)drop\b/iu,
  /\bsequelize\s+db:drop\b/iu,
  /\btypeorm\s+schema:drop\b/iu,
  /\bdrizzle-kit\s+drop\b/iu,
  /\bdrizzle-kit\s+push\b[^\n]*--force\b/iu,
  /\bdropDatabase\s*\(/u,
  /\bDROP\s+(?:DATABASE|SCHEMA|TABLE)\b/iu,
  /\bTRUNCATE(?:\s+TABLE)?\b/iu,
  /--force-reset\b/iu,
];
const destructiveMigrationSource = [
  /->drop(?:IfExists|Column|ConstrainedForeignId|Foreign|Index|Primary|Unique)?\s*\(/u,
  /Schema::drop(?:IfExists)?\s*\(/u,
  /\bDROP\s+(?:DATABASE|SCHEMA|TABLE|COLUMN)\b/iu,
  /\bTRUNCATE(?:\s+TABLE)?\b/iu,
];
const destructiveTestTraits = /\b(?:RefreshDatabase|DatabaseMigrations)\b/u;

const errors = [];
const ignored = [];

if (!existsSync(project)) {
  errors.push(`project not found: ${project}`);
} else {
  for (const pattern of destructiveCommands) {
    if (pattern.test(command)) {
      ignored.push("the specified command may delete database structures or records");
      break;
    }
  }

  await inspectCommandAlias();

  if (existsSync(join(project, "artisan"))) {
    await inspectLaravelEnvironment();
    if (isTestCommand(command)) await inspectLaravelTests();
    if (isMigrationCommand(command)) await inspectLaravelMigrations();
  }
}

const status = ignored.length ? "ignored" : errors.length ? "pending" : "safe";
const payload = {
  status,
  project,
  command_checked: Boolean(command),
  errors,
  ignored,
};

if (json) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`Database protection: ${status.toUpperCase()}`);
  for (const message of errors) console.log(`PENDING: ${message}`);
  for (const message of ignored) console.log(`IGNORED: ${message}`);
}
process.exitCode = status === "safe" ? 0 : status === "ignored" ? 3 : 1;

/** Requires explicit test database distinct from development database. */
async function inspectLaravelEnvironment() {
  const developmentPath = join(project, ".env");
  const testingPath = join(project, ".env.testing");
  if (!existsSync(testingPath)) {
    errors.push("Laravel requires .env.testing before executing tests");
    return;
  }

  const development = existsSync(developmentPath)
    ? parseEnv(await readFile(developmentPath, "utf8"))
    : new Map();
  const testing = parseEnv(await readFile(testingPath, "utf8"));

  if (testing.get("APP_ENV") !== "testing") {
    errors.push(".env.testing must declare APP_ENV=testing");
  }
  if (!testing.get("DB_DATABASE") && !testing.get("DB_URL")) {
    errors.push(
      ".env.testing must declare DB_DATABASE or DB_URL without inheriting .env",
    );
    return;
  }
  const testingTarget = databaseTarget(testing, development);
  const developmentTarget = databaseTarget(development);
  if (developmentTarget && testingTarget === developmentTarget) {
    errors.push(".env.testing points to the development database");
  }
}

/** Rejects Laravel traits that recreate migrations during startup. */
async function inspectLaravelTests() {
  const tests = join(project, "tests");
  if (!existsSync(tests)) return;
  for (const path of await regularFiles(tests)) {
    if (!path.endsWith(".php")) continue;
    const source = await readFile(path, "utf8");
    const match = destructiveTestTraits.exec(source);
    if (match) {
      ignored.push(
        `${basename(path)} uses ${match[1] ?? match[0]}, which may recreate the database`,
      );
    }
  }
}

/** Rejects migrations with schema drop or broad data deletion. */
async function inspectLaravelMigrations() {
  const migrations = join(project, "database", "migrations");
  if (!existsSync(migrations)) return;
  for (const path of await regularFiles(migrations)) {
    const source = await readFile(path, "utf8");
    const up = migrationMethod(source, "up", "down");
    if (destructiveMigrationSource.some((pattern) => pattern.test(up))) {
      ignored.push(`${basename(path)} contains a mutation that may delete data`);
    }
  }
}

/** Isolates migration up body and ignores rollback. */
function migrationMethod(source, method, nextMethod) {
  const start = source.search(new RegExp(`public\\s+function\\s+${method}\\s*\\(`, "u"));
  if (start < 0) return source;
  const tail = source.slice(start);
  const next = tail.search(
    new RegExp(`public\\s+function\\s+${nextMethod}\\s*\\(`, "u"),
  );
  return next < 0 ? tail : tail.slice(0, next);
}

/** Reads small files without following symlinks. */
async function regularFiles(root) {
  const found = [];
  const pending = [root];
  while (pending.length) {
    const directory = pending.pop();
    if (!directory) continue;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && (await stat(path)).size <= 2_000_000) found.push(path);
    }
  }
  return found.sort();
}

/** Parses key-value pairs without echoing values. */
function parseEnv(source) {
  const result = new Map();
  for (const line of source.split(/\r?\n/u)) {
    const match = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/u.exec(line);
    if (!match) continue;
    result.set(match[1], unquote(match[2]));
  }
  return result;
}

/** Computes comparable database target identity without exposing secrets. */
function databaseTarget(environment, fallback = new Map()) {
  const get = (name) => environment.get(name) ?? fallback.get(name);
  const url = get("DB_URL");
  if (url) return `url:${url}`;
  const database = get("DB_DATABASE");
  if (!database) return "";
  return [
    get("DB_CONNECTION") ?? "",
    get("DB_HOST") ?? "",
    get("DB_PORT") ?? "",
    database,
  ].join("|");
}

/** Verifies package alias content invoked by target command. */
async function inspectCommandAlias() {
  const aliases = [];
  const composerMatch = /\bcomposer\s+(?:run\s+)?([\w:-]+)/iu.exec(command);
  if (composerMatch && !["install", "update", "require"].includes(composerMatch[1])) {
    aliases.push([join(project, "composer.json"), composerMatch[1]]);
  }
  const packageMatch = /\b(?:npm|pnpm|yarn|bun)(?:\s+run)?\s+([\w:-]+)/iu.exec(command);
  if (packageMatch) aliases.push([join(project, "package.json"), packageMatch[1]]);

  for (const [manifest, name] of aliases) {
    if (!existsSync(manifest)) continue;
    try {
      const parsed = JSON.parse(await readFile(manifest, "utf8"));
      const body = parsed.scripts?.[name];
      const source = Array.isArray(body) ? body.join("\n") : body;
      if (
        typeof source === "string" &&
        destructiveCommands.some((pattern) => pattern.test(source))
      ) {
        ignored.push(`script ${name} may delete database structures or records`);
      }
    } catch {
      errors.push(`could not verify script ${name} in ${basename(manifest)}`);
    }
  }
}

function unquote(input) {
  if (
    input.length >= 2 &&
    ((input.startsWith('"') && input.endsWith('"')) ||
      (input.startsWith("'") && input.endsWith("'")))
  ) {
    return input.slice(1, -1);
  }
  return input;
}

function isTestCommand(input) {
  return /\b(?:artisan\s+test|pest|phpunit|composer\s+(?:test|ci))\b/iu.test(input);
}

function isMigrationCommand(input) {
  return /\b(?:artisan\s+migrate|migrate\s+--)/iu.test(input);
}
