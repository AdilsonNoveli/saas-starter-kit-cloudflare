import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// BDD source: specs/*/0002-web-performance-search-copy-specialists/spec.md (AC-011, NFR-004).
// The gates are build-time tooling. Nothing of them may reach a Worker, and they may not pull
// in a package that package.json does not pin exactly.

const ROOT = join(import.meta.dirname, "..");
const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

const GATE_FILES = [
  "scripts/allowances.ts",
  "scripts/perf-rules.ts",
  "scripts/check-perf.ts",
  "scripts/seo-live.ts",
  "scripts/indexnow.ts",
  "scripts/redirects.ts",
  "scripts/copy-rules.ts",
  "scripts/check-copy.ts",
];

const pkg = JSON.parse(read("package.json")) as {
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/** Module specifiers of the static imports and dynamic import() calls of a file. */
function importsOf(source: string): string[] {
  const found = [...source.matchAll(/(?:^|\s)(?:import|export)\s+(?:type\s+)?[^"'`;]*?from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  found.push(...[...source.matchAll(/(?:^|\s)import\s+["']([^"']+)["']/g)].map((m) => m[1]));
  found.push(...[...source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]));
  return found;
}

const isBuiltin = (specifier: string): boolean =>
  specifier.startsWith("node:") || specifier === "bun" || builtinModules.includes(specifier);

// The tests walk the source tree: on a loaded machine that can exceed the 5 s default.
describe("the gates add no dependency (NFR-004)", { timeout: 60_000 }, () => {
  // SPECSFY: US-001 US-002 US-003 NFR-004 AC-011
  it("has every gate file", () => {
    expect(GATE_FILES.filter((file) => !existsSync(join(ROOT, file)))).toEqual([]);
  });

  // SPECSFY: US-001 US-002 US-003 NFR-004 AC-011
  it("imports only Node or Bun built-ins, relative files, and packages pinned exactly in package.json", () => {
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const file of GATE_FILES.filter((f) => existsSync(join(ROOT, f)))) {
      for (const specifier of importsOf(read(file))) {
        if (specifier.startsWith(".") || isBuiltin(specifier)) continue;
        const name = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
        expect(declared[name], `${file} imports ${specifier}, which package.json does not declare`).toBeDefined();
        expect(declared[name], `${name} must be pinned exactly`).toMatch(/^\d+\.\d+\.\d+/);
      }
    }
  });

  // SPECSFY: US-001 US-002 US-003 NFR-004 AC-011
  it("is imported by nothing under apps/, layers/ or packages/ (other build helpers such as compose-layers are not gates)", () => {
    const offenders: string[] = [];
    const gateModules = [...GATE_FILES, "scripts/seo-rules.ts"].map((file) => file.replace(/^scripts\//, "").replace(/\.ts$/, ""));
    const skip = new Set(["node_modules", ".nuxt", ".output", ".data", "dist", ".sst"]);
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        if (skip.has(entry)) continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|vue|mjs|js)$/.test(entry) && gateModules.some((name) => new RegExp(String.raw`from\s+["'](?:\.\./)+scripts/${name}["']`).test(readFileSync(path, "utf8")))) {
          offenders.push(path.slice(ROOT.length + 1).replaceAll("\\", "/"));
        }
      }
    };
    for (const dir of ["apps", "layers", "packages"]) if (existsSync(join(ROOT, dir))) walk(join(ROOT, dir));
    expect(offenders).toEqual([]);
  });
});

describe("the gates are registered as scripts (FR-012, NFR-004)", () => {
  // SPECSFY: US-001 US-002 US-003 FR-012 NFR-004 AC-011
  it("declares check:perf, check:copy and indexnow as Bun scripts", () => {
    expect(pkg.scripts["check:perf"]).toBe("bun scripts/check-perf.ts");
    expect(pkg.scripts["check:copy"]).toBe("bun scripts/check-copy.ts");
    expect(pkg.scripts.indexnow).toBe("bun scripts/indexnow.ts");
  });

  // SPECSFY: US-001 US-002 US-003 FR-012 NFR-004 AC-011
  it("keeps every script it registers pointing at a file that exists", () => {
    for (const name of ["check:perf", "check:copy", "indexnow", "check:seo"]) {
      const file = pkg.scripts[name]?.replace(/^bun /, "");
      expect(file, `${name} is not registered`).toBeDefined();
      expect(existsSync(join(ROOT, file!)), `${file} is missing`).toBe(true);
    }
  });
});

describe("nothing of the gates reaches a Worker (NFR-004)", { timeout: 60_000 }, () => {
  const output = join(ROOT, "apps/web/.output");
  const identifiers = ["auditPerf", "auditLive", "applyAllowances", "validateLedger", "buildPayload"];

  // SPECSFY: US-001 US-002 NFR-004 AC-011
  it.skipIf(!existsSync(output))("finds none of the gate code in the build output of apps/web", () => {
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(m?js|json|html)$/.test(entry)) {
          const text = readFileSync(path, "utf8");
          for (const id of identifiers) if (text.includes(id)) hits.push(`${path.slice(ROOT.length + 1)}: ${id}`);
        }
      }
    };
    walk(output);
    expect(hits).toEqual([]);
  });
});
