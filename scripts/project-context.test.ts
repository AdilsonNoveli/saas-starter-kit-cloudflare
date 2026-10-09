import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0007 (Fase 0): pinned Bun, the D1–D8 decisions as ADRs, and a PROJECT.md that describes
// Serelius. (Postgres extensions are not created here: each belongs to the layer that needs it.)
const root = join(import.meta.dirname, "..");
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");
const ADR_DIR = join(root, "docs", "adr");

const adrs = () => (existsSync(ADR_DIR) ? readdirSync(ADR_DIR).filter((file) => /^\d{4}-.+\.md$/.test(file)) : []);

describe("project context", () => {
  // SPECSFY: US-005 FR-005 FR-010 NFR-001 AC-011
  it("pins Bun in package.json and records D1 to D8 as ADRs", () => {
    const pkg = JSON.parse(read("package.json")) as { packageManager?: string };
    expect(pkg.packageManager).toBe("bun@1.4.0");
    expect(adrs().length).toBeGreaterThanOrEqual(8);
    for (let n = 1; n <= 8; n += 1) {
      expect(adrs().some((file) => file.startsWith(String(n).padStart(4, "0")))).toBe(true);
    }
  });

  // SPECSFY: US-005 FR-010 NFR-001 AC-012
  it("describes Serelius in PROJECT.md instead of presenting the starter kit as the product", () => {
    const project = read(".fireskills", "PROJECT.md");
    expect(project).toMatch(/Serelius/);
    expect(project).not.toMatch(/Base provided by the Nuxfire starter kit/);
    for (const heading of ["Purpose", "Users and Operational Context", "Core Capabilities", "Boundaries and Non-Goals"]) {
      expect(project).toContain(`## ${heading}`);
    }
  });

  // SPECSFY: US-005 FR-010 NFR-003 AC-013
  it("keeps credentials out of the ADRs", () => {
    const files = adrs();
    expect(files.length).toBeGreaterThan(0);
    const SECRET = /(sk_(live|test)_|whsec_|cfat_|BEGIN [A-Z ]*PRIVATE KEY|\b(api[_-]?key|secret|token|password)\s*[:=]\s*\S{8,})/i;
    const leaking = files.filter((file) => SECRET.test(readFileSync(join(ADR_DIR, file), "utf8")));
    expect(leaking.join(", ")).toBe("");
  });
});
