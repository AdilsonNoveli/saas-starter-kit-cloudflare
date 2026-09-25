import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// BDD source: specs/*/0001-content-seo-metadata/spec.md (AC-008). The specialists are
// documented in seven places that used to drift silently (a count of 34 written by hand
// in AGENTS.md, the docs in three languages, the landing copy in three locales).

const ROOT = join(import.meta.dirname, "..");
const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");
const SPECIALISTS = join(ROOT, "fireskills/specialists");
const NEW = "fireskill-specialist-content-seo";

interface CatalogEntry {
  name: string;
  description: string;
  category: string;
  tags: string[];
  detect: { files: string[]; dependencies: string[] };
}
const catalog = JSON.parse(read("fireskills/specialists/catalog.json")) as { skills: CatalogEntry[] };
const names = catalog.skills.map((skill) => skill.name).sort();
const directories = readdirSync(SPECIALISTS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("fireskill-specialist-"))
  .map((entry) => entry.name)
  .sort();

describe("the catalog, the directories and the routing agree (AC-008)", () => {
  // SPECSFY: US-005 FR-010 AC-008
  it("lists exactly the specialist directories that exist", () => {
    expect(names).toEqual(directories);
  });

  // SPECSFY: US-005 FR-010 AC-008
  it("registers the content and SEO specialist with what it detects", () => {
    const entry = catalog.skills.find((skill) => skill.name === NEW);
    expect(entry, `${NEW} is not in catalog.json`).toBeDefined();
    expect(entry?.description.length).toBeGreaterThan(40);
    expect(entry?.detect.files).toContain("apps/web/content.config.ts");
    expect(entry?.tags).toEqual(expect.arrayContaining(["seo", "blog", "content"]));
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("routes to the specialist from fireskills/SKILL.md", () => {
    expect(read("fireskills/SKILL.md")).toContain(NEW);
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("lists every specialist in the README", () => {
    const readme = read("fireskills/README.md");
    const missing = names.filter((name) => !readme.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });
});

/** Every place that writes the total by hand, with the phrase that carries it. */
const COUNT_SITES: { file: string; pattern: RegExp }[] = [
  { file: "AGENTS.md", pattern: /(\d+) technical specialists/ },
  { file: "apps/web/content/docs/2.fireskills/0.index.md", pattern: /^### 3\. (\d+) technical specialists/m },
  { file: "apps/web/content/pt-br/docs/2.fireskills/0.index.md", pattern: /^### 3\. (\d+) especialistas técnicos/m },
  { file: "apps/web/content/es/docs/2.fireskills/0.index.md", pattern: /^### 3\. (\d+) especialistas técnicos/m },
  { file: "apps/web/content/docs/2.fireskills/4.specialists/0.overview.md", pattern: /with (\d+) domain-specific specialists/ },
  { file: "apps/web/content/docs/2.fireskills/4.specialists/0.overview.md", pattern: /\*\*(\d+) Technical Specialists\*\*/ },
  { file: "apps/web/content/docs/2.fireskills/4.specialists/0.overview.md", pattern: /The (\d+) specialists are divided/ },
  { file: "apps/web/content/pt-br/docs/2.fireskills/4.specialists/0.overview.md", pattern: /com (\d+) especialistas de domínio/ },
  { file: "apps/web/content/pt-br/docs/2.fireskills/4.specialists/0.overview.md", pattern: /\*\*(\d+) Especialistas Técnicos\*\*/ },
  { file: "apps/web/content/pt-br/docs/2.fireskills/4.specialists/0.overview.md", pattern: /Os (\d+) especialistas se dividem/ },
  { file: "apps/web/content/es/docs/2.fireskills/4.specialists/0.overview.md", pattern: /con (\d+) especialistas de dominio/ },
  { file: "apps/web/content/es/docs/2.fireskills/4.specialists/0.overview.md", pattern: /\*\*(\d+) Especialistas Técnicos\*\*/ },
  { file: "apps/web/content/es/docs/2.fireskills/4.specialists/0.overview.md", pattern: /Los (\d+) especialistas se dividen/ },
];

describe("the specialist count is the same everywhere (AC-008)", () => {
  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it.each(COUNT_SITES.map((site) => [site.file, site.pattern.source, site] as const))(
    "%s says the real total (%s)",
    (_file, _source, site) => {
      const match = read(site.file).match(site.pattern);
      expect(match, `${site.file} no longer contains ${site.pattern}`).not.toBeNull();
      expect(Number(match?.[1])).toBe(catalog.skills.length);
    },
  );

  const docPages = [
    { lang: "en", dir: "apps/web/content/docs/2.fireskills/4.specialists", stack: /\*\*The (\d+) Nuxfire Stack Specialists\*\*/ },
    { lang: "pt-br", dir: "apps/web/content/pt-br/docs/2.fireskills/4.specialists", stack: /\*\*Os (\d+) Especialistas da Stack do Nuxfire\*\*/ },
    { lang: "es", dir: "apps/web/content/es/docs/2.fireskills/4.specialists", stack: /\*\*Los (\d+) especialistas de la stack de Nuxfire\*\*/ },
  ];

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it.each(docPages)("the $lang docs cite every specialist", ({ dir }) => {
    const cited = new Set(
      readdirSync(join(ROOT, dir))
        .filter((file) => file.endsWith(".md"))
        .flatMap((file) => read(`${dir}/${file}`).match(/fireskill-specialist-[a-z-]+/g) ?? []),
    );
    expect(names.filter((name) => !cited.has(name))).toEqual([]);
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it.each(docPages)("the $lang stack page counts its own sections", ({ dir, stack }) => {
    const page = read(`${dir}/1.nuxfire-stack.md`);
    const sections = (page.match(/^## \d+\. `fireskill-specialist-/gm) ?? []).length;
    const overview = read(`${dir}/0.overview.md`).match(stack);
    expect(overview, `overview of ${dir} lost the stack category line`).not.toBeNull();
    expect(Number(overview?.[1])).toBe(sections);
    expect(page.match(/^title: "[^"]*"/m)?.[0]).toContain(String(sections));
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("places the new specialist among the Nuxfire stack specialists of the README", () => {
    const readme = read("fireskills/README.md");
    const stack = readme.slice(readme.indexOf("### Nuxfire Stack"), readme.indexOf("### Engineering"));
    expect(stack).toContain(NEW);
  });
});

describe("every specialist has the structure agents rely on (AC-008)", () => {
  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("has a SKILL.md whose frontmatter name is the directory name", () => {
    for (const directory of directories) {
      const skill = read(`fireskills/specialists/${directory}/SKILL.md`);
      const front = skill.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      expect(front, `${directory}/SKILL.md has no frontmatter`).not.toBe("");
      expect(front).toMatch(new RegExp(`^name:\\s*${directory}\\s*$`, "m"));
      expect(front).toMatch(/^description:\s*\S+/m);
    }
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("has an agents/openai.yaml that names the specialist", () => {
    for (const directory of directories) {
      const file = `fireskills/specialists/${directory}/agents/openai.yaml`;
      expect(existsSync(join(ROOT, file)), `${file} is missing`).toBe(true);
      const yaml = read(file);
      expect(yaml).toContain("display_name:");
      expect(yaml).toContain("short_description:");
      expect(yaml).toContain(`$${directory}`);
    }
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("keeps a nuxfire-*.md reference with a What Does NOT Exist section wherever one exists", () => {
    for (const directory of directories) {
      const references = join(SPECIALISTS, directory, "references");
      if (!existsSync(references)) continue;
      for (const file of readdirSync(references).filter((name) => /^nuxfire-.*\.md$/.test(name))) {
        expect(read(`fireskills/specialists/${directory}/references/${file}`)).toMatch(
          /^## \d+\. What (does|is) NOT/im,
        );
      }
    }
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("gives the new specialist a nuxfire reference and a post recipe", () => {
    const references = join(SPECIALISTS, NEW, "references");
    expect(existsSync(references), `${NEW}/references is missing`).toBe(true);
    const files = readdirSync(references);
    expect(files).toContain("nuxfire-content.md");
    expect(files).toContain("new-post-recipe.md");
  });
});

// ---------------------------------------------------------------------------------
// SPEC-0002: the three specialists of performance, search and copy (AC-011, T022)
// ---------------------------------------------------------------------------------

const THREE = [
  { name: "fireskill-specialist-web-performance", tags: ["performance", "web-vitals", "budgets"], files: ["apps/web/nuxt.config.ts"] },
  { name: "fireskill-specialist-seo", tags: ["seo", "sitemap", "structured-data"], files: ["apps/web/nuxt.config.ts"] },
  { name: "fireskill-specialist-copywriting", tags: ["copy", "microcopy", "claims"], files: ["apps/web/i18n/locales/en.json"] },
] as const;

describe("the specialists of performance, search and copy are registered (AC-011)", () => {
  // SPECSFY: US-006 FR-001 FR-003 FR-008 FR-012 NFR-007 AC-011
  it.each(THREE)("registers $name in catalog.json with tags and what it detects", ({ name, tags, files }) => {
    const entry = catalog.skills.find((skill) => skill.name === name);
    expect(entry, `${name} is not in catalog.json`).toBeDefined();
    expect(entry?.description.length).toBeGreaterThan(60);
    expect(entry?.tags).toEqual(expect.arrayContaining([...tags]));
    for (const file of files) expect(entry?.detect.files).toContain(file);
  });

  // SPECSFY: US-006 FR-001 FR-003 FR-008 FR-012 NFR-007 AC-011
  it.each(THREE)("routes to $name from fireskills/SKILL.md", ({ name }) => {
    expect(read("fireskills/SKILL.md")).toContain(name);
  });

  // SPECSFY: US-006 FR-001 FR-003 FR-008 FR-012 NFR-007 AC-011
  it("places the three among the Nuxfire stack specialists of the README", () => {
    const readme = read("fireskills/README.md");
    const stack = readme.slice(readme.indexOf("### Nuxfire Stack"), readme.indexOf("### Engineering"));
    for (const { name } of THREE) expect(stack, name).toContain(name);
  });

  // SPECSFY: US-006 FR-001 FR-003 FR-008 FR-012 NFR-007 AC-011
  it("counts 38 specialists", () => {
    expect(catalog.skills.length).toBe(38);
  });
});
