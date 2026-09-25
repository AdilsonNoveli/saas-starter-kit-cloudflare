import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { applyAllowances, ownerExists, type Allowance } from "./allowances";
import {
  auditPerf,
  measurePage,
  type PerfConfig,
  type PerfContext,
  type PerfPageInput,
} from "./perf-rules";
import type { Violation } from "./seo-rules";

// BDD source: specs/*/0002-web-performance-search-copy-specialists/spec.md (AC-001 to AC-003).
// The gate measures the built output, so every test feeds it a tiny site and a size table.

const SITE = "https://nuxfire.com";

/** Sizes of the files of the fake build, keyed by root-relative path. */
function sizes(table: Record<string, number>): PerfContext["sizeOf"] {
  return (path) => table[path];
}

function ctx(table: Record<string, number> = {}, htmlBytes = 1000): PerfContext {
  return { siteOrigin: SITE, sizeOf: sizes(table), htmlSize: () => htmlBytes };
}

function page(url: string, body: string, head = ""): PerfPageInput {
  return { url, html: `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>` };
}

function config(overrides: Partial<PerfConfig> = {}): PerfConfig {
  return {
    schema: 1,
    staleTolerancePct: 2,
    images: { maxBytes: 200_000 },
    pages: { "/": { js: "allowed", lcp: { kind: "text" } } },
    budgets: [],
    allow: [],
    ...overrides,
  };
}

const rules = (violations: Violation[]): string[] => [...new Set(violations.map((v) => v.rule))].sort();

const HOME_HEAD =
  '<script type="module" src="/_nuxt/a.js"></script><link rel="modulepreload" href="/_nuxt/b.js">' +
  '<link rel="stylesheet" href="/_nuxt/x.css">';
const HOME = page("/", '<img src="/img/logo.png" width="10" height="10" alt="logo">', HOME_HEAD);
const FILES = { "/_nuxt/a.js": 60_000, "/_nuxt/b.js": 30_000, "/_nuxt/x.css": 20_000, "/img/logo.png": 5_000 };

