import { spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildPayload, classifyResponse, generateKey, submit, validateKey } from "./indexnow";

// BDD source: specs/*/0002-web-performance-search-copy-specialists/spec.md (AC-006).
// IndexNow tells search engines a URL changed. It is outward-facing, so the default is a dry run.

const KEY = "0123456789abcdef0123456789abcdef";
const URLS = ["https://nuxfire.com/", "https://nuxfire.com/blog"];

describe("the key (AC-006)", () => {
  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("accepts 8 to 128 letters, digits and dashes", () => {
    for (const key of ["abcdefgh", "A1-b2-C3-d4", "a".repeat(128), KEY]) expect(validateKey(key)).toEqual([]);
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("rejects a key of 7 or 129 characters and one with a character outside letters, digits and dashes", () => {
    for (const key of ["abcdefg", "a".repeat(129), "abcdefgh!", "abcd efgh", "abcdefgh_", "chave-çãõ-ok"]) {
      expect(validateKey(key).length, key).toBeGreaterThan(0);
    }
    expect(validateKey("")).not.toEqual([]);
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("generates a key that is valid", () => {
    const key = generateKey();
    expect(validateKey(key)).toEqual([]);
    expect(key).not.toBe(generateKey());
  });
});

describe("the payload (AC-006)", () => {
  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("names the host, the key, the key file and the URL list", () => {
    const payload = buildPayload({ origin: "https://nuxfire.com", key: KEY, urls: URLS });
    expect(payload).toEqual({
      host: "nuxfire.com",
      key: KEY,
      keyLocation: `https://nuxfire.com/${KEY}.txt`,
      urlList: URLS,
    });
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("refuses a URL that is not on the host, a duplicate, and more than 10000 URLs", () => {
    expect(() => buildPayload({ origin: "https://nuxfire.com", key: KEY, urls: ["https://other.com/"] })).toThrow(/host/);
    expect(buildPayload({ origin: "https://nuxfire.com", key: KEY, urls: [URLS[0], URLS[0]] }).urlList).toEqual([URLS[0]]);
    const many = Array.from({ length: 10_001 }, (_, i) => `https://nuxfire.com/p${i}`);
    expect(() => buildPayload({ origin: "https://nuxfire.com", key: KEY, urls: many })).toThrow(/10000/);
    expect(() => buildPayload({ origin: "https://nuxfire.com", key: KEY, urls: [] })).toThrow(/no URL/);
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("refuses an invalid key before building anything", () => {
    expect(() => buildPayload({ origin: "https://nuxfire.com", key: "short", urls: URLS })).toThrow(/key/);
  });
});

describe("the response codes (AC-006)", () => {
  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("treats 200 and 202 as accepted and the documented errors as failures with their meaning", () => {
    expect(classifyResponse(200).ok).toBe(true);
    expect(classifyResponse(202).ok).toBe(true);
    for (const [status, word] of [[400, "format"], [403, "key"], [422, "host"], [429, "many"]] as const) {
      const result = classifyResponse(status);
      expect(result.ok).toBe(false);
      expect(result.message.toLowerCase()).toContain(word);
    }
    expect(classifyResponse(500).ok).toBe(false);
  });
});

describe("dry run by default (AC-006)", () => {
  let server: Server;
  let endpoint = "";
  const requests: { method: string; body: string }[] = [];

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => {
        requests.push({ method: request.method ?? "", body });
        response.writeHead(202);
        response.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/indexnow`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("sends nothing unless submit is true, and returns the payload it would send", async () => {
    requests.length = 0;
    const result = await submit({ origin: "https://nuxfire.com", key: KEY, urls: URLS, endpoint, submit: false });
    expect(result.sent).toBe(false);
    expect(result.payload.urlList).toEqual(URLS);
    expect(requests).toHaveLength(0);
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("posts the payload as JSON once, only with submit true", async () => {
    requests.length = 0;
    const result = await submit({ origin: "https://nuxfire.com", key: KEY, urls: URLS, endpoint, submit: true });
    expect(result.sent).toBe(true);
    expect(result.status).toBe(202);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(JSON.parse(requests[0].body).key).toBe(KEY);
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("does not send when the key is invalid, even with submit true", async () => {
    requests.length = 0;
    await expect(submit({ origin: "https://nuxfire.com", key: "no", urls: URLS, endpoint, submit: true })).rejects.toThrow(/key/);
    expect(requests).toHaveLength(0);
  });
});

describe("indexnow command line (AC-006)", { timeout: 60_000 }, () => {
  const SCRIPT = join(import.meta.dirname, "indexnow.ts");
  const roots: string[] = [];
  afterAll(() => {
    for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  });

  function site(keyFileContent: string | null) {
    const root = mkdtempSync(join(tmpdir(), "indexnow-"));
    roots.push(root);
    const publicDir = join(root, "public");
    const output = join(root, "output");
    mkdirSync(join(output, "__sitemap__"), { recursive: true });
    writeFileSync(
      join(output, "__sitemap__/en-US.xml"),
      `<?xml version="1.0"?><urlset><url><loc>https://nuxfire.com/</loc></url><url><loc>https://nuxfire.com/blog</loc></url></urlset>`,
    );
    mkdirSync(publicDir, { recursive: true });
    if (keyFileContent !== null) writeFileSync(join(publicDir, `${KEY}.txt`), keyFileContent);
    return { publicDir, output };
  }

  function run(args: string[], env: Record<string, string> = {}) {
    const result = spawnSync(`bun "${SCRIPT}" ${args.join(" ")}`, {
      encoding: "utf8",
      shell: true,
      env: { ...process.env, ...env },
    });
    return { code: result.status, out: `${result.stdout}${result.stderr}` };
  }

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("prints the payload and the words dry run when --submit is absent", () => {
    const s = site(KEY);
    const { code, out } = run(["--origin", "https://nuxfire.com", "--public", s.publicDir, "--output", s.output], { INDEXNOW_KEY: KEY });
    expect(code).toBe(0);
    expect(out).toContain("dry run");
    expect(out).toContain('"urlList"');
    expect(out).toContain("https://nuxfire.com/blog");
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("fails when the key file is missing or does not contain the key", () => {
    const missing = site(null);
    expect(run(["--origin", "https://nuxfire.com", "--public", missing.publicDir, "--output", missing.output], { INDEXNOW_KEY: KEY }).code).toBe(1);
    const wrong = site("another-key-value");
    const { code, out } = run(["--origin", "https://nuxfire.com", "--public", wrong.publicDir, "--output", wrong.output], { INDEXNOW_KEY: KEY });
    expect(code).toBe(1);
    expect(out).toContain("key file");
  });

  // SPECSFY: US-002 FR-006 NFR-003 AC-006
  it("fails with --submit and no explicit --origin, and with a 7-character key", () => {
    const s = site(KEY);
    expect(run(["--submit", "--public", s.publicDir, "--output", s.output], { INDEXNOW_KEY: KEY }).code).toBe(1);
    const short = run(["--origin", "https://nuxfire.com", "--public", s.publicDir, "--output", s.output], { INDEXNOW_KEY: "abcdefg" });
    expect(short.code).toBe(1);
    expect(short.out).toContain("key");
  });
});
