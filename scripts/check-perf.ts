// Performance gate: `bun run check:perf [--output <dir>] [--config <file>] [--site <url>] [--print-baseline]`.
//
// Reads the built site (apps/web/.output/public by default) and perf-budgets.json, measures the
// bytes and the structure of every page and reports each violation as `[rule] page`. Bytes are
// brotli-compressed sizes for text and raw sizes for images and fonts. Timings (LCP, INP, CLS)
// are not measured here: they need a browser and field data (SPEC-0002 DEC-009).
//
// `--print-baseline` prints the measured values of the configured routes as baseline entries and
// `--print-allowances` the static violations as allowances, both to paste into perf-budgets.json.
//
// Exit code 0 when clean, 1 on any violation or on a configuration that is not valid.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
import { missingOwners } from "./allowances";
import { baselineEntries, auditPerf, checkPerfConfig, type PerfContext, type PerfPageInput } from "./perf-rules";
import { parseHead } from "./seo-rules";

const root = join(import.meta.dir, "..");

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

const outputDir = option("output") ?? join(root, "apps/web/.output/public");
const configFile = option("config") ?? join(root, "perf-budgets.json");

/** Text is compressed on the wire; images, fonts and other binaries are not. */
const TEXT = new Set([".js", ".mjs", ".css", ".html", ".svg", ".json", ".xml", ".txt"]);
const BROTLI_QUALITY = 9;

const cache = new Map<string, number | undefined>();
function sizeOfFile(path: string): number | undefined {
  if (cache.has(path)) return cache.get(path);
  const file = join(outputDir, path);
  let size: number | undefined;
  if (existsSync(file) && statSync(file).isFile()) {
    const bytes = readFileSync(file);
    size = TEXT.has(extname(file).toLowerCase()) ? brotli(bytes) : bytes.length;
  }
  cache.set(path, size);
  return size;
}

function brotli(bytes: Uint8Array | string): number {
  return brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } }).length;
}

function collectPages(dir: string, prefix = ""): PerfPageInput[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    const url = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return collectPages(path, url);
    if (entry.name !== "index.html") return [];
    const pageUrl = prefix === "" ? "/" : prefix;
    return /\.[a-z]+$/i.test(pageUrl) ? [] : [{ url: pageUrl, html: readFileSync(path, "utf8") }];
  });
}

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

if (!existsSync(configFile)) fail(`no configuration at ${relative(root, configFile).replaceAll("\\", "/")}`);
let raw: unknown;
try {
  raw = JSON.parse(readFileSync(configFile, "utf8"));
} catch (error) {
  fail(`the configuration is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
}
const { config, problems } = checkPerfConfig(raw);
if (!config) {
  for (const problem of problems) console.error(`✗ configuration: ${problem}`);
  process.exit(1);
}

if (!existsSync(outputDir)) {
  console.log(`! no build output at ${relative(root, outputDir).replaceAll("\\", "/")}: nothing to measure (build first with SITE_URL set)`);
  process.exit(0);
}

const pages = collectPages(outputDir);
const siteOrigin = (
  option("site") ??
  process.env.SITE_URL ??
  (() => {
    const canonical = pages
      .map((page) => parseHead(page.html).links.find((link) => link.rel === "canonical")?.href)
      .find((href) => href !== undefined && /^https?:\/\//i.test(href));
    return canonical ? new URL(canonical).origin : "https://nuxfire.com";
  })()
).replace(/\/$/, "");

const ctx: PerfContext = { siteOrigin, sizeOf: sizeOfFile, htmlSize: (html) => brotli(html) };

if (flag("print-baseline")) {
  const entries = baselineEntries(pages, Object.keys(config.pages), ctx, {
    source: "research/baseline-measurements.md",
    removedBy: "SPEC-0003",
    since: new Date().toISOString().slice(0, 10),
  });
  console.log(JSON.stringify(entries, null, 2));
  process.exit(0);
}

if (flag("print-allowances")) {
  // The violations of the static rules as dated, owned allowances (see allowances.ts).
  const found = auditPerf(pages, { ...config, allow: [] }, ctx).filter((v) => ["img-dimensions", "img-max-bytes", "third-party-origin"].includes(v.rule));
  const allowances = found.map((v) => ({
    rule: v.rule,
    where: v.where,
    ...(v.subject !== undefined ? { match: v.subject } : {}),
    removedBy: "SPEC-0003",
    since: new Date().toISOString().slice(0, 10),
  }));
  console.log(JSON.stringify(allowances, null, 2));
  process.exit(0);
}

const violations = [...auditPerf(pages, config, ctx), ...missingOwners([...config.allow, ...config.budgets.filter((b) => b.kind === "baseline" && b.removedBy).map((b) => ({ rule: "baseline", where: b.route, removedBy: b.removedBy!, since: b.since }))], root)];
console.log(`${pages.length} page(s) audited against ${siteOrigin}`);
if (violations.length > 0) {
  for (const violation of violations) console.error(`✗ [${violation.rule}] ${violation.where}\n    ${violation.message}`);
  const rules = new Set(violations.map((violation) => violation.rule));
  console.error(`\n${violations.length} violation(s) of ${rules.size} rule(s).`);
  process.exit(1);
}
console.log("✓ check:perf passed");
