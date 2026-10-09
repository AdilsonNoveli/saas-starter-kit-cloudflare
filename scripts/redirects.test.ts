import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRedirects, validateRedirects } from "./redirects";

// BDD source: specs/*/0002-web-performance-search-copy-specialists/spec.md (AC-004, AC-005).
// Cloudflare Workers Static Assets reads redirects from a `_redirects` file and answers them
// with the given status code; the default status is 302, which Bing accepts only for changes
// shorter than two days. A permanent move must say 301 or 308.

const ROOT = join(import.meta.dirname, "..");

describe("parsing _redirects (AC-004)", () => {
  // SPECSFY: US-002 FR-007 NFR-001 AC-004
  it("reads source, destination and status, skipping blank lines and comments", () => {
    const { entries, problems } = parseRedirects("# legacy\n\n/a /b 301\n/c https://x.test/d 308\n");
    expect(problems).toEqual([]);
    expect(entries).toEqual([
      { from: "/a", to: "/b", status: 301, line: 3 },
      { from: "/c", to: "https://x.test/d", status: 308, line: 4 },
    ]);
  });

  // SPECSFY: US-002 FR-007 NFR-001 AC-004
  it("reports a line that is not `source destination status`", () => {
    const { problems } = parseRedirects("/only-one\n/a /b 301 extra\nrelative /b 301\n");
    expect(problems.map((v) => v.rule)).toEqual(["redirect-syntax", "redirect-syntax", "redirect-syntax"]);
  });
});

describe("validating _redirects (AC-004, AC-005)", () => {
  const rules = (text: string): string[] => [...new Set(validateRedirects(text).map((v) => v.rule))].sort();

  // SPECSFY: US-002 FR-007 NFR-001 AC-004 AC-005
  it("accepts 301 and 308 only", () => {
    expect(rules("/a /b 301\n/c /d 308\n")).toEqual([]);
    expect(rules("/a /b 302\n")).toEqual(["redirect-status"]);
    expect(rules("/a /b 307\n")).toEqual(["redirect-status"]);
    expect(rules("/a /b 200\n")).toEqual(["redirect-status"]);
  });

  // SPECSFY: US-002 FR-007 NFR-001 AC-004 AC-005
  it("rejects a redirect with no status, because Cloudflare would use 302", () => {
    expect(rules("/a /b\n")).toEqual(["redirect-status"]);
  });

  // SPECSFY: US-002 FR-007 NFR-001 AC-004 AC-005
  it("rejects a duplicated source, a redirect to itself and a chain", () => {
    expect(rules("/a /b 301\n/a /c 301\n")).toEqual(["redirect-duplicate"]);
    expect(rules("/a /a 301\n")).toEqual(["redirect-loop"]);
    expect(rules("/a /b 301\n/b /c 301\n")).toEqual(["redirect-chain"]);
  });
});

describe("the redirects of this site (AC-004, AC-005)", () => {
  const file = join(ROOT, "apps/web/public/_redirects");
  const legacy = [
    "/docs/pro",
    "/docs/nuxfire",
    "/docs/production",
    ...["pt-br", "es"].flatMap((locale) => ["license", "privacy-policy", "terms-of-service"].map((page) => `/${locale}/${page}`)),
  ];

  // SPECSFY: US-002 FR-007 NFR-001 AC-004 AC-005
  it("has a valid _redirects file in apps/web/public", () => {
    const text = readFileSync(file, "utf8");
    expect(validateRedirects(text)).toEqual([]);
  });

  // SPECSFY: US-002 FR-007 NFR-001 AC-004 AC-005
  it("redirects every legacy path once, permanently", () => {
    const { entries } = parseRedirects(readFileSync(file, "utf8"));
    for (const path of legacy) {
      const found = entries.filter((entry) => entry.from === path);
      expect(found, path).toHaveLength(1);
      expect([301, 308]).toContain(found[0].status);
    }
  });

  // SPECSFY: US-002 FR-007 NFR-001 AC-004 AC-005
  it("no longer declares redirect route rules that prerender a meta refresh page", () => {
    const config = readFileSync(join(ROOT, "apps/web/nuxt.config.ts"), "utf8");
    expect(config).not.toMatch(/redirect\s*:/);
  });
});
