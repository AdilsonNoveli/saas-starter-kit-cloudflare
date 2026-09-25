import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// BDD source: specs/draft/0003-landing-refactor-one-offer/spec.md (AC-001, AC-002, AC-005; FR-001,
// FR-002, FR-005, FR-010, FR-013, FR-014, FR-015, NFR-003).
// The landing sells one offer. This file states what that means in files: the numbers come from the
// offer configuration, the words the owner ruled out are absent, the page has few sections, and the
// technical depth is a link to the docs.

const WEB = join(import.meta.dirname, "..", "..");
const LOCALES = { en: "en.json", "pt-br": "pt-BR.json", es: "es.json" } as const;

type Tree = { [key: string]: string | Tree };
const load = (file: string): Tree => JSON.parse(readFileSync(join(WEB, "i18n/locales", file), "utf8")) as Tree;

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const landing = Object.fromEntries(
  Object.entries(LOCALES).map(([code, file]) => {
    const all = flatten(load(file));
    return [code, Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith("landing.")))];
  }),
) as Record<keyof typeof LOCALES, Record<string, string>>;

const isTestimonial = (key: string): boolean => key.startsWith("landing.testimonials.");

describe("the three languages carry the same landing (FR-011)", () => {
  // SPECSFY: US-006 FR-011 AC-001
  it("has the same keys in en, pt-br and es", () => {
    const keys = (code: keyof typeof LOCALES): string[] => Object.keys(landing[code]).sort();
    expect(keys("pt-br")).toEqual(keys("en"));
    expect(keys("es")).toEqual(keys("en"));
  });

  // SPECSFY: US-001 FR-001 AC-001
  it("has the sections of the page and the offer, and nothing else at the top level", () => {
    const top = [...new Set(Object.keys(landing.en).map((key) => key.split(".")[1]))].sort();
    expect(top).toEqual(["audience", "faq", "hero", "method", "offer", "outcomes", "problem", "seoDescription", "seoTitle", "testimonials"]);
  });
});

describe("the numbers come from the offer, not from the text (FR-002, FR-005)", () => {
  // SPECSFY: US-001 US-002 FR-002 FR-005 AC-001 AC-002
  it("has no digit in a landing text outside the testimonials", () => {
    for (const [code, texts] of Object.entries(landing)) {
      for (const [key, value] of Object.entries(texts)) {
        if (isTestimonial(key)) continue;
        expect(value, `${code}:${key}`).not.toMatch(/\d/);
      }
    }
  });

  // SPECSFY: US-001 FR-002 AC-001
  it("asks for the price and the limit through placeholders in the hero and the offer", () => {
    for (const texts of Object.values(landing)) {
      expect(texts["landing.hero.priceLine"]).toMatch(/\{launch\}/);
      expect(texts["landing.hero.priceLine"]).toMatch(/\{regular\}/);
      expect(texts["landing.hero.priceLine"]).toMatch(/\{limit\}/);
      expect(texts["landing.offer.updates"]).toMatch(/\{months\}/);
      expect(texts["landing.offer.cta"]).toBeTruthy();
      expect(texts["landing.offer.ctaSoon"]).toBeTruthy();
    }
  });
});

describe("what the owner ruled out is not on the page (FR-013, FR-014, FR-015)", () => {
  const FORBIDDEN: [string, RegExp][] = [
    ["a community group or VIP club (eliminated)", /grupo|\bgroup\b|\bvip\b|club nuxfire|comunidad|community|comunidade/i],
    ["a demo (there is none)", /\bdemo\b|demonstra|demostraci/i],
    ["lifetime or an annual plan (one year of updates)", /lifetime|vital[íi]cio|de por vida|de por vida|\bannual\b|\banual\b|cont[íi]nu|continuous/i],
    ["a money-back guarantee the owner does not give", /money-back|garantia de \d|garant[íi]a de \d|14-day/i],
    ["the old numbers and absolutes", /40\+|hallucinat|alucin|million|milh|zero cold|battle-tested|hardware|gdpr|lgpd/i],
    ["a claim to be the first or the best", /the first (?:cloudflare|nuxt|kit|structure|starter)|primeir[oa] (?:estrutura|kit)|primera (?:estructura|kit)|the best|melhor kit|mejor kit/i],
  ];

  // SPECSFY: US-001 US-002 FR-013 FR-014 FR-015 AC-001 AC-002
  it.each(FORBIDDEN)("does not mention %s", (_label, pattern) => {
    for (const [code, texts] of Object.entries(landing)) {
      for (const [key, value] of Object.entries(texts)) {
        if (isTestimonial(key)) continue;
        expect(value, `${code}:${key}`).not.toMatch(pattern);
      }
    }
  });

  // SPECSFY: US-001 FR-015 AC-001
  it("states the refund only as the law requires", () => {
    for (const texts of Object.values(landing)) {
      expect(texts["landing.offer.refund"]).toMatch(/CDC|C[óo]digo de Defensa|Consumer|consumidor|consumer/i);
    }
  });
});

