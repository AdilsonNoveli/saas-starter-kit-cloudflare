import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { gzipSync } from "node:zlib";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditLive, createSafeFetch } from "./seo-live";
import type { Violation } from "./seo-rules";

// BDD source: specs/*/0002-web-performance-search-copy-specialists/spec.md (AC-005, AC-006).
// The audit talks to a real HTTP server on a local port, so status codes, headers and the
// absence of redirects are what the audit really sees, not what a mock says.

interface Reply {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
}

let server: Server;
let origin = "";
let routes: Record<string, Reply> = {};
const seen: { method: string; host: string; url: string }[] = [];

const BIG = `<!DOCTYPE html><html><head><title>t</title></head><body>${"x".repeat(2_000)}</body></html>`;
const html = (extraHead = "", body = BIG): Reply => ({
  status: 200,
  headers: { "content-type": "text/html", "content-encoding": "gzip" },
  body: body.replace("<head>", `<head>${extraHead}`),
});

function sitemapOf(urls: string[]): string {
  return `<?xml version="1.0"?><urlset>${urls.map((u) => `<url><loc>${origin}${u}</loc></url>`).join("")}</urlset>`;
}

function baseRoutes(): Record<string, Reply> {
  return {
    "/robots.txt": { status: 200, headers: { "content-type": "text/plain" }, body: `User-agent: *\nSitemap: ${origin}/sitemap_index.xml\n` },
    "/sitemap_index.xml": {
      status: 200,
      headers: { "content-type": "application/xml" },
      body: `<?xml version="1.0"?><sitemapindex><sitemap><loc>${origin}/sitemap-a.xml</loc></sitemap></sitemapindex>`,
    },
    "/sitemap-a.xml": { status: 200, headers: { "content-type": "application/xml" }, body: sitemapOf(["/ok", "/second"]) },
    "/ok": html('<script src="/_nuxt/a.js"></script>'),
    "/second": html(),
    "/_nuxt/a.js": { status: 200, headers: { "content-type": "text/javascript", "cache-control": "public, max-age=31536000, immutable" }, body: "1" },
  };
}

function setRoutes(overrides: Record<string, Reply | null> = {}, sitemapUrls?: string[]): void {
  routes = baseRoutes();
  for (const [path, reply] of Object.entries(overrides)) {
    if (reply === null) delete routes[path];
    else routes[path] = reply;
  }
  if (sitemapUrls) routes["/sitemap-a.xml"] = { status: 200, headers: { "content-type": "application/xml" }, body: sitemapOf(sitemapUrls) };
}

function handle(request: IncomingMessage, response: ServerResponse): void {
  seen.push({ method: request.method ?? "", host: request.headers.host ?? "", url: request.url ?? "" });
  const reply = routes[(request.url ?? "").split("?")[0]];
  if (!reply) {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
    return;
  }
  response.writeHead(reply.status ?? 200, reply.headers ?? {});
  const body = reply.body ?? "";
  const gzipped = (reply.headers?.["content-encoding"] ?? "") === "gzip";
  response.end(request.method === "HEAD" ? undefined : gzipped ? gzipSync(body) : body);
}

