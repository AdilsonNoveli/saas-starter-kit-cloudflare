import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SPEC-0010 (Fase 3b), AC-046. The inventory and the documents describe the phase: the three
// account tables, the new screens and components, the onboarding flow, and cite only paths
// that exist.
const root = join(import.meta.dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");

// primitives-policy.test.ts keeps its path scanner private to that file (importing it would
// run its suite), so the citation scan below is written here for the paths this spec adds.
const DOCS = [
  ".fireskills/DATABASE.md",
  ".fireskills/INTERFACE.md",
  ".fireskills/PROJECT.md",
  ".fireskills/STACK.md",
  "layers/account/README.md",
];

describe("AC-046: documents reflect the account profile phase", () => {
  // SPECSFY: FR-018 NFR-005 NFR-007 AC-046
  it("DATABASE.md describes UserPreference, UserSession, EmailChangeRequest and the unique Team.slug index", () => {
    const text = read(".fireskills/DATABASE.md");
    const missing = ["UserPreference", "UserSession", "EmailChangeRequest"].filter((name) => !text.includes(name));
    expect(missing.join("\n")).toBe("");
    expect(text).toMatch(/Team[^\n]*slug[^\n]*unique|unique[^\n]*Team[^\n]*slug|UNIQUE[^\n]*slug|slug[^\n]*UNIQUE/i);
  });

  // SPECSFY: FR-018 NFR-005 NFR-007 AC-046
  it("INTERFACE.md registers the onboarding, the header actions, the switches, the sessions list, the e-mail change, the preferences form and UStepper", () => {
    const text = read(".fireskills/INTERFACE.md");
    const missing = [
      "onboarding",
      "AccountHeaderActions",
      "ColorModeSwitch",
      "LocaleSwitch",
      "AccountSessionsList",
      "AccountEmailChange",
      "AccountPreferencesForm",
      "UStepper",
    ].filter((name) => !text.includes(name));
    expect(missing.join("\n")).toBe("");
  });

  // SPECSFY: FR-018 NFR-005 NFR-007 AC-046
  it("PROJECT.md no longer lists preferences, the session list or the e-mail change as missing, and describes the onboarding", () => {
    const text = read(".fireskills/PROJECT.md");
    expect(text).not.toContain("and no e-mail change");
    expect(text).not.toContain("no device, IP or last-use exists");
    expect(text).not.toContain("is not stored on the user");
    expect(text).not.toMatch(/no phone, time zone, language or display name/);
    expect(text).toMatch(/onboarding/i);
  });

  // SPECSFY: FR-018 NFR-005 NFR-007 AC-046
  it("layers/account/README.md describes its migration history instead of saying it has none", () => {
    const text = read("layers/account/README.md");
    expect(text).not.toContain("No migration history yet");
    expect(text).toMatch(/migrations\/0000_account\.sql/);
    expect(text).toContain("drizzle.config.ts");
  });

  // SPECSFY: FR-018 NFR-005 NFR-007 AC-046
  it("the documents cite only paths that exist (new account, tokens and app component paths included)", () => {
    const CITED = /(?:layers\/account|packages\/tokens|apps\/app\/app)\/[\w{},.\-/[\]]+\.(?:vue|ts|sql|css)/g;
    const expand = (path: string): string[] => {
      const match = /^(.*)\{([^}]+)\}(.*)$/.exec(path);
      if (!match) return [path];
      return match[2].split(",").flatMap((part) => expand(`${match[1]}${part.trim()}${match[3]}`));
    };
    // The reader must find a citation, or the scan would pass vacuously.
    expect(expand("a/{b,c}.ts")).toEqual(["a/b.ts", "a/c.ts"]);
    const dangling = DOCS.flatMap((doc) => {
      const cited = new Set((read(doc).match(CITED) ?? []).flatMap(expand));
      return [...cited].filter((path) => !existsSync(join(root, path))).map((path) => `${doc} cites ${path}`);
    });
    expect(dangling.join("\n")).toBe("");
    // The new account components are part of what the documents must cite, so they must exist.
    for (const file of [
      "layers/account/server/database/schema.ts",
      "layers/account/migrations/0000_account.sql",
      "layers/account/app/layouts/onboarding.vue",
    ]) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });
});
