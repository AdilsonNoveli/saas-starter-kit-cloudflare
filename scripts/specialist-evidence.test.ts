import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// BDD source: specs/*/0002-web-performance-search-copy-specialists/spec.md (AC-011, NFR-006).
// "Zero assumption" made mechanical: a specialist reference states where every fact came from,
// when it was read and how, and the facts about the installed packages are compared with the
// installed packages.

const ROOT = join(import.meta.dirname, "..");
const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

const NEW = [
  "fireskill-specialist-web-performance",
  "fireskill-specialist-seo",
  "fireskill-specialist-copywriting",
] as const;

const referencesOf = (name: string): string[] => {
  const dir = join(ROOT, "fireskills/specialists", name, "references");
  return existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".md")).sort() : [];
};

describe("the three specialists have the structure agents rely on (AC-011)", () => {
  // SPECSFY: US-006 FR-001 FR-003 FR-008 NFR-006 AC-011
  it.each(NEW)("%s has a SKILL.md named after its directory with the required sections", (name) => {
    const file = `fireskills/specialists/${name}/SKILL.md`;
    expect(existsSync(join(ROOT, file)), `${file} is missing`).toBe(true);
    const skill = read(file);
    const front = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    expect(front).toMatch(new RegExp(`^name:\\s*${name}\\s*$`, "m"));
    expect(front).toMatch(/^description:\s*\S+/m);
    for (const heading of [/^## When to Use/m, /^## Workflow/m, /^## (Antipatterns|Anti-Patterns)/m, /^## Validation/m, /^## Related Skills/m]) {
      expect(skill, `${name} lacks ${heading}`).toMatch(heading);
    }
  });

  // SPECSFY: US-006 FR-001 FR-003 FR-008 NFR-006 AC-011
  it.each(NEW)("%s has an agents/openai.yaml that names it", (name) => {
    const file = `fireskills/specialists/${name}/agents/openai.yaml`;
    expect(existsSync(join(ROOT, file)), `${file} is missing`).toBe(true);
    const yaml = read(file);
    expect(yaml).toContain("display_name:");
    expect(yaml).toContain("short_description:");
    expect(yaml).toContain(`$${name}`);
  });

  // SPECSFY: US-006 FR-001 FR-003 FR-008 NFR-006 AC-011
  it.each(NEW)("%s has at least three references, one of them a nuxfire-*.md with What Does NOT Exist", (name) => {
    const references = referencesOf(name);
    expect(references.length, `${name} has ${references.length} references`).toBeGreaterThanOrEqual(3);
    const nuxfire = references.filter((file) => /^nuxfire-.*\.md$/.test(file));
    expect(nuxfire.length, `${name} has no nuxfire-*.md reference`).toBeGreaterThan(0);
    for (const file of nuxfire) {
      expect(read(`fireskills/specialists/${name}/references/${file}`)).toMatch(/^## \d+\. What (does|is) NOT/im);
    }
  });

  // SPECSFY: US-006 FR-001 FR-003 FR-008 NFR-006 AC-011
  it("names the boundary with the neighbouring specialists (DEC-002, DEC-003)", () => {
    expect(read("fireskills/specialists/fireskill-specialist-seo/SKILL.md")).toContain("fireskill-specialist-content-seo");
    expect(read("fireskills/specialists/fireskill-specialist-web-performance/SKILL.md")).toContain("fireskill-specialist-performance-engineering");
    expect(read("fireskills/specialists/fireskill-specialist-content-seo/SKILL.md")).toContain("fireskill-specialist-seo");
  });
});

// ---------------------------------------------------------------------------------
// Fact tables: Source, Read, Mode (NFR-006)
// ---------------------------------------------------------------------------------

interface Table {
  header: string[];
  rows: string[][];
  file: string;
}

function tablesOf(file: string, markdown: string): Table[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const tables: Table[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|.*\|\s*$/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) continue;
    const cells = (line: string): string[] => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
    const rows: string[][] = [];
    let j = i + 2;
    for (; j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j]); j += 1) rows.push(cells(lines[j]));
    tables.push({ header: cells(lines[i]), rows, file });
    i = j;
  }
  return tables;
}

const factTables = NEW.flatMap((name) =>
  referencesOf(name).flatMap((file) =>
    tablesOf(`${name}/references/${file}`, read(`fireskills/specialists/${name}/references/${file}`)).filter((table) =>
      table.header.some((cell) => /^source$/i.test(cell)),
    ),
  ),
);

