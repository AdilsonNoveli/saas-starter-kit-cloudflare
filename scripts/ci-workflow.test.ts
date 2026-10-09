import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0007 (Fase 0): CI only validates. No deploy, no secrets, same Bun as package.json.
const root = join(import.meta.dirname, "..");
const WORKFLOW = join(root, ".github", "workflows", "ci.yml");
const workflow = () => {
  expect(existsSync(WORKFLOW)).toBe(true);
  return readFileSync(WORKFLOW, "utf8");
};

describe("ci workflow", () => {
  // SPECSFY: US-002 FR-004 NFR-001 NFR-003 AC-005
  it("runs the full validation on pull requests and on pushes to stage", () => {
    const text = workflow();
    expect(text).toMatch(/pull_request/);
    expect(text).toMatch(/push:[\s\S]*stage/);
    for (const step of [
      "bun install --frozen-lockfile",
      "bun run test",
      "nuxt typecheck",
      "bunx vue-tsc --noEmit -p server/tsconfig.json",
      "bun run check:i18n",
      "bun run check:copy",
    ]) {
      expect(text).toContain(step);
    }
  });

  // SPECSFY: US-002 FR-004 FR-005 NFR-003 AC-006
  it("has no deploy step, no secrets, and pins the same Bun as packageManager", () => {
    const text = workflow();
    expect(text).not.toMatch(/\bdeploy\b/i);
    expect(text).not.toMatch(/secrets\./);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { packageManager?: string };
    const version = /^bun@(.+)$/.exec(pkg.packageManager ?? "")?.[1];
    expect(version).toBeDefined();
    expect(text).toContain(`bun-version: ${version}`);
  });

  // SPECSFY: US-002 FR-004 FR-005 NFR-001 AC-007
  it("installs with a frozen lockfile so a stale bun.lock fails the job", () => {
    const text = workflow();
    const installs = text.split("\n").filter((line) => /bun install/.test(line));
    expect(installs.length).toBeGreaterThan(0);
    for (const line of installs) expect(line).toContain("--frozen-lockfile");
  });
});
