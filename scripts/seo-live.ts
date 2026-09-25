import { attributes, tagPattern } from "./html-scan";
import type { Violation } from "./seo-rules";

// Live HTTP audit (`check:seo --live <origin>`, SPEC-0002 FR-005). What a search engine sees is
// the HTTP answer, not the file in the build: Cloudflare Workers Static Assets serves folder
// index pages with a trailing slash by default and answers the URL without it with a 307, and a
// meta-refresh page is a 200. Neither is visible in `.output`, so this audit asks the origin.
//
// It is read-only by construction (NFR-003): a fetcher that refuses any method but GET and HEAD
// and any URL outside the origin it was given.

export type Fetcher = (url: string, init?: { method?: string; headers?: Record<string, string> }) => Promise<Response>;

export interface LiveOptions {
  /** `https://nuxfire.com`: scheme and host, no path. */
  origin: string;
  /** The origin the sitemap declares, when the audited origin is a copy (a local `wrangler dev`). */
  sitemapOrigin?: string;
  /** Legacy URLs that must answer one permanent redirect (from `_redirects`). */
  legacy?: { from: string; to?: string }[];
  fetcher?: Fetcher;
  concurrency?: number;
}

const IMMUTABLE_MIN_SECONDS = 31_536_000;
const COMPRESSION_MIN_BYTES = 1024;
const MAX_ASSETS = 5;

/** Validates that `value` is an http(s) origin and returns it normalised; throws otherwise. */
export function parseOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`origin "${value}" is not a URL: use scheme and host, for example https://nuxfire.com`);
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`origin "${value}" must be an http(s) origin without a path, for example https://nuxfire.com`);
  }
  return url.origin;
}

/** A fetch that can only GET or HEAD, only inside `origin`, and never follows a redirect. */
export function createSafeFetch(origin: string, impl: typeof fetch = fetch): Fetcher {
  const allowed = parseOrigin(origin);
  return async (url, init = {}) => {
    const method = (init.method ?? "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") throw new Error(`the live audit sends GET or HEAD only, not ${method}`);
    if (new URL(url).origin !== allowed) throw new Error(`${url} is outside the origin ${allowed}`);
    return impl(url, { method, headers: init.headers, redirect: "manual" });
  };
}

const violation = (rule: string, where: string, message: string): Violation => ({ rule, where, message });

const locs = (xml: string): string[] => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

async function inBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) results.push(...(await Promise.all(items.slice(i, i + size).map(work))));
  return results;
}

function maxAge(cacheControl: string | null): number | undefined {
  const value = cacheControl?.match(/max-age\s*=\s*(\d+)/i)?.[1];
  return value === undefined ? undefined : Number(value);
}