describe("measuring a page (AC-001)", () => {
  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("adds the bytes of the scripts, styles and images a page references and counts the requests", () => {
    const metrics = measurePage(HOME, ctx(FILES, 4_321));
    expect(metrics).toMatchObject({ html: 4_321, js: 90_000, css: 20_000, images: 5_000, requests: 4 });
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("counts a resource once when it is both a script and a modulepreload", () => {
    const twice = page("/", "", '<script type="module" src="/_nuxt/a.js"></script><link rel="modulepreload" href="/_nuxt/a.js">');
    expect(measurePage(twice, ctx(FILES)).js).toBe(60_000);
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("ignores inline scripts and JSON-LD when adding JavaScript bytes", () => {
    const inline = page("/", "", '<script>console.log(1)</script><script type="application/ld+json">{}</script>');
    expect(measurePage(inline, ctx(FILES)).js).toBe(0);
  });
});

describe("byte budgets (AC-001)", () => {
  const budget = (limit: number, metric: "js" | "css" | "html" | "images" | "requests" = "js") => ({
    route: "/",
    metric,
    limit,
    kind: "budget" as const,
    source: "decision:DEC-005",
    since: "2026-09-25",
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("passes a page exactly at its budget and fails one byte over, naming rule, page, measured and limit", () => {
    const ok = auditPerf([HOME], config({ budgets: [budget(90_000)] }), ctx(FILES));
    expect(rules(ok)).toEqual([]);
    const over = auditPerf([HOME], config({ budgets: [budget(89_999)] }), ctx(FILES));
    expect(rules(over)).toEqual(["budget-js"]);
    expect(over[0].where).toBe("/");
    expect(over[0].message).toContain("90000");
    expect(over[0].message).toContain("89999");
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("has one rule per metric", () => {
    const found = auditPerf(
      [HOME],
      config({ budgets: [budget(1, "html"), budget(1, "css"), budget(1, "images"), budget(1, "requests")] }),
      ctx(FILES),
    );
    expect(rules(found)).toEqual(["budget-css", "budget-html", "budget-images", "budget-requests"]);
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("reports a budget for a route that is not in the build", () => {
    const found = auditPerf([HOME], config({ budgets: [{ ...budget(10), route: "/gone" }] }), ctx(FILES));
    expect(rules(found)).toEqual(["route-missing"]);
  });
});

describe("static image rules (AC-002)", () => {
  // SPECSFY: US-001 FR-002 NFR-001 AC-002
  it("flags an img without width and height and passes a sized one", () => {
    const bad = page("/", '<img src="/img/logo.png" alt="x"><img src="/img/other.png" width="10" alt="x">');
    const found = auditPerf([bad], config(), ctx(FILES));
    expect(found.filter((v) => v.rule === "img-dimensions")).toHaveLength(2);
    expect(auditPerf([HOME], config(), ctx(FILES)).filter((v) => v.rule === "img-dimensions")).toEqual([]);
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-002
  it("requires the declared LCP image to be eager and to carry fetchpriority high", () => {
    const declared = config({ pages: { "/": { lcp: { kind: "image", src: "/img/hero.png" } } } });
    const lazy = page("/", '<img src="/img/hero.png" width="1" height="1" loading="lazy" alt="">');
    expect(rules(auditPerf([lazy], declared, ctx({ "/img/hero.png": 10 })))).toContain("img-lcp-lazy");
    const noPriority = page("/", '<img src="/img/hero.png" width="1" height="1" alt="">');
    expect(rules(auditPerf([noPriority], declared, ctx({ "/img/hero.png": 10 })))).toContain("img-lcp-lazy");
    const good = page("/", '<img src="/img/hero.png" width="1" height="1" fetchpriority="high" alt="">');
    expect(rules(auditPerf([good], declared, ctx({ "/img/hero.png": 10 })))).toEqual([]);
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-002
  it("reports a declared LCP image that is not on the page", () => {
    const declared = config({ pages: { "/": { lcp: { kind: "image", src: "/img/hero.png" } } } });
    expect(rules(auditPerf([page("/", "")], declared, ctx()))).toContain("img-lcp-lazy");
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-002
  it("flags a raster image over the configured maximum and accepts one at the maximum", () => {
    const body = '<img src="/img/big.jpeg" width="1" height="1" alt="">';
    expect(rules(auditPerf([page("/", body)], config(), ctx({ "/img/big.jpeg": 200_001 })))).toEqual(["img-max-bytes"]);
    expect(rules(auditPerf([page("/", body)], config(), ctx({ "/img/big.jpeg": 200_000 })))).toEqual([]);
  });
});

describe("one resource is one defect wherever it appears (AC-002)", () => {
  // SPECSFY: US-001 FR-002 NFR-001 AC-002
  it("reports a logo without dimensions once for the site, with how many pages carry it", () => {
    const pages = ["/", "/a", "/b"].map((url) => page(url, '<img src="/svg/logo.svg" alt="logo">'));
    const found = auditPerf(pages, config({ pages: {} }), ctx());
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "img-dimensions", where: "(site)", subject: "/svg/logo.svg" });
    expect(found[0].message).toContain("3 pages");
  });
});

describe("third-party origins and zero-JavaScript pages (AC-002)", () => {
  // SPECSFY: US-001 FR-002 NFR-001 AC-002
  it("flags a script, style or image loaded from another origin unless the page allows it", () => {
    const body = '<img src="https://cdn.other.com/a.png" width="1" height="1" alt="">';
    const head = '<script src="https://tags.other.com/t.js"></script><link rel="stylesheet" href="https://fonts.other.com/f.css">';
    const found = auditPerf([page("/", body, head)], config(), ctx());
    expect(found.filter((v) => v.rule === "third-party-origin")).toHaveLength(3);
    const allowed = config({ pages: { "/": { thirdParty: ["cdn.other.com", "tags.other.com", "fonts.other.com"] } } });
    expect(rules(auditPerf([page("/", body, head)], allowed, ctx()))).toEqual([]);
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-002
  it("does not treat canonical or alternate links, or a same-host absolute URL, as third-party", () => {
    const head = '<link rel="canonical" href="https://elsewhere.com/x"><link rel="alternate" hreflang="en" href="https://elsewhere.com/y"><link rel="stylesheet" href="https://nuxfire.com/_nuxt/x.css">';
    expect(rules(auditPerf([page("/", "", head)], config(), ctx(FILES)))).toEqual([]);
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-002
  it("lets a page declared as zero JavaScript carry JSON-LD only", () => {
    const zero = config({ pages: { "/": { js: "none" } } });
    const clean = page("/", "", '<script type="application/ld+json">{"@type":"WebPage"}</script>');
    expect(rules(auditPerf([clean], zero, ctx()))).toEqual([]);
    const withScript = page("/", "", '<script type="application/ld+json">{}</script><script src="/_nuxt/a.js"></script>');
    expect(rules(auditPerf([withScript], zero, ctx(FILES)))).toEqual(["js-none"]);
    const inline = page("/", "", "<script>window.x=1</script>");
    expect(rules(auditPerf([inline], zero, ctx()))).toEqual(["js-none"]);
    const preload = page("/", "", '<link rel="modulepreload" href="/_nuxt/a.js">');
    expect(rules(auditPerf([preload], zero, ctx(FILES)))).toEqual(["js-none"]);
  });
});

describe("the baseline only shrinks (AC-003)", () => {
  const baseline = (limit: number, extra: Partial<PerfConfig["budgets"][number]> = {}): PerfConfig["budgets"][number] => ({
    route: "/",
    metric: "js",
    limit,
    kind: "baseline",
    source: "research/baseline-measurements.md",
    removedBy: "SPEC-0003",
    since: "2026-09-25",
    ...extra,
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("accepts a measured value equal to the baseline", () => {
    expect(rules(auditPerf([HOME], config({ budgets: [baseline(90_000)] }), ctx(FILES)))).toEqual([]);
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("fails a regression of a single byte", () => {
    expect(rules(auditPerf([HOME], config({ budgets: [baseline(89_999)] }), ctx(FILES)))).toEqual(["baseline-regression"]);
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("tolerates the byte noise of two builds of the same source only up to regressionTolerancePct", () => {
    const noisy = config({ regressionTolerancePct: 0.1, budgets: [baseline(89_950)] });
    expect(rules(auditPerf([HOME], noisy, ctx(FILES)))).toEqual([]);
    const grown = config({ regressionTolerancePct: 0.1, budgets: [baseline(89_900)] });
    expect(rules(auditPerf([HOME], grown, ctx(FILES)))).toEqual(["baseline-regression"]);
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("fails a stale entry when the value dropped by more than the tolerance and asks to lower it", () => {
    const found = auditPerf([HOME], config({ budgets: [baseline(120_000)] }), ctx(FILES));
    expect(rules(found)).toEqual(["baseline-stale"]);
    expect(found[0].message).toContain("90000");
    expect(rules(auditPerf([HOME], config({ budgets: [baseline(91_000)] }), ctx(FILES)))).toEqual([]);
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("rejects an entry without an owning spec or with a malformed one", () => {
    const missing = auditPerf([HOME], config({ budgets: [baseline(90_000, { removedBy: undefined })] }), ctx(FILES));
    expect(rules(missing)).toEqual(["baseline-owner"]);
    const malformed = auditPerf([HOME], config({ budgets: [baseline(90_000, { removedBy: "soon" })] }), ctx(FILES));
    expect(rules(malformed)).toEqual(["baseline-owner"]);
  });
});

describe("allowances (AC-003)", () => {
  const found: Violation[] = [
    { rule: "img-dimensions", where: "/", message: "img /svg/logo.svg has no width and height" },
    { rule: "img-max-bytes", where: "/", message: "/static/a.jpeg is 446942 bytes", subject: "/static/a.jpeg" },
  ];
  const allow = (over: Partial<Allowance> = {}): Allowance => ({
    rule: "img-max-bytes",
    where: "/",
    match: "/static/a.jpeg",
    removedBy: "SPEC-0003",
    since: "2026-09-25",
    ...over,
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("removes exactly the violations an allowance names and keeps the others", () => {
    const { remaining, problems } = applyAllowances(found, [allow()]);
    expect(remaining.map((v) => v.rule)).toEqual(["img-dimensions"]);
    expect(problems).toEqual([]);
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("reports an allowance that no longer matches anything as stale", () => {
    const { problems } = applyAllowances(found, [allow({ match: "/static/gone.jpeg" })]);
    expect(problems.map((v) => v.rule)).toEqual(["allowance-stale"]);
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("rejects an allowance without an owning spec or a valid date", () => {
    expect(applyAllowances(found, [allow({ removedBy: "" })]).problems.map((v) => v.rule)).toContain("allowance-owner");
    expect(applyAllowances(found, [allow({ since: "yesterday" })]).problems.map((v) => v.rule)).toContain("allowance-owner");
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("accepts a backlog item as the owner", () => {
    expect(applyAllowances(found, [allow({ removedBy: "BACKLOG-app-ui-copy" })]).problems).toEqual([]);
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("checks that the owner is a spec or a backlog item that exists", () => {
    const root = mkdtempSync(join(tmpdir(), "owners-"));
    roots.push(root);
    write(join(root, "specs/review/0001-content-seo-metadata/spec.md"), "x");
    write(join(root, "specs/backlog/0004-landing-refactor.md"), "x");
    expect(ownerExists("SPEC-0001", root)).toBe(true);
    expect(ownerExists("BACKLOG-landing-refactor", root)).toBe(true);
    expect(ownerExists("SPEC-0009", root)).toBe(false);
    expect(ownerExists("BACKLOG-nothing", root)).toBe(false);
    expect(ownerExists("soon", root)).toBe(false);
  });

  // SPECSFY: US-001 FR-002 NFR-002 AC-003
  it("lets check:perf apply the allowances of its configuration", () => {
    const body = '<img src="/static/a.jpeg" width="1" height="1" alt="">';
    const cfg = config({ allow: [allow({ where: "(site)" })] });
    expect(rules(auditPerf([page("/", body)], cfg, ctx({ "/static/a.jpeg": 446_942 })))).toEqual([]);
    expect(rules(auditPerf([page("/", body)], cfg, ctx({ "/static/a.jpeg": 100 })))).toEqual(["allowance-stale"]);
  });
});

// ---------------------------------------------------------------------------------
// The command line (AC-001, AC-003)
// ---------------------------------------------------------------------------------

const SCRIPT = join(import.meta.dirname, "check-perf.ts");
const roots: string[] = [];
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function site(cfg: PerfConfig | null, withBuild = true) {
  const root = mkdtempSync(join(tmpdir(), "check-perf-"));
  roots.push(root);
  const output = join(root, "output");
  if (withBuild) {
    write(join(output, "index.html"), `<!DOCTYPE html><html><head><link rel="canonical" href="${SITE}/">${HOME_HEAD}</head><body><h1>x</h1></body></html>`);
    write(join(output, "_nuxt/a.js"), "a".repeat(2_000));
    write(join(output, "_nuxt/b.js"), "b".repeat(2_000));
    write(join(output, "_nuxt/x.css"), "c".repeat(2_000));
  }
  const configFile = join(root, "perf-budgets.json");
  if (cfg) write(configFile, JSON.stringify(cfg));
  return { root, output, configFile };
}

/** `bun` may be a `.cmd` shim on Windows: one quoted command string with a shell. */
function run(args: string[]) {
  const quoted = args.map((arg) => (/[\s"]/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg)).join(" ");
  const result = spawnSync(`bun "${SCRIPT}" ${quoted}`, { encoding: "utf8", shell: true });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

describe("check:perf command line (AC-001, AC-003)", { timeout: 60_000 }, () => {
  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("exits 0 on a site within its budgets and prints what it audited", () => {
    const s = site(config({ budgets: [{ route: "/", metric: "requests", limit: 4, kind: "budget", source: "decision:DEC-005", since: "2026-09-25" }] }));
    const { code, out } = run(["--output", s.output, "--config", s.configFile]);
    expect(out).toContain("1 page(s)");
    expect(code).toBe(0);
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("exits 1 and prints rule, page, measured and limit when a budget is exceeded", () => {
    const s = site(config({ budgets: [{ route: "/", metric: "requests", limit: 1, kind: "budget", source: "decision:DEC-005", since: "2026-09-25" }] }));
    const { code, out } = run(["--output", s.output, "--config", s.configFile]);
    expect(code).toBe(1);
    expect(out).toContain("[budget-requests] /");
  });

  // SPECSFY: US-001 FR-002 NFR-001 AC-001
  it("says so and exits 0 when there is no build output", () => {
    const s = site(config(), false);
    const { code, out } = run(["--output", s.output, "--config", s.configFile]);
    expect(out).toContain("no build output");
    expect(code).toBe(0);
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("fails on a malformed configuration instead of ignoring it", () => {
    const s = site(null);
    write(s.configFile, "{ not json");
    const { code, out } = run(["--output", s.output, "--config", s.configFile]);
    expect(code).toBe(1);
    expect(out).toContain("configuration");
  });

  // SPECSFY: US-007 FR-002 NFR-002 AC-003
  it("prints the measured values as baseline entries with --print-baseline", () => {
    const s = site(config());
    const { code, out } = run(["--output", s.output, "--config", s.configFile, "--print-baseline"]);
    expect(code).toBe(0);
    const start = out.indexOf("[");
    const entries = JSON.parse(out.slice(start, out.lastIndexOf("]") + 1)) as { route: string; metric: string; limit: number }[];
    expect(entries.find((e) => e.route === "/" && e.metric === "js")?.limit).toBeGreaterThan(0);
  });
});