beforeAll(async () => {
  server = createServer(handle);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const rules = (violations: Violation[]): string[] => [...new Set(violations.map((v) => v.rule))].sort();

describe("live status, redirects and legacy URLs (AC-005)", () => {
  // SPECSFY: US-002 FR-005 FR-007 NFR-003 AC-005
  it("passes a site whose sitemap URLs answer 200 without a redirect", async () => {
    setRoutes();
    const { violations, checked } = await auditLive({ origin });
    expect(violations).toEqual([]);
    expect(checked).toBe(2);
  });

  // SPECSFY: US-002 FR-005 FR-007 NFR-003 AC-005
  it("reports a sitemap URL that answers 307 and names the status and the target", async () => {
    setRoutes({ "/second": { status: 307, headers: { location: "/second/" } } });
    const { violations } = await auditLive({ origin });
    expect(rules(violations)).toEqual(["live-redirect-chain"]);
    expect(violations[0].where).toBe(`${origin}/second`);
    expect(violations[0].message).toContain("307");
    expect(violations[0].message).toContain("/second/");
  });

  // SPECSFY: US-002 FR-005 FR-007 NFR-003 AC-005
  it("reports a sitemap URL that answers 404 or 500 as live-status", async () => {
    setRoutes({ "/second": { status: 500 } }, ["/ok", "/second", "/missing"]);
    const { violations } = await auditLive({ origin });
    expect(rules(violations)).toEqual(["live-status"]);
    expect(violations).toHaveLength(2);
  });

  // SPECSFY: US-002 FR-005 FR-007 NFR-003 AC-005
  it("accepts a legacy URL that answers one 301 or 308 to a page that answers 200", async () => {
    setRoutes({ "/legacy": { status: 301, headers: { location: "/ok" } }, "/legacy2": { status: 308, headers: { location: `${origin}/ok` } } });
    const { violations } = await auditLive({ origin, legacy: [{ from: "/legacy" }, { from: "/legacy2" }] });
    expect(violations).toEqual([]);
  });

  // SPECSFY: US-002 FR-005 FR-007 NFR-003 AC-005
  it("rejects a legacy URL that is temporary, that chains, that has no target or that is a 200 stub", async () => {
    setRoutes({
      "/temp": { status: 307, headers: { location: "/ok" } },
      "/chain": { status: 301, headers: { location: "/hop" } },
      "/hop": { status: 301, headers: { location: "/ok" } },
      "/notarget": { status: 301 },
      "/stub": html('<meta http-equiv="refresh" content="0; url=/ok">'),
    });
    const { violations } = await auditLive({ origin, legacy: [{ from: "/temp" }, { from: "/chain" }, { from: "/notarget" }, { from: "/stub" }] });
    expect(rules(violations)).toEqual(["live-legacy-redirect"]);
    expect(violations).toHaveLength(4);
  });
});

describe("live headers and robots (AC-005)", () => {
  // SPECSFY: US-002 FR-005 NFR-003 AC-005
  it("requires robots.txt to answer 200 and to list a sitemap of the origin", async () => {
    setRoutes({ "/robots.txt": { status: 200, body: "User-agent: *\nDisallow:\n" } });
    expect(rules((await auditLive({ origin })).violations)).toEqual(["live-robots"]);
    setRoutes({ "/robots.txt": null });
    expect(rules((await auditLive({ origin })).violations)).toEqual(["live-robots"]);
    setRoutes({ "/robots.txt": { status: 200, body: `Sitemap: ${origin}/sitemap_index.xml\n` } });
    expect((await auditLive({ origin })).violations).toEqual([]);
  });

  // SPECSFY: US-002 FR-005 NFR-003 AC-005
  it("reports an HTML page of 1 KB or more that is not compressed", async () => {
    setRoutes({ "/second": { status: 200, headers: { "content-type": "text/html" }, body: BIG } });
    const { violations } = await auditLive({ origin });
    expect(rules(violations)).toEqual(["live-compression"]);
    expect(violations[0].where).toBe(`${origin}/second`);
  });

  // SPECSFY: US-002 FR-005 NFR-003 AC-005
  it("requires the immutable, year-long cache of the assets a page references under /_nuxt/", async () => {
    for (const cache of ["public, max-age=31536000", "public, max-age=3600, immutable", "no-store"]) {
      setRoutes({ "/_nuxt/a.js": { status: 200, headers: { "content-type": "text/javascript", "cache-control": cache }, body: "1" } });
      expect(rules((await auditLive({ origin })).violations)).toEqual(["live-immutable-cache"]);
    }
  });

  // SPECSFY: US-002 FR-005 NFR-003 AC-005
  it("reports a sitemap URL that asks not to be indexed, by header or by meta", async () => {
    setRoutes({
      "/ok": { ...html('<script src="/_nuxt/a.js"></script>'), headers: { "content-type": "text/html", "content-encoding": "gzip", "x-robots-tag": "noindex" } },
      "/second": html('<meta name="robots" content="noindex, nofollow">'),
    });
    const { violations } = await auditLive({ origin });
    expect(rules(violations)).toEqual(["live-noindex-listed"]);
    expect(violations).toHaveLength(2);
  });
});

describe("the audit is read-only and stays on the given origin (AC-005, AC-006)", () => {
  // SPECSFY: US-002 FR-005 FR-006 NFR-003 AC-005 AC-006
  it("sends only GET and HEAD requests and only to the origin it was given", async () => {
    setRoutes({ "/legacy": { status: 301, headers: { location: "/ok" } } });
    seen.length = 0;
    await auditLive({ origin, legacy: [{ from: "/legacy" }] });
    expect(seen.length).toBeGreaterThan(3);
    expect(seen.every((r) => r.method === "GET" || r.method === "HEAD")).toBe(true);
    expect(new Set(seen.map((r) => r.host))).toEqual(new Set([new URL(origin).host]));
  });

  // SPECSFY: US-002 FR-005 FR-006 NFR-003 AC-005 AC-006
  it("refuses a method other than GET and HEAD and a URL on another origin", async () => {
    const safe = createSafeFetch(origin);
    await expect(safe(`${origin}/ok`, { method: "POST" })).rejects.toThrow(/GET or HEAD/);
    await expect(safe(`${origin}/ok`, { method: "DELETE" })).rejects.toThrow(/GET or HEAD/);
    await expect(safe("https://example.com/", { method: "GET" })).rejects.toThrow(/origin/);
    setRoutes();
    expect((await safe(`${origin}/ok`, { method: "HEAD" })).status).toBe(200);
  });

  // SPECSFY: US-002 FR-005 FR-006 NFR-003 AC-005 AC-006
  it("rejects an origin that is not an http(s) origin before sending anything", async () => {
    seen.length = 0;
    await expect(auditLive({ origin: "not a url" })).rejects.toThrow(/origin/);
    await expect(auditLive({ origin: "ftp://example.com" })).rejects.toThrow(/origin/);
    await expect(auditLive({ origin: `${origin}/some/path` })).rejects.toThrow(/origin/);
    expect(seen).toHaveLength(0);
  });
});

describe("check:seo --live command line (AC-005, AC-006)", { timeout: 60_000 }, () => {
  const SCRIPT = join(import.meta.dirname, "check-seo.ts");
  // The fixture server lives in this process: a synchronous spawn would block its event loop
  // and the command line would wait for an answer that can never come.
  function run(args: string[]): Promise<{ code: number | null; out: string }> {
    return new Promise((resolve) => {
      // The repository's own _redirects would add legacy URLs that the fixture server does not serve.
      const isolated = [...args, "--redirects", `"${join(import.meta.dirname, "no-such-redirects-file")}"`];
      const child = spawn(`bun "${SCRIPT}" ${isolated.join(" ")}`, { shell: true });
      let out = "";
      child.stdout.on("data", (chunk) => (out += chunk));
      child.stderr.on("data", (chunk) => (out += chunk));
      child.on("close", (code) => resolve({ code, out }));
    });
  }

  // SPECSFY: US-002 FR-005 FR-006 NFR-003 AC-005 AC-006
  it("fails without an origin, before any request", async () => {
    seen.length = 0;
    const { code, out } = await run(["--live"]);
    expect(code).not.toBe(0);
    expect(out).toContain("origin");
    expect(seen).toHaveLength(0);
  });

  // SPECSFY: US-002 FR-005 NFR-003 AC-005
  it("exits 0 on a clean origin and 1 with the rule name on a redirected sitemap URL", async () => {
    setRoutes();
    expect((await run(["--live", origin])).code).toBe(0);
    setRoutes({ "/second": { status: 307, headers: { location: "/second/" } } });
    const bad = await run(["--live", origin]);
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("[live-redirect-chain]");
  });
});
