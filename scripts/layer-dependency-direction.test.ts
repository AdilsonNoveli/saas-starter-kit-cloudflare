import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { layers } from "../config";

// SPECSFY: AC-008, AC-009, AC-010
//
// A base layer (config.ts's `layers.core`, plus core-schema.ts) must never
// import a feature layer (`layers.features`) — only the reverse direction is
// allowed. This is what makes a feature layer safely removable: if the base
// never references it, turning it off in config.ts cannot break the base.
// The feature list is read from config.ts, not hardcoded, so a new feature
// layer is covered automatically (AC-010) without editing this file.

const SKIP = new Set(["node_modules", ".git", ".nuxt", ".output", ".data"]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const root = join(import.meta.dirname, "..");
const featureNames = Object.keys(layers.features);
const importPattern = new RegExp(
  `from\\s+["']@nuxfire/layer-(${featureNames.join("|")})[/"']`,
);

// Every `.ts`/`.vue` file under a core layer's own directory, plus the one
// core-schema file that lives outside `layers/` (apps/functions).
const baseFiles = [
  ...layers.core.flatMap((name) => walk(join(root, "layers", name))),
  join(root, "apps/functions/src/database/core-schema.ts"),
].filter((path) => path.endsWith(".ts") || path.endsWith(".vue"));

describe("base layers never import a feature layer", () => {
  it("finds no @nuxfire/layer-<feature> import under a core layer or core-schema.ts", () => {
    const violations = baseFiles
      .map((path) => ({ path, source: readFileSync(path, "utf8") }))
      .filter(({ source }) => importPattern.test(source))
      .map(({ path, source }) => {
        const match = source.match(importPattern);
        return `${relative(root, path)} imports @nuxfire/layer-${match?.[1]}`;
      });

    expect(violations).toEqual([]);
  });

  it("derives the feature list from config.ts, not from a hardcoded name", () => {
    // Guards the test itself: if config.ts ever ships with zero feature
    // layers, `importPattern` above would match nothing and the first test
    // would pass vacuously. This keeps that state visible.
    expect(featureNames.length).toBeGreaterThan(0);
  });
});

// SPECSFY: SPEC-0005 follow-up — the direct-import check above missed
// `layers/admin/server/trpc/admin-teams.ts`, which reached `plans`/
// `subscriptions` (billing-owned) through `@nuxfire/functions/schema`, the
// database barrel (`apps/functions/src/database/schema.ts`) that
// unconditionally re-exports every layer's schema — a *different* string
// than `@nuxfire/layer-<feature>`, invisible to a plain import-path regex.
// This finds that class of violation instead of relying on manual review:
// it resolves which exported names the barrel draws from feature layers,
// then flags a base file that imports any of those specific names from the
// barrel, however it got there.
describe("base layers never import a feature-owned symbol via the schema barrel", () => {
  const barrelPath = join(
    root,
    "apps/functions/src/database/schema.ts",
  );
  const barrelSource = readFileSync(barrelPath, "utf8");
  const barrelReExportPattern =
    /export \* from ["']@nuxfire\/layer-([\w-]+)\/server\/database\/schema["']/g;

  function exportedNames(filePath: string): Set<string> {
    const source = readFileSync(filePath, "utf8");
    const names = new Set<string>();
    for (const m of source.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)) {
      names.add(m[1]);
    }
    for (const m of source.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}/g)) {
      for (const part of m[1].split(",")) {
        // `export { internal as external }` — a consumer imports `external`.
        const exported = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (exported) names.add(exported);
      }
    }
    return names;
  }

  // Symbol name -> the feature layer that owns it, for every feature layer
  // the barrel re-exports (core layers are exempt — base importing base is
  // allowed).
  const featureOwnedNames = new Map<string, string>();
  for (const match of barrelSource.matchAll(barrelReExportPattern)) {
    const layerName = match[1];
    if (!featureNames.includes(layerName)) continue;
    const schemaFile = join(root, "layers", layerName, "server/database/schema.ts");
    for (const name of exportedNames(schemaFile)) {
      featureOwnedNames.set(name, layerName);
    }
  }

  const barrelImportPattern =
    /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']@nuxfire\/functions\/schema["']/gs;

  it("finds no feature-owned symbol imported from the schema barrel under a base file", () => {
    expect(featureOwnedNames.size).toBeGreaterThan(0); // guards the test itself

    const violations = baseFiles.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const found: string[] = [];
      for (const match of source.matchAll(barrelImportPattern)) {
        for (const part of match[1].split(",")) {
          const imported = part.trim().split(/\s+as\s+/)[0]?.trim();
          const owner = imported && featureOwnedNames.get(imported);
          if (owner) {
            found.push(
              `${relative(root, path)} imports "${imported}" (owned by @nuxfire/layer-${owner}) via the schema barrel`,
            );
          }
        }
      }
      return found;
    });

    expect(violations).toEqual([]);
  });
});

