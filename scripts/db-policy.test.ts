import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0007 (Fase 0): the owner's database change policy is written once (RULES.md) and mirrored
// everywhere agents read. This test is what keeps it from being forgotten or contradicted.
const root = join(import.meta.dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");

const TITLE = "database change policy";
const MIRRORS = [
  "AGENTS.md",
  "apps/functions/src/database/MIGRATIONS.md",
  ".fireskills/DATABASE.md",
  "fireskills/specialists/fireskill-specialist-drizzle/SKILL.md",
  "fireskills/specialists/fireskill-specialist-postgres/SKILL.md",
  "fireskills/skills/fireskill-setup/references/framework-instructions.md",
];

const markdownIn = (dir: string): string[] =>
  readdirSync(join(root, dir)).flatMap((name) => {
    const relative = `${dir}/${name}`;
    return statSync(join(root, relative)).isDirectory() ? markdownIn(relative) : relative.endsWith(".md") ? [relative] : [];
  });

describe("database change policy", () => {
  // SPECSFY: US-005 FR-012 NFR-001 AC-026
  it("is written in RULES.md with its six points, in force until launch and separate from deploy", () => {
    const rules = read(".fireskills/RULES.md");
    expect(rules).toContain("ABSOLUTE AND UNBREAKABLE RULE");
    for (const point of ["Isolation by history", "specific, well-defined, direct step", "Adjustments edit the init", "A new init number only on a version bump", "Who resets", "Data that must survive"]) {
      expect(rules).toContain(point);
    }
    expect(rules).toMatch(/until the application launches/);
    expect(rules).toMatch(/not\*\* part of `bun run deploy`/);
  });

  // SPECSFY: US-005 FR-012 NFR-001 AC-027
  it("is mirrored in every place agents and specialists read", () => {
    for (const file of MIRRORS) expect(read(file).toLowerCase(), file).toContain(TITLE);
    expect(read("docs/database.md")).toMatch(/pol[ií]tica de mudan[cç]a no banco/i);
  });

  // SPECSFY: US-005 FR-012 NFR-002 AC-029
  it("leaves no text prescribing patch migrations or expand/contract as the way to change the schema", () => {
    const files = [
      ".fireskills/RULES.md",
      "apps/functions/src/database/MIGRATIONS.md",
      ...markdownIn("fireskills/specialists/fireskill-specialist-drizzle"),
      ...markdownIn("fireskills/specialists/fireskill-specialist-postgres"),
      ...markdownIn("fireskills/specialists/fireskill-specialist-delivery-engineering"),
    ];
    const SAFE = /not used|superseded|history only|overrides|no expand\/contract|only a stage|only to a stage|forbidden|never|no patch|does not use|used to be here/i;
    const offenders: string[] = [];
    for (const file of files) {
      let superseded = false;
      read(file)
        .split("\n")
        .forEach((line, index) => {
          if (/^#{1,3} /.test(line)) superseded = /superseded/i.test(line);
          if (!superseded && /expand\/contract|expand-contract/i.test(line) && !SAFE.test(line)) offenders.push(`${file}:${index + 1}`);
        });
    }
    expect(offenders.join(", ")).toBe("");
  });
});
