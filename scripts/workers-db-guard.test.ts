import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0007 (Fase 0): a Worker that opens a Hyperdrive connection must go through withDb,
// which closes it. Direct-credential scripts under database/ are a different thing and stay out.
const root = join(import.meta.dirname, "..");
const HELPER = "apps/functions/src/database/with-db.ts";
const OPENS_HYPERDRIVE = /postgres\(\s*env\.AppDB\.connectionString/;

const sources = execFileSync("git", ["ls-files", "apps/functions/src"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(ts|js)$/.test(file) && !/\.test\./.test(file) && file !== HELPER);

describe("workers close their database connections", () => {
  // SPECSFY: US-004 FR-008 FR-009 NFR-001 AC-019
  it("has no Worker opening a Hyperdrive connection outside withDb", () => {
    const offenders = sources.filter((file) => OPENS_HYPERDRIVE.test(readFileSync(join(root, file), "utf8")));
    expect(offenders.join(", ")).toBe("");
  });
});
