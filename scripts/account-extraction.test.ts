import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0009 (Fase 3a), AC-014: moving the account files into layers/account
// must carry their copy allowances along (check:copy matches `where` by exact
// path) without the baseline growing.
const root = join(import.meta.dirname, "..");

type Allowance = { rule: string; where: string; match: string; removedBy: string; since: string };
const baseline = JSON.parse(readFileSync(join(root, "scripts/copy-baseline.json"), "utf8")) as {
  schema: number;
  allow: Allowance[];
};

// Ceiling read from scripts/copy-baseline.json on 2026-10-06, before the move:
// 252 allowances in total, 50 of them on the account files of apps/app. The
// baseline only shrinks (RULES.md, copy contract), so neither number may grow.
const TOTAL_CEILING = 252;
const ACCOUNT_CEILING = 50;

const OLD_LOCATIONS = /^apps\/app\/app\/(?:pages\/account-settings(?:\.vue|\/)|components\/(?:account|avatar|settings)\/)/;
const NEW_LOCATIONS = /^layers\/account\/app\//;

describe("copy baseline after the account extraction", () => {
  // SPECSFY: US-003 FR-004 NFR-006 AC-014
  it("has no allowance left on the old apps/app account paths", () => {
    const stale = baseline.allow.filter((entry) => OLD_LOCATIONS.test(entry.where));
    expect(stale.map((entry) => `${entry.where}: ${entry.match}`).join("\n")).toBe("");
  });

  // SPECSFY: US-003 FR-004 NFR-006 AC-014
  it("moves the allowances to layers/account files that exist, without growing", () => {
    const moved = baseline.allow.filter((entry) => NEW_LOCATIONS.test(entry.where));
    expect(moved.length, "allowances on layers/account").toBeGreaterThan(0);
    expect(moved.length).toBeLessThanOrEqual(ACCOUNT_CEILING);
    const missing = [...new Set(moved.map((entry) => entry.where))].filter((where) => !existsSync(join(root, where)));
    expect(missing).toEqual([]);
    expect(baseline.allow.length).toBeLessThanOrEqual(TOTAL_CEILING);
  });
});
