import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// BDD source: specs/*/0001-content-seo-metadata/spec.md (AC-008, FR-011). The blog
// frontmatter is a contract with three audiences (the Nuxt Content schema, the docs in
// three languages and the specialist agents read). This test fails when the schema gains
// or loses a field and the documentation is not updated with it.

const ROOT = join(import.meta.dirname, "..");
const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

/**
 * Top-level keys of the `blog` collection schema, read from `content.config.ts`.
 * `content.config.ts` cannot be imported outside Nuxt (its `z` needs the module context),
 * so the object literal is scanned by brace depth.
 */
function blogSchemaFields(source: string): string[] {
  const start = source.indexOf("blog: defineCollection(");
  const open = source.indexOf("z.object({", start);
  if (start < 0 || open < 0) return [];
  const fields: string[] = [];
  let depth = 0;
  let index = open + "z.object(".length;
  let line = "";
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{" || char === "(" || char === "[") depth += 1;
    else if (char === "}" || char === ")" || char === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
    if (char === "\n") {
      line = "";
      continue;
    }
    line += char;
    const key = depth === 1 ? line.match(/^\s{8}([A-Za-z][A-Za-z0-9]*):\s/) : null;
    if (key && !fields.includes(key[1])) fields.push(key[1]);
  }
  return fields;
}

const BLOG_DOCS = [
  { lang: "en", file: "apps/web/content/docs/1.saas-starter-kit/2.features/14.blog.md" },
  { lang: "pt-br", file: "apps/web/content/pt-br/docs/1.saas-starter-kit/2.features/14.blog.md" },
  { lang: "es", file: "apps/web/content/es/docs/1.saas-starter-kit/2.features/14.blog.md" },
];

const fields = blogSchemaFields(read("apps/web/content.config.ts"));

describe("the blog schema and its documentation (AC-008)", () => {
  // SPECSFY: US-005 FR-011 AC-008
  it("finds the fields of the blog schema", () => {
    expect(fields).toEqual(
      expect.arrayContaining(["date", "author", "lang", "translations", "updated", "ogImage", "authorType"]),
    );
  });

  // SPECSFY: US-005 FR-011 AC-008
  it.each(BLOG_DOCS)("the $lang blog page documents every frontmatter field", ({ file }) => {
    const doc = read(file);
    const missing = fields.filter((field) => !doc.includes(`\`${field}\``));
    expect(missing, `${file} does not mention: ${missing.join(", ")}`).toEqual([]);
  });

  // SPECSFY: US-005 FR-011 AC-008
  it.each(BLOG_DOCS)("the $lang blog page shows the commands of the gate", ({ file }) => {
    const doc = read(file);
    expect(doc).toContain("bun run check:seo");
    expect(doc).toContain("bun run generate:og");
  });

  // SPECSFY: US-005 FR-011 AC-008
  it.each(BLOG_DOCS)("the $lang blog page shows a frontmatter example with lang", ({ file }) => {
    expect(read(file)).toMatch(/^lang: "?(en|pt-br|es)"?$/m);
  });
});

describe("the commands and the rules are registered (AC-008)", () => {
  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("declares check:seo and generate:og as root scripts", () => {
    const scripts = (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts;
    expect(scripts["check:seo"]).toMatch(/check-seo/);
    expect(scripts["generate:og"]).toMatch(/generate-og-images/);
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("lists the commands in the Fireskills command table", () => {
    const skill = read("fireskills/SKILL.md");
    expect(skill).toContain("bun run check:seo");
    expect(skill).toContain("bun run generate:og");
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("states the content rules in the project rules", () => {
    const rules = read(".fireskills/RULES.md");
    expect(rules).toContain("check:seo");
    expect(rules).toMatch(/`lang`/);
    expect(rules).toMatch(/`translations`/);
  });

  // SPECSFY: US-005 FR-010 FR-011 AC-008
  it("makes the agent instructions point at the specialist for posts", () => {
    expect(read("fireskills/SKILL.md")).toMatch(/blog|post/i);
    expect(read("AGENTS.md")).toContain("check:seo");
  });
});

// ---------------------------------------------------------------------------------
// SPEC-0002: routing text, package scripts and the docs in three languages (AC-011)
// ---------------------------------------------------------------------------------

describe("the routing of pages and text to the new specialists is written down (AC-011)", () => {
  // SPECSFY: US-006 FR-003 FR-008 FR-012 NFR-007 AC-011
  it("makes AGENTS.md route every human-readable text to the copy specialist and name the gates", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("fireskill-specialist-copywriting");
    expect(agents).toMatch(/human-readable/i);
    expect(agents).toContain("check:copy");
    expect(agents).toContain("check:perf");
  });

  // SPECSFY: US-006 FR-003 FR-008 FR-012 NFR-007 AC-011
  it("states the rules in the project rules", () => {
    const rules = read(".fireskills/RULES.md");
    expect(rules).toContain("fireskill-specialist-copywriting");
    expect(rules).toContain("fireskill-specialist-web-performance");
    expect(rules).toContain("fireskill-specialist-seo");
    expect(rules).toContain("CLAIMS.yml");
    expect(rules).toMatch(/human-readable/i);
  });

  // SPECSFY: US-006 FR-003 FR-008 FR-012 NFR-007 AC-011
  it("routes text, page-weight and search work in the routing table of fireskills/SKILL.md", () => {
    const skill = read("fireskills/SKILL.md");
    const row = (name: string): string => skill.split(/\r?\n/).find((line) => line.includes(name) && line.startsWith("|")) ?? "";
    expect(row("fireskill-specialist-copywriting")).toMatch(/locales|packages\/emails|human-readable/i);
    expect(row("fireskill-specialist-web-performance")).toMatch(/perf-budgets|routeRules|bundle|hydration/i);
    expect(row("fireskill-specialist-seo")).toMatch(/robots|_redirects|sitemap|structured/i);
    expect(skill).toContain("bun run check:perf");
    expect(skill).toContain("bun run check:copy");
  });
});

describe("the docs in three languages describe the three specialists (AC-011)", () => {
  const stacks = [
    { lang: "en", file: "apps/web/content/docs/2.fireskills/4.specialists/1.nuxfire-stack.md" },
    { lang: "pt-br", file: "apps/web/content/pt-br/docs/2.fireskills/4.specialists/1.nuxfire-stack.md" },
    { lang: "es", file: "apps/web/content/es/docs/2.fireskills/4.specialists/1.nuxfire-stack.md" },
  ];
  const names = ["fireskill-specialist-web-performance", "fireskill-specialist-seo", "fireskill-specialist-copywriting"];

  // SPECSFY: US-006 FR-012 NFR-007 AC-011
  it.each(stacks)("the $lang stack page has a numbered section for each specialist", ({ file }) => {
    const page = read(file);
    for (const name of names) expect(page, name).toMatch(new RegExp("^## \\d+\\. `" + name + "`", "m"));
  });

  // SPECSFY: US-006 FR-012 NFR-007 AC-011
  it.each(stacks)("the $lang stack page names the gates and the claim ledger", ({ file }) => {
    const page = read(file);
    for (const word of ["check:perf", "check:copy", "CLAIMS.yml", "IndexNow"]) expect(page, word).toContain(word);
  });
});