// SPEC-0009 (Fase 3a), AC-011: the platform console's MFA no longer reaches the
// encryption, rate-limit and recovery-code functions through Nitro's auto-import
// of every layer's `server/utils`. Each one is imported from the package or layer
// that owns it, and that dependency is declared, so typecheck and this test see it.
describe("layers/admin imports its security primitives explicitly", () => {
  const adminRoot = join(root, "layers/admin");
  const adminPackage = JSON.parse(readFileSync(join(adminRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };

  // Function name -> the module specifier it must be imported from.
  const OWNERS: ReadonlyArray<{ name: string; from: RegExp; owner: string }> = [
    { name: "encryptSecret", from: /^@nuxfire\/crypto$/, owner: "@nuxfire/crypto" },
    { name: "decryptSecret", from: /^@nuxfire\/crypto$/, owner: "@nuxfire/crypto" },
    { name: "rateLimit", from: /^~~\/server\/utils\/rate-limit$/, owner: "the app rate-limit wrapper (~~/server/utils/rate-limit)" },
    { name: "consumeRecoveryCode", from: /^@nuxfire\/layer-account(\/|$)/, owner: "@nuxfire/layer-account" },
    { name: "replaceRecoveryCodes", from: /^@nuxfire\/layer-account(\/|$)/, owner: "@nuxfire/layer-account" },
    { name: "countRecoveryCodes", from: /^@nuxfire\/layer-account(\/|$)/, owner: "@nuxfire/layer-account" },
  ];

  const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  function importedFrom(source: string, name: string): string | undefined {
    for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["']/g)) {
      const names = match[1].split(",").map((part) => part.trim().split(/\s+as\s+/).pop()?.trim());
      if (names.includes(name)) return match[2];
    }
    return undefined;
  }

  function autoImported(): string[] {
    return walk(join(adminRoot, "server"))
      .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
      .flatMap((path) => {
        const source = withoutComments(readFileSync(path, "utf8"));
        return OWNERS.filter(({ name }) => new RegExp(`\\b${name}\\s*\\(`).test(source))
          .filter(({ name, from }) => !from.test(importedFrom(source, name) ?? ""))
          .map(({ name, owner }) => `${relative(root, path)} calls ${name} without importing it from ${owner}`);
      });
  }

  // SPECSFY: US-003 FR-002 FR-004 NFR-002 NFR-003 AC-011
  it("declares @nuxfire/crypto and @nuxfire/layer-account in package.json and the manifest, and no package it does not import", () => {
    const dependencies = Object.keys(adminPackage.dependencies ?? {});
    expect(dependencies).toEqual(
      expect.arrayContaining(["@nuxfire/crypto", "@nuxfire/layer-account"]),
    );
    expect(dependencies).not.toContain("@nuxfire/rate-limit");
    const manifest = readFileSync(join(adminRoot, "layer.manifest.ts"), "utf8");
    const requires = /requires:\s*\[([^\]]*)\]/.exec(manifest)?.[1] ?? "";
    expect(requires).toMatch(/["']account["']/);
  });

  // SPECSFY: US-003 FR-002 FR-004 NFR-002 NFR-003 AC-011
  it("imports every encryption, rate-limit and recovery-code function it calls from its owner", () => {
    // The import reader must recognise an explicit import, or every call would
    // be reported and a real violation could hide among false positives.
    expect(importedFrom('import { encryptSecret } from "@nuxfire/crypto";', "encryptSecret")).toBe("@nuxfire/crypto");
    expect(importedFrom('import { rateLimit } from "~~/server/utils/rate-limit";', "rateLimit")).toBe(
      "~~/server/utils/rate-limit",
    );
    expect(autoImported().join("\n")).toBe("");
  });

  // SPECSFY: US-003 FR-002 FR-004 NFR-002 NFR-003 AC-011
  it("scans layers/account as a core layer, so it never imports a feature layer either", () => {
    expect(layers.core).toContain("account");
    expect(baseFiles.some((path) => relative(root, path).replace(/\\/g, "/").startsWith("layers/account/"))).toBe(true);
  });
});

// SPEC-0010 (Fase 3b), AC-047: the intra-core edge `account` -> `teams` (the onboarding creates
// the first Space through teams' creation function) is allowed and declared in the manifest and
// in package.json; the reverse edge and any edge from `account` to the billing feature are not.
describe("the account to teams edge", () => {
  const sourcesOf = (layer: string) =>
    walk(join(root, "layers", layer)).filter((path) => /\.(ts|vue)$/.test(path) && !/\.d\.ts$/.test(path));

  // SPECSFY: FR-006 FR-018 NFR-004 NFR-007 AC-047
  it("is declared in layers/account/layer.manifest.ts (requires) and layers/account/package.json", () => {
    expect(layers.core).toEqual(expect.arrayContaining(["account", "teams"]));
    const manifest = readFileSync(join(root, "layers/account/layer.manifest.ts"), "utf8");
    const requires = /requires:\s*\[([^\]]*)\]/.exec(manifest)?.[1] ?? "";
    expect(requires).toMatch(/["']teams["']/);
    const pkg = JSON.parse(readFileSync(join(root, "layers/account/package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies ?? {})).toContain("@nuxfire/layer-teams");
  });

  // SPECSFY: FR-006 FR-018 NFR-004 NFR-007 AC-047
  it("is one way: no file under layers/teams imports @nuxfire/layer-account", () => {
    const files = sourcesOf("teams");
    expect(files.length).toBeGreaterThan(0); // guards the test itself
    const violations = files
      .filter((path) => /@nuxfire\/layer-account/.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path));
    expect(violations).toEqual([]);
  });

  // SPECSFY: FR-006 FR-018 NFR-004 NFR-007 AC-047
  it("leaves billing out: no file under layers/account imports @nuxfire/layer-billing", () => {
    const files = sourcesOf("account");
    expect(files.length).toBeGreaterThan(0); // guards the test itself
    const violations = files
      .filter((path) => /@nuxfire\/layer-billing/.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path));
    expect(violations).toEqual([]);
  });
});
