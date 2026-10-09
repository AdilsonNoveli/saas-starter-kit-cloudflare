// SEO gate: `bun run check:seo [--content <dir>] [--public <dir>] [--output <dir>] [--site <url>]`.
//
//  1. Source lint: the frontmatter of every post under apps/web/content/blog.
//  2. Build audit: every prerendered page, and the sitemaps, under apps/web/.output/public.
//     Run it after `nuxt build`; without a build only the source lint runs, and it says so.
//
// `bun run check:seo -- --live <origin> [--sitemap-origin <origin>] [--redirects <file>]` audits
// the HTTP layer of a running site instead (status codes, redirects, compression, cache): see
// scripts/seo-live.ts. It is read-only and it only runs when asked.
//
// Known exceptions live in scripts/seo-config.json as dated, owned allowances (allowances.ts).
//
// Exit code 0 when clean, 1 on any violation (each printed with its rule and location).
// The rules are pure and unit-tested in seo-rules.ts; this file only reads and reports.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { CONTENT_LANGS } from "../apps/web/i18n/supported-locales";
import { applyAllowances, missingOwners, type Allowance } from "./allowances";
import { pngSize } from "./og-images";
import { parseRedirects } from "./redirects";
import { auditLive, parseOrigin } from "./seo-live";
import {
  auditPage,
  auditSite,
  lintPosts,
  parseHead,
  parseSitemap,
  type AuditContext,
  type ImageInfo,
  type PageHtml,
  type PostFile,
  type SitemapUrl,
  type Violation,
} from "./seo-rules";

const root = join(import.meta.dir, "..");

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

// ---------------------------------------------------------------------------------
// Live mode: `--live <origin>`
// ---------------------------------------------------------------------------------

if (process.argv.includes("--live")) {
  const given = option("live");
  if (given === undefined || given.startsWith("--")) {
    console.error("✗ --live needs an origin, for example: bun run check:seo -- --live https://nuxfire.com");
    process.exit(1);
  }
  try {
    const origin = parseOrigin(given!);
    const redirectsFile = option("redirects") ?? join(root, "apps/web/public/_redirects");
    const legacy = existsSync(redirectsFile)
      ? parseRedirects(readFileSync(redirectsFile, "utf8")).entries.map((entry) => ({ from: entry.from, to: entry.to.startsWith("/") ? entry.to : undefined }))
      : [];
    const { violations, checked } = await auditLive({ origin, sitemapOrigin: option("sitemap-origin"), legacy });
    console.log(`${checked} sitemap URL(s) and ${legacy.length} legacy URL(s) audited live at ${origin}`);
    if (violations.length > 0) {
      for (const violation of violations) console.error(`✗ [${violation.rule}] ${violation.where}\n    ${violation.message}`);
      console.error(`\n${violations.length} violation(s) of ${new Set(violations.map((v) => v.rule)).size} rule(s).`);
      process.exit(1);
    }
    console.log("✓ check:seo --live passed");
    process.exit(0);
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

const contentDir = option("content") ?? join(root, "apps/web/content/blog");
const publicDir = option("public") ?? join(root, "apps/web/public");
const outputDir = option("output") ?? join(root, "apps/web/.output/public");

/**
 * Titles and descriptions that mean "the page set nothing": what the SEO module renders
 * without a title, and the site tagline (apps/web/app/app.config.ts) as a description.
 * Two pages that both fell back would also trip the `title-unique` rule.
 */
const FALLBACK_TITLES = ["Nuxfire", "Nuxfire | Nuxfire"];
const FALLBACK_DESCRIPTIONS = ["Production-ready enterprise-grade Nuxt starter kit for Cloudflare."];
const SITE_NAME = "Nuxfire";
const EXPECTED_IMAGE = { width: 1200, height: 675 };
/** The three homes carry the site tagline as their own description. */
const HOMES = ["/", "/pt-br", "/es"];

const violations: Violation[] = [];
const notes: string[] = [];

interface SeoConfig {
  placeholderTitles: string[];
  allow: Allowance[];
}
const seoConfigFile = option("config") ?? join(root, "scripts/seo-config.json");
const seoConfig: SeoConfig = existsSync(seoConfigFile)
  ? (JSON.parse(readFileSync(seoConfigFile, "utf8")) as SeoConfig)
  : { placeholderTitles: [], allow: [] };

// ---------------------------------------------------------------------------------
// 1. Source lint
// ---------------------------------------------------------------------------------

function readPosts(): PostFile[] {
  if (!existsSync(contentDir)) return [];
  return readdirSync(contentDir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const text = readFileSync(join(contentDir, name), "utf8").replace(/\r\n/g, "\n");
      const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      const parsed = block === "" ? {} : (Bun.YAML.parse(block) as Record<string, unknown> | null);
      return {
        file: relative(root, join(contentDir, name)).replaceAll("\\", "/"),
        slug: name.replace(/\.md$/, ""),
        frontmatter: parsed ?? {},
      };
    });
}

const posts = readPosts();
violations.push(
  ...lintPosts(posts, {
    langs: CONTENT_LANGS,
    publicFileExists: (publicPath) => existsSync(join(publicDir, publicPath)),
  }),
);
console.log(`${posts.length} post(s) linted in ${relative(root, contentDir).replaceAll("\\", "/")}`);

// ---------------------------------------------------------------------------------
// 2. Build audit
// ---------------------------------------------------------------------------------

function collectPages(dir: string, prefix = ""): PageHtml[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    const url = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return collectPages(path, url);
    if (entry.name !== "index.html") return [];
    const pageUrl = prefix === "" ? "/" : prefix;
    // `/sitemap.xml/index.html` and friends are not pages.
    return /\.[a-z]+$/i.test(pageUrl) ? [] : [{ url: pageUrl, html: readFileSync(path, "utf8") }];
  });
}