describe("every fact table has Source, Read and Mode (NFR-006)", () => {
  // SPECSFY: US-006 FR-001 FR-003 FR-008 FR-012 NFR-006 AC-011
  it("has at least one fact table in each specialist", () => {
    for (const name of NEW) {
      expect(factTables.filter((table) => table.file.startsWith(name)).length, `${name} has no fact table`).toBeGreaterThan(0);
    }
  });

  // SPECSFY: US-006 FR-001 FR-003 FR-008 FR-012 NFR-006 AC-011
  it("gives each fact table the columns Source, Read and Mode", () => {
    for (const table of factTables) {
      const header = table.header.map((cell) => cell.toLowerCase());
      for (const column of ["source", "read", "mode"]) {
        expect(header, `${table.file} lacks the column ${column}`).toContain(column);
      }
    }
  });

  // SPECSFY: US-006 FR-001 FR-003 FR-008 FR-012 NFR-006 AC-011
  it("fills Read with an ISO date and Mode with RAW, CMD, CODE or DECISION in every row", () => {
    for (const table of factTables) {
      const read = table.header.findIndex((cell) => /^read$/i.test(cell));
      const mode = table.header.findIndex((cell) => /^mode$/i.test(cell));
      table.rows.forEach((row, index) => {
        expect(row[read], `${table.file} row ${index + 1}: Read`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(row[mode], `${table.file} row ${index + 1}: Mode`).toMatch(/^(RAW|CMD|CODE|DECISION)$/);
      });
    }
  });
});

describe("a finished reference has no summarised source (NFR-006)", () => {
  // SPECSFY: US-006 FR-001 FR-003 FR-008 NFR-006 AC-011
  it("has no row whose mode is SUM", () => {
    for (const table of factTables) {
      const mode = table.header.findIndex((cell) => /^mode$/i.test(cell));
      const summed = table.rows.filter((row) => /^SUM$/i.test(row[mode] ?? ""));
      expect(summed, `${table.file} still has SUM rows`).toEqual([]);
    }
  });

  const research = (() => {
    const specs = join(ROOT, "specs");
    const found: string[] = [];
    for (const state of existsSync(specs) ? readdirSync(specs) : []) {
      const dir = join(specs, state, "0002-web-performance-search-copy-specialists", "research");
      if (existsSync(dir)) found.push(...readdirSync(dir).map((file) => readFileSync(join(dir, file), "utf8")));
    }
    return found.join("\n");
  })();
  const normal = (url: string): string => url.replace(/#.*$/, "").replace(/[).,;]+$/, "").replace(/\/$/, "");

  // SPECSFY: US-006 FR-001 FR-003 FR-008 NFR-006 AC-011
  it("cites only URLs that the research of SPEC-0002 records", () => {
    const recorded = new Set([...research.matchAll(/https?:\/\/[^\s|`)>\]]+/g)].map((m) => normal(m[0])));
    const missing: string[] = [];
    for (const table of factTables) {
      const source = table.header.findIndex((cell) => /^source$/i.test(cell));
      for (const row of table.rows) {
        for (const url of row[source]?.match(/https?:\/\/[^\s|`)>\]]+/g) ?? []) {
          if (!recorded.has(normal(url))) missing.push(`${table.file}: ${url}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------
// Facts about the installed packages are compared with the installed packages (T026)
// ---------------------------------------------------------------------------------

describe("the performance facts match the installed Nuxt (FR-001, NFR-006)", () => {
  const nuxtVersion = (JSON.parse(read("node_modules/nuxt/package.json")) as { version: string }).version;
  const reference = (): string => read("fireskills/specialists/fireskill-specialist-web-performance/references/nuxfire-web-delivery.md");

  // SPECSFY: US-001 FR-001 NFR-006 AC-011
  it("finds the noScripts feature and route rule in the installed packages", () => {
    expect(read("node_modules/@nuxt/schema/dist/index.d.mts")).toMatch(/noScripts:\s*"production"\s*\|\s*"all"\s*\|\s*boolean/);
    expect(read("node_modules/@nuxt/nitro-server/dist/index.mjs")).toMatch(/interface NitroRouteRules[\s\S]*?noScripts\?: boolean/);
  });

  // SPECSFY: US-001 FR-001 NFR-006 AC-011
  it("finds every lazy hydration strategy the reference lists", () => {
    const declarations = read("node_modules/nuxt/dist/app/composables/lazy-hydration.d.ts");
    for (const strategy of ["visible", "idle", "interaction", "mediaQuery", "if", "time", "never"]) {
      expect(declarations, strategy).toContain(`strategy: '${strategy}'`);
      expect(reference(), strategy).toContain(strategy);
    }
  });

  // SPECSFY: US-001 FR-001 NFR-006 AC-011
  it("states the Nuxt version it was verified against, and it is the installed one", () => {
    const stated = reference().match(/Nuxt (\d+\.\d+\.\d+)/)?.[1];
    expect(stated, "the reference does not state a Nuxt version").toBeDefined();
    expect(stated).toBe(nuxtVersion);
    expect(reference()).toContain("noScripts");
    expect(reference()).toContain("defineLazyHydrationComponent");
  });
});
