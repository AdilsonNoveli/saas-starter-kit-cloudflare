import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AC-038 and AC-041 (SPEC-0010): the word for a tenant is Space / Espaço /
// Espacio in the touched screens, the teams layer owns its locale files, and
// the copy baseline only shrinks while those screens leave it.
const root = join(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(join(root, relative), "utf8");
const readJson = (relative: string) => JSON.parse(read(relative)) as unknown;

type Locale = "en" | "pt-BR" | "es";
const LOCALES: Locale[] = ["en", "pt-BR", "es"];

/** Words that mean "Space" in the old vocabulary, per locale file. */
const OLD_WORD: Record<Locale, RegExp> = {
  en: /\bteams?\b/i,
  "pt-BR": /\b(times?|equipes?)\b/i,
  es: /\bequipos?\b/i,
};
const NEW_WORD: Record<Locale, RegExp> = {
  en: /\bSpaces?\b/i,
  // No trailing \b: "ç" is not a word character for a non-unicode RegExp.
  "pt-BR": /\bEspaço/i,
  es: /\bEspacios?\b/i,
};

function flatten(value: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      for (const [k, v] of flatten(child, prefix ? `${prefix}.${key}` : key)) out.set(k, v);
    }
  } else if (typeof value === "string") {
    out.set(prefix, value);
  }
  return out;
}

function checkLocaleSet(dir: string, { requireNewWord }: { requireNewWord: boolean }) {
  const byLocale = new Map(LOCALES.map((locale) => [locale, flatten(readJson(`${dir}/${locale}.json`))]));
  const enKeys = [...(byLocale.get("en")?.keys() ?? [])].sort();
  for (const locale of LOCALES) {
    const entries = byLocale.get(locale) ?? new Map<string, string>();
    expect([...entries.keys()].sort(), `${dir}/${locale}.json has the same keys as en`).toEqual(enKeys);
    const oldWord = [...entries].filter(([, text]) => OLD_WORD[locale].test(text)).map(([key]) => key);
    expect(oldWord, `${dir}/${locale}.json still says team/time/equipo`).toEqual([]);
    if (requireNewWord) {
      const values = [...entries.values()].join("\n");
      expect(values, `${dir}/${locale}.json names the Space`).toMatch(NEW_WORD[locale]);
    }
  }
}

/** Literal text a person reads in a .vue template: text nodes and static text attributes, interpolations removed. */
function templateLiterals(source: string): string[] {
  const start = source.indexOf("<template>");
  const end = source.lastIndexOf("</template>");
  if (start < 0 || end < 0) return [];
  const template = source
    .slice(start, end)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{[\s\S]*?\}\}/g, " ");
  const attributes = [
    ...template.matchAll(/\s(?:title|label|placeholder|description|text|alt|aria-label)="([^"]*)"/g),
  ].map((match) => match[1] ?? "");
  const textNodes = template
    .replace(/<[^>]*>/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return [...attributes, ...textNodes];
}

const SPACE_SCREENS = [
  "layers/teams/app/components/TeamCreateModal.vue",
  "layers/teams/app/components/TeamSwitcher.vue",
  "layers/teams/app/components/TeamSwitcherDropdown.vue",
  "layers/teams/app/pages/select-team.vue",
  "layers/teams/app/pages/invite/[[id]].vue",
  "layers/teams/app/pages/[[team]]/settings.vue",
  "layers/teams/app/pages/[[team]]/settings/index.vue",
  "layers/teams/app/pages/[[team]]/settings/members.vue",
  "layers/teams/app/pages/[[team]]/settings/security.vue",
];

// Count of `allow` entries in scripts/copy-baseline.json on 2026-10-07, before SPEC-0010's
// extractions. The baseline only shrinks (RULES.md, copy contract).
const BASELINE_CEILING = 252;
const EXTRACTED_FILES = [
  "layers/teams/app/components/TeamCreateModal.vue",
  "layers/teams/app/components/TeamSwitcher.vue",
  "layers/teams/app/components/TeamSwitcherDropdown.vue",
];
// layers/teams allowances that existed on 2026-10-07 (file → count). None may be added.
const TEAMS_ALLOWANCES_TODAY: Record<string, number> = {
  "layers/teams/app/components/TeamCreateModal.vue": 6,
  "layers/teams/app/components/TeamInvitesListItem.vue": 1,
  "layers/teams/app/components/TeamSwitcher.vue": 6,
  "layers/teams/app/pages/[[team]]/settings.vue": 1,
  "layers/teams/app/pages/[[team]]/settings/index.vue": 5,
  "layers/teams/app/pages/[[team]]/settings/members.vue": 9,
  "layers/teams/app/pages/[[team]]/settings/security.vue": 6,
  "layers/teams/app/pages/invite/[[id]].vue": 7,
  "layers/teams/app/pages/select-team.vue": 1,
};

describe("Space vocabulary (AC-038)", () => {
  // SPECSFY: US-006 FR-016 NFR-005 AC-038
  it("declares i18n in the teams layer and names the Space in its three locale files", () => {
    const config = read("layers/teams/nuxt.config.ts");
    expect(config).toMatch(/\bi18n\s*:\s*\{[\s\S]*?\blocales\s*:/);
    for (const file of ["en.json", "pt-BR.json", "es.json"]) {
      expect(config, `layers/teams/nuxt.config.ts loads ${file}`).toContain(file);
    }
    checkLocaleSet("layers/teams/i18n/locales", { requireNewWord: true });
  });

  // SPECSFY: US-006 FR-016 NFR-005 AC-038
  it("uses Space, Espaço and Espacio in the billing and app locale values", () => {
    checkLocaleSet("layers/billing/i18n/locales", { requireNewWord: true });
    checkLocaleSet("apps/app/i18n/locales", { requireNewWord: false });
  });

  // SPECSFY: US-006 FR-016 NFR-005 AC-038
  it("leaves no English literal about a team in the templates of the Space screens", () => {
    const offenders = SPACE_SCREENS.flatMap((file) =>
      templateLiterals(read(file))
        .filter((text) => /\bteams?\b/i.test(text))
        .map((text) => `${file}: ${text}`),
    );
    expect(offenders).toEqual([]);
  });
});

describe("copy baseline (AC-041)", () => {
  // SPECSFY: US-006 FR-016 NFR-005 AC-041
  it("never grows, adds nothing for layers/teams and drops the allowances of the extracted files", () => {
    const baseline = readJson("scripts/copy-baseline.json") as { allow: { where: string }[] };
    expect(baseline.allow.length).toBeLessThanOrEqual(BASELINE_CEILING);

    const teamsCounts: Record<string, number> = {};
    for (const entry of baseline.allow) {
      if (entry.where.startsWith("layers/teams/")) {
        teamsCounts[entry.where] = (teamsCounts[entry.where] ?? 0) + 1;
      }
    }
    for (const [file, count] of Object.entries(teamsCounts)) {
      expect(count, `${file} gained an allowance`).toBeLessThanOrEqual(TEAMS_ALLOWANCES_TODAY[file] ?? 0);
    }

    const stillAllowed = baseline.allow
      .filter((entry) => EXTRACTED_FILES.includes(entry.where))
      .map((entry) => entry.where);
    expect(stillAllowed).toEqual([]);
  });
});
