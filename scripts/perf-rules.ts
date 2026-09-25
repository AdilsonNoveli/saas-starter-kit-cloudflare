import { applyAllowances, isValidOwner, type Allowance } from "./allowances";
import { attributes, tagPattern } from "./html-scan";
import type { Violation } from "./seo-rules";

// Pure rules of the `check:perf` gate (SPEC-0002 FR-002). The gate reads the built site and
// measures BYTES and STRUCTURE, which are deterministic. It does not measure LCP, INP or CLS:
// those need a browser and field data (web.dev, "Core Web Vitals"), and a lab run cannot
// replace them (DEC-009). Every byte limit is a project decision (DEC-005), recorded with the
// measurement it came from; the only externally sourced thresholds are the vitals.

export type Metric = "html" | "js" | "css" | "images" | "requests";

export interface BudgetEntry {
  route: string;
  metric: Metric;
  limit: number;
  /** `budget`: a target the page must meet. `baseline`: today's measured value; it may only shrink. */
  kind: "budget" | "baseline";
  /** Where the number comes from: a research file, or `decision:DEC-nnn`. */
  source: string;
  /** Required for a baseline: the spec that removes the excess. */
  removedBy?: string;
  since: string;
}

export interface PageConfig {
  /** `none`: the page must ship no JavaScript (JSON-LD excepted). */
  js?: "none" | "allowed";
  /** What the browser is expected to paint as the largest element. An image is checked. */
  lcp?: { kind: "text" } | { kind: "image"; src: string };
  /** Hosts this page may load resources from besides its own. */
  thirdParty?: string[];
}

export interface PerfConfig {
  schema: 1;
  /** A baseline entry is stale only when the value dropped by more than this percentage. */
  staleTolerancePct: number;
  /**
   * Two builds of the same source are not byte-identical (hashes, ids, the icons a slow network
   * failed to inline), so a baseline may be exceeded by this percentage before it is a regression.
   * Absent means 0: a baseline never grows.
   */
  regressionTolerancePct?: number;
  images: { maxBytes: number };
  pages: Record<string, PageConfig>;
  budgets: BudgetEntry[];
  allow: Allowance[];
}

export interface PerfPageInput {
  /** Path of the page, e.g. `/blog`. */
  url: string;
  html: string;
}

export interface PerfContext {
  /** `https://nuxfire.com`: what counts as the same origin. */
  siteOrigin: string;
  /** Size in bytes of a file of the build (compressed for text, raw for binaries), by root-relative path. */
  sizeOf: (path: string) => number | undefined;
  /** Compressed size of the page HTML. */
  htmlSize: (html: string) => number;
}

export interface Resource {
  kind: "js" | "css" | "image" | "font";
  /** Root-relative path for a same-origin resource, otherwise undefined. */
  path?: string;
  /** Host of a resource on another origin. */
  host?: string;
  /** The URL as written in the HTML. */
  url: string;
}

export interface ImageRef {
  url: string;
  path?: string;
  host?: string;
  width?: string;
  height?: string;
  loading?: string;
  fetchpriority?: string;
}

export interface PageMetrics {
  url: string;
  html: number;
  js: number;
  css: number;
  images: number;
  requests: number;
  resources: Resource[];
  imgs: ImageRef[];
  /** Every `<script>` element: external (`src`) or inline, with its type. */
  scripts: { src?: string; type?: string }[];
  /** `modulepreload` and `preload as=script` links. */
  scriptPreloads: string[];
  /** Every URL a page loads that may be third-party, with the tag that loads it. */
  loads: { tag: string; url: string; host?: string }[];
}

const RASTER = /\.(?:png|jpe?g|gif|webp|avif)$/i;
const DIMENSION = /^\d+(?:\.\d+)?(?:px)?$/;
/** `rel` values whose href is a resource the page loads (not a canonical or an alternate). */
const LOADING_RELS = new Set(["stylesheet", "preload", "modulepreload", "prefetch", "icon", "apple-touch-icon", "manifest"]);