function readSitemaps(dir: string): SitemapUrl[] {
  const folder = join(dir, "__sitemap__");
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((name) => name.endsWith(".xml"))
    .flatMap((name) => parseSitemap(readFileSync(join(folder, name), "utf8")));
}

if (!existsSync(outputDir)) {
  notes.push(`no build output at ${relative(root, outputDir).replaceAll("\\", "/")}: only the source lint ran (build first with SITE_URL set)`);
} else {
  const pages = collectPages(outputDir);
  const siteUrl =
    option("site") ??
    process.env.SITE_URL ??
    (() => {
      // A relative canonical is itself a violation reported below, so it cannot be used
      // to infer the origin: only an absolute one can.
      const canonical = pages
        .map((page) => parseHead(page.html).links.find((link) => link.rel === "canonical")?.href)
        .find((href) => href !== undefined && /^https?:\/\//i.test(href));
      return canonical ? new URL(canonical).origin : "https://nuxfire.com";
    })();

  const ctx: AuditContext = {
    siteUrl: siteUrl.replace(/\/$/, ""),
    siteName: SITE_NAME,
    fallbackTitles: FALLBACK_TITLES,
    fallbackDescriptions: FALLBACK_DESCRIPTIONS,
    fallbackDescriptionAllowed: HOMES,
    expectedImage: EXPECTED_IMAGE,
    placeholderTitles: seoConfig.placeholderTitles,
    // Nuxt renders robots.txt at runtime; when a build does have the file it is audited here,
    // otherwise `--live` audits the real answer.
    robotsTxt: existsSync(join(outputDir, "robots.txt")) ? readFileSync(join(outputDir, "robots.txt"), "utf8") : undefined,
    image: (publicPath): ImageInfo => {
      const file = join(outputDir, publicPath);
      if (!existsSync(file) || !statSync(file).isFile()) return { exists: false };
      return { exists: true, ...pngSize(readFileSync(file)) };
    },
  };

  const sitemap = readSitemaps(outputDir);
  for (const page of pages) violations.push(...auditPage(page, ctx));
  violations.push(...auditSite(pages, sitemap, ctx));
  console.log(`${pages.length} page(s) and ${sitemap.length} sitemap URL(s) audited against ${ctx.siteUrl}`);
}

// ---------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------

for (const note of notes) console.log(`! ${note}`);
const { remaining, problems } = applyAllowances(violations, seoConfig.allow);
violations.splice(0, violations.length, ...remaining, ...problems, ...missingOwners(seoConfig.allow, root));
if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`✗ [${violation.rule}] ${violation.where}\n    ${violation.message}`);
  }
  const rules = new Set(violations.map((violation) => violation.rule));
  console.error(`\n${violations.length} violation(s) of ${rules.size} rule(s).`);
  process.exit(1);
}
console.log("✓ check:seo passed");
