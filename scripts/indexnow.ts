// IndexNow: tells Bing and the other participating search engines that URLs were added, changed
// or removed (SPEC-0002 FR-006). Bing's guidelines (sections 2 and 4) ask for it next to the
// sitemap. Protocol: https://www.indexnow.org/documentation
//
//   bun run indexnow -- --origin https://nuxfire.com                 (dry run: prints the payload)
//   bun run indexnow -- --origin https://nuxfire.com --submit        (sends it)
//   bun run indexnow -- --generate-key                               (prints a new key)
//
// It is outward-facing, so the default is a dry run and --submit needs an explicit --origin
// (NFR-003). The key comes from --key or INDEXNOW_KEY, and the key file `<key>.txt` must exist
// in apps/web/public with the key as its only content: that is how the engine checks that you
// own the site.
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSitemap } from "./seo-rules";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 10_000;

export interface Payload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/** 8 to 128 characters: letters, digits and dashes (indexnow.org/documentation). */
export function validateKey(key: string): string[] {
  if (key.length < 8 || key.length > 128) return [`the key has ${key.length} characters, IndexNow needs 8 to 128`];
  if (!/^[A-Za-z0-9-]+$/.test(key)) return ["the key may contain only letters, digits and dashes"];
  return [];
}

export const generateKey = (): string => randomBytes(16).toString("hex");

export function buildPayload(input: { origin: string; key: string; urls: string[] }): Payload {
  const problems = validateKey(input.key);
  if (problems.length > 0) throw new Error(`invalid key: ${problems[0]}`);
  const origin = new URL(input.origin);
  const urlList = [...new Set(input.urls)];
  if (urlList.length === 0) throw new Error("no URL to submit");
  if (urlList.length > MAX_URLS) throw new Error(`${urlList.length} URLs: a request takes at most ${MAX_URLS} (10000)`);
  for (const url of urlList) {
    if (new URL(url).host !== origin.host) throw new Error(`${url} is not on the host ${origin.host}`);
  }
  return { host: origin.host, key: input.key, keyLocation: `${origin.origin}/${input.key}.txt`, urlList };
}

/** What each documented status code means. */
export function classifyResponse(status: number): { ok: boolean; message: string } {
  switch (status) {
    case 200:
      return { ok: true, message: "200 OK: the URLs were submitted" };
    case 202:
      return { ok: true, message: "202 Accepted: the URLs were received and the key validation is pending" };
    case 400:
      return { ok: false, message: "400 Bad request: the payload has an invalid format" };
    case 403:
      return { ok: false, message: "403 Forbidden: the key is not valid, or the key file is missing or different" };
    case 422:
      return { ok: false, message: "422 Unprocessable: the URLs do not belong to the host, or the key does not match the schema" };
    case 429:
      return { ok: false, message: "429 Too many requests: potential spam, submit less often" };
    default:
      return { ok: false, message: `${status}: not a documented IndexNow answer` };
  }
}

export interface SubmitInput {
  origin: string;
  key: string;
  urls: string[];
  endpoint?: string;
  submit: boolean;
}

/** Builds the payload and, only when `submit` is true, posts it once. */
export async function submit(input: SubmitInput): Promise<{ sent: boolean; payload: Payload; status?: number }> {
  const payload = buildPayload(input);
  if (!input.submit) return { sent: false, payload };
  const response = await fetch(input.endpoint ?? INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return { sent: true, payload, status: response.status };
}

// ---------------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------------

if (import.meta.main) {
  const root = join(import.meta.dir, "..");
  const option = (name: string): string | undefined => {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? undefined : process.argv[index + 1];
  };
  const fail = (message: string): never => {
    console.error(`✗ ${message}`);
    process.exit(1);
  };

  if (process.argv.includes("--generate-key")) {
    const key = generateKey();
    console.log(`${key}\nPut it in apps/web/public/${key}.txt as the only content of the file, deploy, then run with INDEXNOW_KEY=${key}.`);
    process.exit(0);
  }

  const wantsSubmit = process.argv.includes("--submit");
  const origin = option("origin");
  if (wantsSubmit && !origin) fail("--submit needs an explicit --origin, for example --origin https://nuxfire.com");
  const site = origin ?? process.env.SITE_URL ?? "https://nuxfire.com";

  const key = option("key") ?? process.env.INDEXNOW_KEY ?? "";
  const keyProblems = validateKey(key);
  if (keyProblems.length > 0) fail(`invalid key: ${keyProblems[0]} (use --key or INDEXNOW_KEY; --generate-key makes one)`);

  const publicDir = option("public") ?? join(root, "apps/web/public");
  const keyFile = join(publicDir, `${key}.txt`);
  if (!existsSync(keyFile) || readFileSync(keyFile, "utf8").trim() !== key) {
    fail(`the key file ${keyFile} is missing or does not contain the key: the engine verifies ownership with it`);
  }

  const outputDir = option("output") ?? join(root, "apps/web/.output/public");
  const explicit = process.argv.flatMap((arg, index) => (arg === "--url" ? [process.argv[index + 1]] : []));
  const sitemapDir = join(outputDir, "__sitemap__");
  const fromSitemap = existsSync(sitemapDir)
    ? readdirSync(sitemapDir)
        .filter((name) => name.endsWith(".xml"))
        .flatMap((name) => parseSitemap(readFileSync(join(sitemapDir, name), "utf8")).map((entry) => entry.loc))
    : [];
  const urls = explicit.length > 0 ? explicit : fromSitemap.filter((url) => new URL(url).host === new URL(site).host);

  try {
    const result = await submit({ origin: site, key, urls, submit: wantsSubmit });
    if (!result.sent) {
      console.log(`dry run: ${result.payload.urlList.length} URL(s) for ${result.payload.host}, nothing was sent (add --submit and --origin to send).`);
      console.log(JSON.stringify(result.payload, null, 2));
      process.exit(0);
    }
    const verdict = classifyResponse(result.status ?? 0);
    console.log(`${verdict.ok ? "✓" : "✗"} ${verdict.message}`);
    process.exit(verdict.ok ? 0 : 1);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