function locate(rawUrl: string, siteOrigin: string, pageUrl: string): { path?: string; host?: string } | undefined {
  const value = rawUrl.trim();
  if (value === "" || value.startsWith("data:") || value.startsWith("#")) return undefined;
  const site = new URL(siteOrigin);
  try {
    const resolved = new URL(value.startsWith("//") ? `https:${value}` : value, new URL(pageUrl, siteOrigin));
    if (resolved.host === site.host) return { path: resolved.pathname };
    return { host: resolved.host };
  } catch {
    return undefined;
  }
}

/** What one page references and what it costs. */
export function measurePage(page: PerfPageInput, ctx: PerfContext): PageMetrics {
  const resources: Resource[] = [];
  const seen = new Set<string>();
  const loads: PageMetrics["loads"] = [];
  const scripts: PageMetrics["scripts"] = [];
  const scriptPreloads: string[] = [];
  const imgs: ImageRef[] = [];

  const add = (kind: Resource["kind"], url: string, tag: string): void => {
    const where = locate(url, ctx.siteOrigin, page.url);
    if (!where) return;
    loads.push({ tag, url, host: where.host });
    const key = `${kind}:${where.path ?? `${where.host}${url}`}`;
    if (seen.has(key)) return;
    seen.add(key);
    resources.push({ kind, url, ...where });
  };

  for (const tag of page.html.match(tagPattern("script")) ?? []) {
    const attrs = attributes(tag);
    scripts.push({ src: attrs.src, type: attrs.type });
    if (attrs.src) add("js", attrs.src, "script");
  }
  for (const tag of page.html.match(tagPattern("link")) ?? []) {
    const attrs = attributes(tag);
    const rels = (attrs.rel ?? "").toLowerCase().split(/\s+/);
    const href = attrs.href;
    if (!href || !rels.some((rel) => LOADING_RELS.has(rel))) continue;
    if (rels.includes("stylesheet")) add("css", href, "link");
    else if (rels.includes("modulepreload")) {
      add("js", href, "link");
      scriptPreloads.push(href);
    } else if (rels.includes("preload")) {
      const as = (attrs.as ?? "").toLowerCase();
      if (as === "script") {
        add("js", href, "link");
        scriptPreloads.push(href);
      } else if (as === "style") add("css", href, "link");
      else if (as === "font") add("font", href, "link");
      else if (as === "image") add("image", href, "link");
      else loads.push({ tag: "link", url: href, host: locate(href, ctx.siteOrigin, page.url)?.host });
    } else {
      loads.push({ tag: "link", url: href, host: locate(href, ctx.siteOrigin, page.url)?.host });
    }
  }

  for (const tag of page.html.match(tagPattern("img")) ?? []) {
    const attrs = attributes(tag);
    const src = attrs.src ?? attrs.srcset?.split(",")[0]?.trim().split(/\s+/)[0];
    const where = src ? locate(src, ctx.siteOrigin, page.url) : undefined;
    imgs.push({
      url: src ?? "",
      ...where,
      width: attrs.width,
      height: attrs.height,
      loading: attrs.loading,
      fetchpriority: attrs.fetchpriority,
    });
    if (src) add("image", src, "img");
  }

  const bytes = (kind: Resource["kind"]): number =>
    resources.filter((r) => r.kind === kind).reduce((sum, r) => sum + (r.path ? (ctx.sizeOf(r.path) ?? 0) : 0), 0);

  return {
    url: page.url,
    html: ctx.htmlSize(page.html),
    js: bytes("js"),
    css: bytes("css"),
    images: bytes("image"),
    requests: resources.length,
    resources,
    imgs,
    scripts,
    scriptPreloads,
    loads,
  };
}

const violation = (rule: string, where: string, message: string, subject?: string): Violation =>
  subject === undefined ? { rule, where, message } : { rule, where, message, subject };

/** Rules about one resource wherever it appears: a logo in every page's header is one defect, not one per page. */
const SITE_WIDE = new Set(["img-dimensions", "img-max-bytes", "third-party-origin"]);
export const SITE = "(site)";

