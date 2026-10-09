import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0009 (Fase 3a). One source per security primitive: HMAC-SHA256, the
// fixed-window rate limit and the constant-time secret comparison live only in
// packages/crypto and packages/rate-limit, every consumer imports them, and the
// documents that describe the code follow the new structure.
const root = join(import.meta.dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");
const toPosix = (path: string) => path.replace(/\\/g, "/");

// Tracked files plus new, not-ignored ones (a copy added before its first commit
// is still a copy), minus files deleted from the working tree but not yet staged.
const repoFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => file && existsSync(join(root, file)));

const SOURCE = /\.(ts|tsx|mts|js|mjs|vue)$/;
const SCOPE = /^(apps|layers|packages)\//;
const SKIPPED = [
  /(^|\/)node_modules\//,
  /^fireskills\//,
  /^apps\/web\/content\//,
  /^packages\/crypto\//,
  /^packages\/rate-limit\//,
  /^scripts\/primitives-policy\.test\.ts$/,
  /\.d\.ts$/,
];

const scanned = repoFiles.filter(
  (file) => SCOPE.test(file) && SOURCE.test(file) && !SKIPPED.some((skip) => skip.test(file)),
);

const PRIMITIVES: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "HMAC importKey", pattern: /importKey\s*\([\s\S]{0,300}?["']HMAC["']/ },
  { name: "fixed-window key", pattern: /ratelimit:\$\{/ },
  { name: "fixed-window id", pattern: /Math\.floor\(\s*Date\.now\(\)\s*\/\s*1000\s*\//i },
  { name: "hand-written secretsMatch", pattern: /(?:function\s+secretsMatch\b|(?:const|let)\s+secretsMatch\s*=)/ },
  { name: "hand-written constant-time loop", pattern: /\|=\s*[\w.]+\.charCodeAt\([^)]*\)\s*\^/ },
];

function primitiveCopies(files: readonly string[]): string[] {
  return files.flatMap((file) => {
    const text = read(file);
    return PRIMITIVES.filter(({ pattern }) => pattern.test(text)).map(({ name }) => `${file} (${name})`);
  });
}

describe("AC-005: no copy of the primitives outside packages/crypto and packages/rate-limit", () => {
  // SPECSFY: US-001 US-002 FR-002 NFR-002 AC-005
  it("scans the tracked sources of apps, layers and packages", () => {
    expect(scanned.length).toBeGreaterThan(300);
    // The packages that own the primitives are exempt, so they must exist for the
    // exemption to mean anything.
    expect(existsSync(join(root, "packages/crypto/index.ts")), "packages/crypto/index.ts").toBe(true);
    expect(existsSync(join(root, "packages/rate-limit/index.ts")), "packages/rate-limit/index.ts").toBe(true);
  });

  // SPECSFY: US-001 US-002 FR-002 NFR-002 AC-005
  it("finds no HMAC importKey, fixed-window algorithm or constant-time comparison outside the packages", () => {
    // The patterns must catch each primitive, or the scan below would pass vacuously.
    const samples = [
      'await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);',
      "const kvKey = `ratelimit:${key}:${windowId}`;",
      "const windowId = Math.floor(Date.now() / 1000 / window);",
      "function secretsMatch(a: string, b: string) { return a === b; }",
      "for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);",
    ];
    for (const [index, sample] of samples.entries()) {
      expect(PRIMITIVES[index]?.pattern.test(sample), PRIMITIVES[index]?.name).toBe(true);
    }
    const aes = 'crypto.subtle.importKey("raw", d, { name: "AES-GCM" }, false, ["encrypt"])';
    expect(PRIMITIVES.some(({ pattern }) => pattern.test(aes))).toBe(false);

    // Joined so a failure prints every offending file, not a truncated array.
    expect(primitiveCopies(scanned).join("\n")).toBe("");
  });
});

const CONTEXT_DOCS = [".fireskills/PROJECT.md", ".fireskills/STACK.md", ".fireskills/DATABASE.md", ".fireskills/PACKAGES.md"];
const NEW_STRUCTURE = ["layers/account", "packages/crypto", "packages/rate-limit"];

describe("AC-025: project documents describe the new structure", () => {
  // SPECSFY: FR-008 NFR-006 AC-025
  it("PROJECT, STACK, DATABASE and PACKAGES mention layers/account, packages/crypto and packages/rate-limit", () => {
    const missing = CONTEXT_DOCS.flatMap((doc) => {
      const text = read(doc);
      return NEW_STRUCTURE.filter((path) => !text.includes(path)).map((path) => `${doc} lacks ${path}`);
    });
    expect(missing.join("\n")).toBe("");
  });

  // SPECSFY: FR-008 NFR-006 AC-025
  it("PROJECT.md no longer says account and the MFA helpers live in apps/app", () => {
    const project = read(".fireskills/PROJECT.md");
    expect(project).not.toContain("Account and profile, still inside `apps/app`");
    expect(project).not.toContain("through Nitro auto-import from `apps/app`");
  });
});

// Comment and documentation text is compared with comment markers stripped and
// whitespace collapsed, so a sentence wrapped across `//` lines still matches.
function prose(file: string): string {
  return read(file)
    .replace(/^\s*(?:\/\*\*?|\*\/|\*|\/\/)\s?/gm, "")
    .replace(/\s+/g, " ");
}

const STALE_CLAIMS: ReadonlyArray<{ file: string; claims: readonly string[] }> = [
  {
    file: "apps/functions/src/auth.ts",
    claims: [
      "The subject each token is filed under is a hash of the properties",
      "match on the email each record carries",
      "Matching on `properties.email`",
      "revoking every other one filed under the same email",
    ],
  },
  {
    file: "layers/admin/server/database/schema.ts",
    claims: ["apps/app/server/utils/mfa-crypto.ts", "stays in the Composition Root"],
  },
  {
    file: "fireskills/specialists/fireskill-specialist-openauth/references/nuxfire-openauth.md",
    claims: ["Revocation matches by `properties.email`", "(not subject hash)"],
  },
];

describe("AC-026: comments and the OpenAuth reference no longer state the old behaviour", () => {
  // SPECSFY: FR-008 AC-026
  it("no text claims the hashed subject or revocation by e-mail", () => {
    const found = STALE_CLAIMS.flatMap(({ file, claims }) => {
      const text = prose(file);
      return claims.filter((claim) => text.includes(claim)).map((claim) => `${file}: "${claim}"`);
    });
    expect(found.join("\n")).toBe("");
  });

  // SPECSFY: FR-008 AC-026
  it("auth.ts no longer revokes by comparing the e-mail carried in each session record", () => {
    const auth = read("apps/functions/src/auth.ts");
    expect(auth).not.toMatch(/properties\?\.email\?\.toLowerCase\(\)\s*===\s*email/);
    expect(auth).not.toMatch(/Storage\.scan\(\s*storage\s*,\s*\[\s*["']oauth:refresh["']\s*\]\s*\)/);
  });
});

// Paths this spec moves out of apps/app. rate-limit.ts may stay as the h3 wrapper
// (assertNotRateLimited, AC-009), so it is only required to exist if it is cited.
const MOVED = [
  "apps/app/server/utils/mfa-crypto.ts",
  "apps/app/server/utils/mfa-recovery.ts",
  "apps/app/server/utils/ws-ticket.ts",
  "apps/app/server/trpc/routers/account.ts",
];
const WATCHED = [...MOVED, "apps/app/server/utils/rate-limit.ts"];

function walkMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(path);
    return entry.name.endsWith(".md") ? [toPosix(relative(root, path))] : [];
  });
}

function documentsToCheck(): string[] {
  const layerReadmes = readdirSync(join(root, "layers"))
    .map((name) => `layers/${name}/README.md`)
    .filter((file) => existsSync(join(root, file)));
  return [...walkMarkdown(join(root, ".fireskills")), ...walkMarkdown(join(root, "docs")), ...layerReadmes];
}

/** `a/{b,c}.ts` -> `a/b.ts`, `a/c.ts` (one brace group, the form the docs use). */
function expandBraces(path: string): string[] {
  const match = /^(.*)\{([^}]+)\}(.*)$/.exec(path);
  if (!match) return [path];
  return match[2].split(",").flatMap((part) => expandBraces(`${match[1]}${part.trim()}${match[3]}`));
}

function citedWatchedPaths(file: string): string[] {
  const text = read(file);
  const tokens = text.match(/apps\/app\/server\/(?:utils|trpc\/routers)\/[\w{},.\-/]+/g) ?? [];
  const cited = new Set(tokens.flatMap(expandBraces).map((token) => token.replace(/[.,]+$/, "")));
  return WATCHED.filter((path) => cited.has(path));
}

describe("AC-027: no document cites a path that stopped existing", () => {
  // SPECSFY: FR-008 AC-027
  it("the moved files are gone from apps/app and every citation in .fireskills, docs and layer READMEs exists", () => {
    const stillThere = MOVED.filter((path) => existsSync(join(root, path))).map((path) => `${path} still exists`);
    const dangling = documentsToCheck().flatMap((doc) =>
      citedWatchedPaths(doc)
        .filter((path) => MOVED.includes(path) || !existsSync(join(root, path)))
        .map((path) => `${doc} cites ${path}`),
    );
    expect([...stillThere, ...dangling].join("\n")).toBe("");
  });

  // SPECSFY: FR-008 AC-027
  it("the apps/web docs, in every language, describe the rate limit and the language page where they now live", () => {
    for (const root of ["apps/web/content", "apps/web/content/es", "apps/web/content/pt-br"]) {
      const docs = `${root}/docs/1.saas-starter-kit`;
      expect(read(`${docs}/2.features/10.rate-limiting.md`), root).toContain("packages/rate-limit");
      expect(read(`${docs}/3.concepts/2.nuxt-hub.md`), root).toContain("packages/rate-limit");
      const i18n = read(`${docs}/2.features/9.internationalization.md`);
      expect(i18n, root).toContain("layers/account/app/pages/account-settings/appearance.vue");
      expect(i18n, root).not.toContain("apps/app/app/pages/account-settings/appearance.vue");
    }
  });

  // SPECSFY: FR-008 AC-027
  it("expands the brace form the documents use (the citation scan is not vacuous)", () => {
    expect(expandBraces("apps/app/server/utils/{mfa-crypto,ws-ticket}.ts")).toEqual([
      "apps/app/server/utils/mfa-crypto.ts",
      "apps/app/server/utils/ws-ticket.ts",
    ]);
    expect(documentsToCheck()).toContain(".fireskills/PROJECT.md");
    expect(documentsToCheck().some((doc) => doc.startsWith("layers/account/"))).toBe(true);
  });
});

const PURE_PACKAGES = ["packages/crypto", "packages/rate-limit"];
const ALLOWED_SPECIFIERS = new Set(["@nuxfire/crypto", "@nuxfire/rate-limit", "@cloudflare/workers-types"]);
const ALLOWED_RUNTIME_DEPENDENCIES = new Set(["@nuxfire/crypto", "@nuxfire/rate-limit", "@cloudflare/workers-types"]);
// Nitro/Nuxt globals that would make a package depend on the app without an import.
const NITRO_GLOBALS = /\b(?:useDB|hubKV|hubBlob|useRuntimeConfig|getRequestIP|createError|defineEventHandler)\s*\(/;

function packageSources(dir: string): string[] {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return [];
  const walk = (current: string): string[] =>
    readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === "node_modules") return [];
      const path = join(current, entry.name);
      if (entry.isDirectory()) return walk(path);
      return /\.(ts|mts|js|mjs)$/.test(entry.name) && !entry.name.endsWith(".d.ts") && !/^vitest\.config\./.test(entry.name)
        ? [path]
        : [];
    });
  return walk(absolute);
}

function importSpecifiers(source: string): string[] {
  const specifiers = [
    ...source.matchAll(/(?:^|[\s;])(?:import|export)\s[^;]*?\sfrom\s*["']([^"']+)["']/g),
    ...source.matchAll(/(?:^|[\s;])import\s*["']([^"']+)["']/g),
    ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
    ...source.matchAll(/\/\/\/\s*<reference\s+types=["']([^"']+)["']/g),
  ];
  return specifiers.map((match) => match[1]);
}

// The shipped code of a package, without its tests: a test may read its fixtures
// with node:fs, the code that consumers bundle may not.
function packageCode(dir: string): string[] {
  return packageSources(dir).filter((file) => !/\.test\.(ts|mts)$/.test(file));
}

function impurities(dir: string): string[] {
  const packageRoot = join(root, dir);
  return packageCode(dir).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const name = toPosix(relative(root, file));
    const found = importSpecifiers(source)
      .filter((specifier) => {
        if (specifier.startsWith(".")) {
          const target = resolve(dirname(file), specifier);
          return !target.startsWith(packageRoot);
        }
        return !ALLOWED_SPECIFIERS.has(specifier);
      })
      .map((specifier) => `${name} imports ${specifier}`);
    if (NITRO_GLOBALS.test(source)) found.push(`${name} calls a Nitro/Nuxt global`);
    return found;
  });
}

