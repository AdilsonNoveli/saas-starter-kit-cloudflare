// Deploy preflight: fails BEFORE `sst deploy`, with the exact fix for each problem.
// Usage: `bun run doctor [-- --stage <name>]`. `bun run deploy` runs it automatically
// (scripts/deploy.ts) and forwards the same --stage.
//
// It only blocks (exit 1) on what is certain to break the deploy. Whatever it cannot prove
// from here (the domain's zone, Cloudflare being unreachable) is printed as a `!` warning and
// does not stop the deploy. It never prints secret values.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REFERENCE_DOMAIN, SHARED_APP_NAME, sharesStarterKitAppName } from "./app-identity";
import {
  BrandingError,
  envFileName as stageEnvFile,
  loadBranding,
  parseEnvFile,
  type Branding,
} from "./branding";

const root = join(import.meta.dir, "..");
const problems: string[] = [];
const warnings: string[] = [];
const fail = (what: string, fix: string) => problems.push(`✗ ${what}\n    → ${fix}`);
const warn = (what: string, hint: string) => warnings.push(`! ${what}\n    → ${hint}`);
const ok = (what: string) => console.log(`✓ ${what}`);

// The stage comes from `--stage <name>` / `--stage=<name>` (the same flag as sst). Without
// the flag SST uses the system user name, i.e. a development stage.
const args = process.argv.slice(2);
const stageFlag = args.findIndex((a) => a === "--stage" || a.startsWith("--stage="));
const stage =
  stageFlag === -1
    ? "dev"
    : args[stageFlag].includes("=")
      ? args[stageFlag].slice("--stage=".length)
      : (args[stageFlag + 1] ?? "dev");
const isProduction = stage === "production";
// Production has its own file and NEVER uses --fallback (it would leak as the default for
// every other stage). Every other stage uses .env.stage with --fallback.
const envFileName = stageEnvFile(stage);
const loadCommand = isProduction
  ? "bunx sst secret load .env.production --stage production"
  : "bunx sst secret load .env.stage --fallback";
console.log(`Stage: ${isProduction ? "production" : `${stage} (development)`}\n`);

// 1. Workspace links (@nuxfire/*) — missing when node_modules was copied or is stale.
const missing: string[] = [];
for (const dir of ["apps", "packages", "layers"]) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const pkgPath = join(root, dir, entry.name, "package.json");
    if (!entry.isDirectory() || !existsSync(pkgPath)) continue;
    const name: string | undefined = JSON.parse(readFileSync(pkgPath, "utf8")).name;
    if (name && !existsSync(join(root, "node_modules", name))) missing.push(name);
  }
}
missing.length
  ? fail(
      `Workspaces not linked in node_modules: ${missing.join(", ")}`,
      "Run `bun install` at the repository root (never copy a node_modules folder).",
    )
  : ok("Workspaces @nuxfire/* linked");

// 2. sst.config.ts app identity — every Cloudflare resource is named
// `<name>-<stage>-...`. A redistributed copy that keeps the literal seller
// name risks exactly what infra/utils/durable-objects.ts guards against: a
// stale deploy from a different installation, left under the same name in
// the same Cloudflare account, silently matching this one's resources.
// Decided at the end (section 6 proves whether this account owns the BRAND_DOMAIN zone).
const appName = /name:\s*"([^"]+)"/.exec(readFileSync(join(root, "sst.config.ts"), "utf8"))?.[1];
let zoneVerified = false;

// 3. Cloudflare credentials in the shell (they cannot be an sst.Secret).
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
!token || !accountId
  ? fail(
      "CLOUDFLARE_API_TOKEN and/or CLOUDFLARE_ACCOUNT_ID are not set in the shell",
      'PowerShell: $env:CLOUDFLARE_API_TOKEN="..."; $env:CLOUDFLARE_ACCOUNT_ID="..."  |  bash: export CLOUDFLARE_API_TOKEN=...',
    )
  : ok("Cloudflare credentials present in the shell");