function mergeSiteWide(found: Violation[]): Violation[] {
  const merged = new Map<string, { first: Violation; pages: string[] }>();
  const rest: Violation[] = [];
  for (const item of found) {
    if (!SITE_WIDE.has(item.rule) || item.subject === undefined) {
      rest.push(item);
      continue;
    }
    const key = `${item.rule}|${item.subject}`;
    const entry = merged.get(key);
    if (entry) entry.pages.push(item.where);
    else merged.set(key, { first: item, pages: [item.where] });
  }
  const combined = [...merged.values()].map(({ first, pages }): Violation => {
    const unique = [...new Set(pages)];
    return {
      ...first,
      where: SITE,
      message: `${first.message} (${unique.length} page${unique.length === 1 ? "" : "s"}, for example ${unique[0]})`,
    };
  });
  return [...rest, ...combined];
}

function staticRules(metrics: PageMetrics, config: PerfConfig, ctx: PerfContext): Violation[] {
  const found: Violation[] = [];
  const page = config.pages[metrics.url] ?? {};
  const where = metrics.url;

  for (const img of metrics.imgs) {
    if (!img.width || !img.height || !DIMENSION.test(img.width) || !DIMENSION.test(img.height)) {
      found.push(violation("img-dimensions", where, `<img src="${img.url}"> has no numeric width and height: the browser cannot reserve its space (layout shift)`, img.url));
    }
    if (img.path && RASTER.test(img.path)) {
      const size = ctx.sizeOf(img.path);
      if (size !== undefined && size > config.images.maxBytes) {
        found.push(violation("img-max-bytes", where, `${img.path} is ${size} bytes, the maximum for a raster image is ${config.images.maxBytes}`, img.path));
      }
    }
  }

  const allowedHosts = new Set(page.thirdParty ?? []);
  for (const load of metrics.loads) {
    if (load.host && !allowedHosts.has(load.host)) {
      found.push(violation("third-party-origin", where, `${load.tag} loads ${load.url} from ${load.host}, which this page does not list in thirdParty`, load.url));
    }
  }

  if (page.js === "none") {
    for (const script of metrics.scripts) {
      if ((script.type ?? "").toLowerCase() === "application/ld+json") continue;
      found.push(violation("js-none", where, script.src ? `script ${script.src} on a page declared as zero JavaScript` : "an inline script on a page declared as zero JavaScript"));
    }
    for (const href of metrics.scriptPreloads) {
      found.push(violation("js-none", where, `${href} is preloaded on a page declared as zero JavaScript`));
    }
  }

  if (page.lcp?.kind === "image") {
    const declared = page.lcp.src;
    const img = metrics.imgs.find((candidate) => candidate.path === declared || candidate.url === declared);
    if (!img) {
      found.push(violation("img-lcp-lazy", where, `the declared LCP image ${declared} is not an <img> of the page`));
    } else {
      if ((img.loading ?? "").toLowerCase() === "lazy") {
        found.push(violation("img-lcp-lazy", where, `the LCP image ${declared} has loading="lazy": the browser delays the element it must paint first`));
      }
      if ((img.fetchpriority ?? "").toLowerCase() !== "high") {
        found.push(violation("img-lcp-lazy", where, `the LCP image ${declared} lacks fetchpriority="high"`));
      }
    }
  }
  return found;
}

function budgetRules(all: PageMetrics[], config: PerfConfig): Violation[] {
  const found: Violation[] = [];
  const byRoute = new Map(all.map((m) => [m.url, m]));
  for (const entry of config.budgets) {
    const metrics = byRoute.get(entry.route);
    if (!metrics) {
      found.push(violation("route-missing", entry.route, `the ${entry.kind} for ${entry.metric} names a page that is not in the build`));
      continue;
    }
    const measured = metrics[entry.metric];
    if (entry.kind === "budget") {
      if (measured > entry.limit) {
        found.push(violation(`budget-${entry.metric}`, entry.route, `${entry.metric} is ${measured}, the budget allows ${entry.limit}`));
      }
      continue;
    }
    if (!isValidOwner(entry.removedBy)) {
      found.push(violation("baseline-owner", entry.route, `the ${entry.metric} baseline needs removedBy naming the spec that removes the excess`));
    }
    if (measured > entry.limit + (entry.limit * (config.regressionTolerancePct ?? 0)) / 100) {
      found.push(violation("baseline-regression", entry.route, `${entry.metric} is ${measured}, the baseline allows ${entry.limit}: a baseline never grows`));
    } else if (measured > entry.limit) {
      // inside the build noise: neither a regression nor stale
    } else if (entry.limit - measured > (entry.limit * config.staleTolerancePct) / 100) {
      found.push(violation("baseline-stale", entry.route, `${entry.metric} is ${measured}, the baseline still says ${entry.limit}: lower it to ${measured}`));
    }
  }
  return found;
}

