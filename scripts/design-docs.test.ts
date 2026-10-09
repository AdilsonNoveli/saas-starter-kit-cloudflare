import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0008 (Fase 2: design system Serelius): the two documents agents read before building a
// screen must describe what exists, and the repository gates must stay wired.
const root = join(import.meta.dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");
const designSystem = () => read(".fireskills/DESIGNSYSTEM.MD");
const STATES = ["defined", "planned", "in-progress", "review", "completed"];
/** The spec moves between state folders; research lives next to it. */
const specResearch = (file: string): string => {
  const state = STATES.find((s) => existsSync(join(root, `specs/${s}/0008-fase-2-design-system-serelius/research/${file}`)));
  return read(`specs/${state ?? "defined"}/0008-fase-2-design-system-serelius/research/${file}`);
};
const OLD = /\b(flame|fire|night|mint)\b|lucide/i;

describe("design system documents", () => {
  // SPECSFY: US-004 FR-010 FR-007 AC-027
  it("DESIGNSYSTEM.MD names the Serelius identity, the voice rule and the exceptions table, and none of the old palettes or Lucide", () => {
    const text = designSystem();
    for (const term of ["Atkinson Hyperlegible", "IBM Plex Mono", "Phosphor", "#1C2B33", "#BBF353", "MfaSetupModal"]) expect(text, term).toContain(term);
    expect(text).toMatch(/voz|voice/i);
    expect(text).toMatch(/\|\s*Date\s*\|/);
    expect(text).not.toMatch(OLD);
  });

  // SPECSFY: US-004 FR-010 AC-028
  it("INTERFACE.md cites the Phosphor icon set and no Lucide icon", () => {
    const text = read(".fireskills/INTERFACE.md");
    expect(text).toMatch(/phosphor|i-ph-/i);
    expect(text).not.toMatch(/lucide/i);
  });

  // SPECSFY: US-004 FR-004 FR-010 AC-029
  it("gives every adjustment of the old sharedUiConfig a SUBSTITUÍDO or MANTIDO verdict", () => {
    const text = designSystem();
    const research = specResearch("ajustes-existentes-do-tokens.md");
    const blocks = [...research.matchAll(/^\| `(\w+)` \| \d+ \|/gm)].map((m) => m[1]).filter((name) => name !== "themeColor" && name !== "icons" && name !== "colors");
    expect(blocks.length).toBeGreaterThanOrEqual(7);
    for (const block of blocks) {
      const line = text.split("\n").find((l) => l.includes(`\`${block}\``) && /SUBSTITU[ÍI]DO|MANTIDO/.test(l));
      expect(line, `verdict for ${block}`).toBeDefined();
    }
  });
});

describe("repository gates", () => {
  // SPECSFY: NFR-003 US-001 US-002 AC-030
  it("keeps test, check:copy, check:i18n and check:perf wired and the new suites inside the aggregator", () => {
    const scripts = JSON.parse(read("package.json")).scripts as Record<string, string>;
    for (const name of ["test", "check:copy", "check:i18n", "check:perf"]) expect(scripts[name], name).toBeTruthy();
    const aggregator = read("vitest.config.mts");
    expect(aggregator).toContain('"scripts"');
    expect(aggregator).toContain('"packages/tokens"');
    for (const file of ["packages/tokens/design-tokens.test.ts", "scripts/design-tokens-policy.test.ts", "scripts/design-visual-review.test.ts", "scripts/design-docs.test.ts"]) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });
});
