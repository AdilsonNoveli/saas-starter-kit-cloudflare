import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0007 (Fase 0): the signed-in screens and the MFA issuer read the product name from
// configuration. A literal "Nuxfire" (capital N, not the internal @nuxfire/ scope) in
// apps/app, apps/login or layers/ fails. apps/web, scripts/, packages/ and docs are out.
const root = join(import.meta.dirname, "..");
const SCOPE = /^(apps\/app|apps\/login|layers)\//;
const SOURCE = /\.(ts|tsx|mts|vue|json|css)$/;

const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => SCOPE.test(file) && SOURCE.test(file));

describe("brand is never hardcoded", () => {
  // SPECSFY: US-003 FR-007 NFR-001 AC-015
  it("finds no literal product name in the signed-in apps and layers", () => {
    const hits: string[] = [];
    for (const file of files) {
      readFileSync(join(root, file), "utf8")
        .split("\n")
        .forEach((line, index) => {
          if (/Nuxfire/.test(line.replace(/@nuxfire\//g, ""))) hits.push(`${file}:${index + 1}`);
        });
    }
    expect(hits.join(", ")).toBe("");
  });
});