/** Measures every page, applies the budgets, the static rules and the allowances of the configuration. */
export function auditPerf(pages: PerfPageInput[], config: PerfConfig, ctx: PerfContext): Violation[] {
  const all = pages.map((page) => measurePage(page, ctx));
  const found = [...mergeSiteWide(all.flatMap((metrics) => staticRules(metrics, config, ctx))), ...budgetRules(all, config)];
  const { remaining, problems } = applyAllowances(found, config.allow);
  return [...remaining, ...problems];
}

/** The measured values of the listed routes, as baseline entries ready to paste. */
export function baselineEntries(
  pages: PerfPageInput[],
  routes: string[],
  ctx: PerfContext,
  options: { source: string; removedBy: string; since: string },
): BudgetEntry[] {
  const metrics = new Map(pages.map((page) => [page.url, measurePage(page, ctx)]));
  return routes.flatMap((route) => {
    const measured = metrics.get(route);
    if (!measured) return [];
    return (["html", "js", "css", "images", "requests"] as Metric[]).map(
      (metric): BudgetEntry => ({
        route,
        metric,
        limit: measured[metric],
        kind: "baseline",
        source: options.source,
        removedBy: options.removedBy,
        since: options.since,
      }),
    );
  });
}

/** Validates the shape of a configuration file; returns what is wrong, in words. */
export function checkPerfConfig(raw: unknown): { config?: PerfConfig; problems: string[] } {
  const problems: string[] = [];
  const object = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : undefined;
  if (!object) return { problems: ["the configuration is not a JSON object"] };
  if (object.schema !== 1) problems.push("schema must be 1");
  if (typeof object.staleTolerancePct !== "number" || object.staleTolerancePct < 0) problems.push("staleTolerancePct must be a number of 0 or more");
  if (object.regressionTolerancePct !== undefined && (typeof object.regressionTolerancePct !== "number" || object.regressionTolerancePct < 0)) problems.push("regressionTolerancePct must be a number of 0 or more");
  const images = object.images as { maxBytes?: unknown } | undefined;
  if (!images || typeof images.maxBytes !== "number" || images.maxBytes <= 0) problems.push("images.maxBytes must be a positive number");
  if (!object.pages || typeof object.pages !== "object") problems.push("pages must be an object");
  if (!Array.isArray(object.budgets)) problems.push("budgets must be a list");
  if (!Array.isArray(object.allow)) problems.push("allow must be a list");
  if (Array.isArray(object.budgets)) {
    object.budgets.forEach((entry, index) => {
      const e = entry as Partial<BudgetEntry>;
      if (!["html", "js", "css", "images", "requests"].includes(String(e.metric))) problems.push(`budgets[${index}].metric is not one of html, js, css, images, requests`);
      if (typeof e.limit !== "number" || e.limit < 0) problems.push(`budgets[${index}].limit must be a number of 0 or more`);
      if (e.kind !== "budget" && e.kind !== "baseline") problems.push(`budgets[${index}].kind must be budget or baseline`);
      if (typeof e.route !== "string" || !e.route.startsWith("/")) problems.push(`budgets[${index}].route must be a path`);
      if (typeof e.source !== "string" || e.source === "") problems.push(`budgets[${index}].source must say where the number comes from`);
    });
  }
  return problems.length > 0 ? { problems } : { config: raw as PerfConfig, problems };
}