export async function auditLive(options: LiveOptions): Promise<{ violations: Violation[]; checked: number }> {
  const origin = parseOrigin(options.origin);
  const sitemapOrigin = options.sitemapOrigin ? parseOrigin(options.sitemapOrigin) : origin;
  const request = options.fetcher ?? createSafeFetch(origin);
  const violations: Violation[] = [];
  const at = (path: string): string => `${origin}${path}`;

  // robots.txt and the sitemap it lists
  const robots = await request(at("/robots.txt"));
  let sitemapUrls: string[] = [];
  if (robots.status !== 200) {
    violations.push(violation("live-robots", at("/robots.txt"), `answers ${robots.status}, not 200`));
  } else {
    const text = await robots.text();
    sitemapUrls = [...text.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);
    if (!sitemapUrls.some((url) => url.startsWith(`${sitemapOrigin}/`))) {
      violations.push(violation("live-robots", at("/robots.txt"), `lists no Sitemap of ${sitemapOrigin}`));
    }
  }
  if (sitemapUrls.length === 0) sitemapUrls = [`${sitemapOrigin}/sitemap_index.xml`];

  const toAudited = (url: string): string | undefined => (url.startsWith(`${sitemapOrigin}/`) || url === sitemapOrigin ? `${origin}${url.slice(sitemapOrigin.length)}` : undefined);

  const pages = new Set<string>();
  const queue = sitemapUrls.map(toAudited).filter((url): url is string => url !== undefined);
  const visited = new Set<string>();
  while (queue.length > 0) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    const response = await request(url);
    if (response.status !== 200) {
      violations.push(violation("live-status", url, `the sitemap answers ${response.status}, not 200`));
      continue;
    }
    const body = await response.text();
    for (const loc of locs(body)) {
      const mapped = toAudited(loc);
      if (mapped === undefined) {
        violations.push(violation("live-status", loc, `the sitemap lists a URL that is not on ${sitemapOrigin}; pass the origin the sitemap declares to audit a copy`));
      } else if (/<sitemapindex/i.test(body)) queue.push(mapped);
      else pages.add(mapped);
    }
  }

  // every sitemap URL answers 200 without a redirect, is compressed, is indexable
  const assets = new Set<string>();
  const concurrency = options.concurrency ?? 6;
  await inBatches([...pages], concurrency, async (url) => {
    const response = await request(url);
    if (response.status >= 300 && response.status < 400) {
      violations.push(violation("live-redirect-chain", url, `the sitemap lists a URL that answers ${response.status} to ${response.headers.get("location") ?? "(no location)"}: list the URL that answers 200`));
      return;
    }
    if (response.status !== 200) {
      violations.push(violation("live-status", url, `answers ${response.status}, not 200`));
      return;
    }
    const html = await response.text();
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("text/html")) {
      if (Buffer.byteLength(html) >= COMPRESSION_MIN_BYTES && !response.headers.get("content-encoding")) {
        violations.push(violation("live-compression", url, `an HTML page of ${Buffer.byteLength(html)} bytes is sent without content-encoding`));
      }
      const robotsMeta = (html.match(tagPattern("meta")) ?? []).map(attributes).find((a) => a.name?.toLowerCase() === "robots");
      if (/noindex/i.test(response.headers.get("x-robots-tag") ?? "") || /noindex/i.test(robotsMeta?.content ?? "")) {
        violations.push(violation("live-noindex-listed", url, "the sitemap lists a page that asks not to be indexed"));
      }
      for (const tag of [...(html.match(tagPattern("script")) ?? []), ...(html.match(tagPattern("link")) ?? [])]) {
        const attrs = attributes(tag);
        const ref = attrs.src ?? attrs.href;
        if (ref?.startsWith("/_nuxt/")) assets.add(`${origin}${ref}`);
      }
    }
  });

  // immutable, year-long cache on hashed assets
  for (const url of [...assets].sort().slice(0, MAX_ASSETS)) {
    const response = await request(url, { method: "HEAD" });
    const cache = response.headers.get("cache-control");
    if (response.status !== 200 || !/immutable/i.test(cache ?? "") || (maxAge(cache) ?? 0) < IMMUTABLE_MIN_SECONDS) {
      violations.push(violation("live-immutable-cache", url, `cache-control is "${cache ?? "absent"}" (status ${response.status}): a hashed asset needs "immutable" and max-age of at least ${IMMUTABLE_MIN_SECONDS}`));
    }
  }

  // legacy URLs: one permanent redirect to a page that answers 200
  for (const legacy of options.legacy ?? []) {
    const url = at(legacy.from);
    const first = await request(url);
    const location = first.headers.get("location");
    if (first.status !== 301 && first.status !== 308) {
      violations.push(violation("live-legacy-redirect", url, `answers ${first.status}: a moved URL must answer 301 or 308`));
      continue;
    }
    if (!location) {
      violations.push(violation("live-legacy-redirect", url, `answers ${first.status} without a Location`));
      continue;
    }
    const target = new URL(location, origin);
    if (legacy.to && target.pathname !== legacy.to) {
      violations.push(violation("live-legacy-redirect", url, `redirects to ${target.pathname}, expected ${legacy.to}`));
      continue;
    }
    const second = await request(target.toString());
    if (second.status !== 200) {
      violations.push(violation("live-legacy-redirect", url, `redirects to ${target.pathname}, which answers ${second.status}: the redirect must reach a page in one hop`));
    }
  }

  return { violations, checked: pages.size };
}