describe("AC-028: packages/crypto and packages/rate-limit are pure", () => {
  // SPECSFY: US-001 US-002 NFR-003 AC-028
  it("both packages exist with source files to inspect", () => {
    for (const dir of PURE_PACKAGES) {
      expect(packageCode(dir).length, `${dir} source files`).toBeGreaterThan(0);
      expect(existsSync(join(root, dir, "index.ts")), `${dir}/index.ts`).toBe(true);
    }
  });

  // SPECSFY: US-001 US-002 NFR-003 AC-028
  it("import only Web Crypto, Cloudflare types and each other", () => {
    // The import reader must flag h3, Nitro, database and layer imports, or the
    // check below would pass vacuously.
    const sample = [
      'import { createError } from "h3";',
      'import { users } from "@nuxfire/functions/schema";',
      'import type { Thing } from "@nuxfire/layer-account/server/utils/mfa-recovery";',
      'export { hmacSha256 } from "@nuxfire/crypto";',
    ].join("\n");
    const disallowed = importSpecifiers(sample).filter((specifier) => !ALLOWED_SPECIFIERS.has(specifier));
    expect(disallowed).toEqual(["h3", "@nuxfire/functions/schema", "@nuxfire/layer-account/server/utils/mfa-recovery"]);
    expect(NITRO_GLOBALS.test("const db = useDB();")).toBe(true);

    // A package with no code to read would pass vacuously, so it counts as a finding.
    const found = PURE_PACKAGES.flatMap((dir) => {
      if (packageCode(dir).length === 0) return [`${dir} has no source file to inspect`];
      return impurities(dir);
    });
    expect(found.join("\n")).toBe("");
  });

  // SPECSFY: US-001 US-002 NFR-003 AC-028
  it("declare no runtime dependency beyond each other and Cloudflare types", () => {
    const found = PURE_PACKAGES.flatMap((dir) => {
      const manifest = join(root, dir, "package.json");
      if (!existsSync(manifest) || !statSync(manifest).isFile()) return [`${dir}/package.json does not exist`];
      const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { dependencies?: Record<string, string> };
      return Object.keys(pkg.dependencies ?? {})
        .filter((dependency) => !ALLOWED_RUNTIME_DEPENDENCIES.has(dependency))
        .map((dependency) => `${dir} depends on ${dependency}`);
    });
    expect(found.join("\n")).toBe("");
  });
});

describe("AC-030: the aggregator runs the new packages' suites", () => {
  const aggregator = read("vitest.config.mts");

  // SPECSFY: NFR-003 NFR-006 AC-030
  it("vitest.config.mts lists packages/crypto and packages/rate-limit next to packages/tokens and scripts", () => {
    // Each listed entry must be a Vitest project with tests, or listing it runs nothing.
    const found = PURE_PACKAGES.flatMap((dir) => {
      const problems: string[] = [];
      if (!existsSync(join(root, dir, "vitest.config.ts"))) problems.push(`${dir}/vitest.config.ts is missing`);
      const tests = packageSources(dir).filter((file) => /\.test\.(ts|mts)$/.test(file));
      if (tests.length === 0) problems.push(`${dir} has no *.test.ts`);
      return problems;
    });
    expect(found.join("\n")).toBe("");
    for (const entry of ['"packages/crypto"', '"packages/rate-limit"', '"packages/tokens"', '"scripts"']) {
      expect(aggregator, entry).toContain(entry);
    }
  });
});