// 4. The stage's secrets file with the database filled in. With empty values the Hyperdrive
// is created with empty credentials and Cloudflare rejects the deploy with an unclear 400.
const required = ["DATABASE_HOST", "DATABASE_PORT", "DATABASE_NAME", "DATABASE_USER", "DATABASE_PASSWORD"];
const envFile = join(root, envFileName);
if (!existsSync(envFile)) {
  // Whoever loaded the secrets with `sst secret set` has no file: nothing can be proven
  // missing, so this is only a warning.
  warn(
    `${envFileName} does not exist — DATABASE_* could not be checked`,
    `Copy .env.example to ${envFileName}, fill it in and run \`${loadCommand}\`.`,
  );
} else {
  const values = parseEnvFile(readFileSync(envFile, "utf8"));
  const empty = required.filter((key) => !values.get(key));
  empty.length
    ? fail(`${envFileName} has empty values: ${empty.join(", ")}`, `Fill them in and run \`${loadCommand}\`.`)
    : ok(`${envFileName} has DATABASE_* filled in`);
}

// 5. Branding (BRAND_NAME / BRAND_DOMAIN / BRAND_EMAIL) — the same reading and validation the
// deploy does in infra/branding.ts, so it fails here, with every problem at once.
let branding: Branding | undefined;
try {
  branding = loadBranding({ stage, root });
  ok(`Branding: ${branding.name} · ${branding.domain} · ${branding.email}`);
  const senderHost = branding.email.slice(branding.email.lastIndexOf("@") + 1);
  if (senderHost !== branding.domain && !senderHost.endsWith(`.${branding.domain}`)) {
    warn(
      `BRAND_EMAIL is on another domain (${senderHost}), neither ${branding.domain} nor a subdomain of it`,
      "That is fine if your e-mail provider verified that domain; otherwise sending will be rejected.",
    );
  }
} catch (e) {
  if (!(e instanceof BrandingError)) throw e;
  fail(
    `Invalid branding in ${e.file}`,
    `${e.issues.join("\n      ")}\n      (template: the "Branding" section of .env.example)`,
  );
}

// 6. Valid token (blocks) and the domain's zone being visible (warns only).
if (token && accountId) {
  type CloudflareReply = { success: boolean; result?: { status?: string } | unknown[] };
  const api = async (path: string): Promise<CloudflareReply> =>
    (await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
  const isActive = (r: CloudflareReply) =>
    r.success && !Array.isArray(r.result) && r.result?.status === "active";
  try {
    // The setup guide creates an Account API Token, which is only verifiable through the
    // account route. The user route covers whoever used a personal token instead.
    const verified =
      isActive(await api(`/accounts/${accountId}/tokens/verify`)) ||
      isActive(await api("/user/tokens/verify"));
    if (!verified) {
      fail(
        "CLOUDFLARE_API_TOKEN is invalid, expired or belongs to another account",
        "Create an Account API Token under Manage Account → Account API Tokens (see https://nuxfire.com/docs/saas-starter-kit/getting-started/cloudflare-access) and check CLOUDFLARE_ACCOUNT_ID.",
      );
    } else {
      ok("Cloudflare token is valid");
      // The guide's token may lack Zone:Read, so an unlisted zone proves nothing — but a
      // domain that is not in the account breaks the deploy further along.
      if (branding) {
        const zones = await api(
          `/zones?name=${encodeURIComponent(branding.domain)}&account.id=${accountId}`,
        );
        zoneVerified = Array.isArray(zones.result) && zones.result.length > 0;
        zoneVerified
          ? ok(`Zone ${branding.domain} found in the account`)
          : warn(
              `Zone "${branding.domain}" did not show up in account ${accountId}`,
              `Make sure ${branding.domain} (BRAND_DOMAIN) was added to the SAME Cloudflare account as the token, with active nameservers. If it was, the token may simply lack Zone:Read.`,
            );
      }
    }
  } catch (e) {
    warn(
      `Could not reach the Cloudflare API (${(e as Error).message})`,
      "Check your connection; the token and the zone were not verified.",
    );
  }
}

if (sharesStarterKitAppName({ appName, domain: branding?.domain, zoneVerified })) {
  warn(
    `sst.config.ts still identifies this app as "${SHARED_APP_NAME}", the shared starter-kit name`,
    `If this is your own product, change \`name: "${SHARED_APP_NAME}"\` in sst.config.ts to a name unique to your installation BEFORE your first deploy to any stage — changing it later recreates every Cloudflare resource under the new name. (The Nuxfire reference deploy is recognised by BRAND_DOMAIN=${REFERENCE_DOMAIN} with that zone present in the account, and is not warned.)`,
  );
}

if (warnings.length) console.warn(`\n${warnings.length} warning(s):\n\n${warnings.join("\n\n")}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s) prevent the deploy:\n\n${problems.join("\n\n")}\n`);
  process.exit(1);
}
console.log("\nAll set for the deploy.");
