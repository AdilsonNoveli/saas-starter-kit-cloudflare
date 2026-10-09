// Copy gate: `bun run check:copy [--root <dir>] [--config <file>] [--ledger <file>] [--baseline <file>] [--print-baseline]`.
//
// Every text a human reads in the products is governed by `fireskill-specialist-copywriting`.
// This gate makes three parts of that mechanical (SPEC-0002 FR-009, FR-010):
//   1. claims: a number or an absolute in a marketing text has a ledger entry that a machine can
//      verify (.fireskills/CLAIMS.yml);
//   2. proof: urgency needs a dated offer, a testimonial needs a person who exists, used the
//      product and consented, and a photo is not shared between people;
//   3. governed paths: no literal text in a `.vue` template outside the locale files.
//
// Known defects are listed in scripts/copy-baseline.json as dated allowances that name the spec
// that removes them (allowances.ts); the list can only shrink and there is no inline ignore.
// Exit code 0 when clean, 1 on any violation.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { applyAllowances, missingOwners, type Allowance } from "./allowances";
import {
  auditClaims,
  auditLiterals,
  auditTestimonials,
  auditUrgency,
  auditVoiceFiles,
  flattenLocale,
  validateLedger,
  type CopyConfig,
  type Ledger,
  type VerifyIO,
} from "./copy-rules";
import type { Violation } from "./seo-rules";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const scriptsRoot = join(import.meta.dir, "..");
const root = option("root") ?? scriptsRoot;
const configFile = option("config") ?? join(scriptsRoot, "scripts/copy-config.json");
const ledgerFile = option("ledger") ?? join(root, ".fireskills/CLAIMS.yml");
const baselineFile = option("baseline") ?? join(scriptsRoot, "scripts/copy-baseline.json");

interface Config extends CopyConfig {
  /** Locale code to the JSON file, relative to the root. */
  locales: Record<string, string>;
  /** Folders (relative to the root) scanned for `.vue` templates. */
  vueRoots: string[];
  /** Regular expression: which of those files are marketing components (all when absent). */
  marketingFilePattern?: string;
  /** Who removes a grandfathered defect, first pattern that matches the `where`. */
  owners?: { pattern: string; removedBy: string }[];
  now?: string;
}

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

function readJson<T>(file: string, what: string): T {
  if (!existsSync(file)) return fail(`no ${what} at ${file}`);
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (error) {
    return fail(`the ${what} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const config = readJson<Config>(configFile, "configuration");
const baseline = existsSync(baselineFile) ? readJson<{ schema: number; allow: Allowance[] }>(baselineFile, "baseline") : { schema: 1, allow: [] };
const now = config.now ?? new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------

const SKIP = new Set(["node_modules", ".git", ".nuxt", ".output", ".data", ".sst", "dist"]);
function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const rel = (path: string): string => relative(root, path).replaceAll("\\", "/");

let repoFiles: string[] | undefined;
const io: VerifyIO = {
  files: (glob) => {
    repoFiles ??= walk(root).map(rel);
    const pattern = new RegExp(
      "^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(?:.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$",
    );
    return repoFiles.filter((file) => pattern.test(file));
  },
  read: (file) => readFileSync(join(root, file), "utf8"),
  exists: (file) => existsSync(join(root, file)) && statSync(join(root, file)).isFile(),
};

const vueFiles: Record<string, string> = {};
for (const dir of config.vueRoots) {
  for (const file of walk(join(root, dir)).filter((path) => path.endsWith(".vue"))) vueFiles[rel(file)] = readFileSync(file, "utf8");
}
const marketing = config.marketingFilePattern ? new RegExp(config.marketingFilePattern) : undefined;
const marketingFiles = Object.fromEntries(Object.entries(vueFiles).filter(([file]) => !marketing || marketing.test(file)));

const strings: Record<string, Record<string, string>> = {};
for (const [locale, file] of Object.entries(config.locales)) {
  strings[locale] = flattenLocale(readJson<unknown>(join(root, file), `locale file ${file}`));
}

// ---------------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------------

const violations: Violation[] = [];
let ledger: Ledger | undefined;
try {
  const parsed = existsSync(ledgerFile) ? (Bun.YAML.parse(readFileSync(ledgerFile, "utf8")) as unknown) : null;
  const problems = existsSync(ledgerFile) ? validateLedger(parsed) : [{ rule: "ledger-invalid", where: ledgerFile, message: "the claim ledger does not exist" }];
  violations.push(...problems);
  if (problems.length === 0) ledger = parsed as Ledger;
} catch (error) {
  violations.push({ rule: "ledger-invalid", where: rel(ledgerFile), message: `the ledger is not valid YAML: ${error instanceof Error ? error.message : String(error)}` });
}

// Serelius voice (SPEC-0008): the locale files and template literals of apps/app, apps/login and the layers.
const voiceFiles: Record<string, string> = { ...vueFiles };
for (const dir of config.vueRoots) {
  for (const file of walk(join(root, dir)).filter((path) => path.replaceAll("\\", "/").includes("/i18n/locales/") && path.endsWith(".json"))) voiceFiles[rel(file)] = readFileSync(file, "utf8");
}
violations.push(...auditLiterals(vueFiles, config.literalAttributes), ...auditVoiceFiles(voiceFiles));
if (ledger) {
  violations.push(
    ...auditClaims({ strings, ledger, config, io, now }),
    ...auditUrgency({ strings, ledger, config, files: marketingFiles, now }),
    ...auditTestimonials({ strings, ledger, config, files: marketingFiles }),
  );
}

// ---------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------

const GRANDFATHERABLE = new Set(["literal-text", "claim-unproven", "urgency-unproven", "testimonial-unverified", "testimonial-shared-image", "testimonial-unregistered-image"]);

if (process.argv.includes("--print-baseline")) {
  const owner = (where: string): string => config.owners?.find((entry) => new RegExp(entry.pattern).test(where))?.removedBy ?? "BACKLOG-app-ui-copy";
  const entries: Allowance[] = violations
    .filter((violation) => GRANDFATHERABLE.has(violation.rule))
    .map((violation) => ({
      rule: violation.rule,
      where: violation.where,
      ...(violation.subject !== undefined ? { match: violation.subject } : {}),
      removedBy: owner(violation.where),
      since: now,
    }));
  console.log(JSON.stringify({ schema: 1, allow: entries }, null, 2));
  process.exit(0);
}

const { remaining, problems } = applyAllowances(violations, baseline.allow);
const all = [...remaining, ...problems, ...missingOwners(baseline.allow, scriptsRoot)];
console.log(`${Object.keys(vueFiles).length} template(s), ${Object.keys(strings).length} locale file(s), ${ledger?.claims.length ?? 0} claim(s) audited`);
if (all.length > 0) {
  for (const violation of all) console.error(`✗ [${violation.rule}] ${violation.where}\n    ${violation.message}`);
  console.error(`\n${all.length} violation(s) of ${new Set(all.map((v) => v.rule)).size} rule(s).`);
  process.exit(1);
}
console.log("✓ check:copy passed");