describe("the page is short and the depth is elsewhere (FR-010, NFR-003)", () => {
  const index = readFileSync(join(WEB, "app/pages/index.vue"), "utf8");
  const used = [...index.matchAll(/<(Landing[A-Za-z]+)/g)].map((match) => match[1]);

  // SPECSFY: US-005 FR-010 NFR-003 AC-005
  it("uses at most seven landing sections", () => {
    expect(used.length).toBeGreaterThan(0);
    expect(used.length).toBeLessThanOrEqual(7);
  });

  // SPECSFY: US-005 FR-010 NFR-003 AC-005
  it("no longer has the technical blocks, the badges, the marquee or the old pricing card", () => {
    for (const name of [
      "LandingUseCases",
      "LandingArchitecture",
      "LandingComparisonTable",
      "LandingFolderStructure",
      "LandingFeatureBadges",
      "LandingFeatureCard",
      "LandingDatabaseArchitecture",
      "LandingAvatars",
      "LandingPricing",
    ]) {
      expect(existsSync(join(WEB, "app/components/landing", `${name}.vue`)), name).toBe(false);
    }
    expect(existsSync(join(WEB, "app/components/testimonial/TestimonialRow.vue"))).toBe(false);
    expect(existsSync(join(WEB, "app/components/pricing/PricingCard.vue"))).toBe(false);
  });

  // SPECSFY: US-005 FR-010 NFR-003 AC-005
  it("keeps the landing text short: at most 8,000 characters in English", () => {
    const chars = Object.values(landing.en).join("").length;
    expect(chars).toBeLessThanOrEqual(8000);
  });

  // SPECSFY: US-005 FR-010 AC-005
  it("links every outcome and the method to a docs page that exists", () => {
    const outcomes = readFileSync(join(WEB, "app/components/landing/LandingOutcomes.vue"), "utf8");
    const method = readFileSync(join(WEB, "app/components/landing/LandingMethod.vue"), "utf8");
    const links = [...(outcomes + method).matchAll(/["'`](\/docs\/[a-z0-9\-/]+)["'`]/g)].map((match) => match[1]);
    expect(links.length).toBeGreaterThanOrEqual(7);
    for (const link of links) {
      const path = (link ?? "").replace(/^\/docs\//, "");
      const found = ["1.saas-starter-kit", "2.fireskills"].some((section) => docExists(section, path));
      expect(found, link).toBe(true);
    }
  });
});

function docExists(section: string, slug: string): boolean {
  // `/docs/saas-starter-kit/features/auth` maps to content/docs/1.saas-starter-kit/2.features/1.auth.md
  const parts = slug.split("/");
  const sectionName = section.replace(/^\d+\./, "");
  if (parts[0] !== sectionName) return false;
  let dir = join(WEB, "content/docs", section);
  for (const [index, part] of parts.slice(1).entries()) {
    const last = index === parts.length - 2;
    const names = existsSync(dir) ? readdirSync(dir) : [];
    const match = names.find((name) => name.replace(/^\d+\./, "").replace(/\.md$/, "") === part && (last ? name.endsWith(".md") : !name.endsWith(".md")));
    if (!match) return false;
    dir = join(dir, match);
  }
  return true;
}

describe("the head describes the page (FR-007)", () => {
  // SPECSFY: US-003 FR-007 AC-003
  it("has a specific title and a written description in every language", () => {
    for (const [code, texts] of Object.entries(landing)) {
      const title = texts["landing.seoTitle"] ?? "";
      const description = texts["landing.seoDescription"] ?? "";
      expect(title, code).not.toMatch(/demo saas|saas de demostraci/i);
      expect(title.length, code).toBeGreaterThanOrEqual(20);
      expect(title.length, code).toBeLessThanOrEqual(60);
      expect(description.length, code).toBeGreaterThanOrEqual(80);
      expect(description.length, code).toBeLessThanOrEqual(170);
    }
  });
});
