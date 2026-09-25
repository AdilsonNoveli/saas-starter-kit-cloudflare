import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { applyAllowances } from "./allowances";
import {
  auditClaims,
  auditLiterals,
  auditTestimonials,
  auditUrgency,
  detectClaims,
  flattenLocale,
  scanLiterals,
  validateLedger,
  verifyClaim,
  type CopyConfig,
  type Ledger,
  type VerifyIO,
} from "./copy-rules";
import type { Violation } from "./seo-rules";

// BDD source: specs/*/0002-web-performance-search-copy-specialists/spec.md (AC-007 to AC-009).
// The primary texts read for this spec put the burden of proof on whoever advertises (CDC
// art. 38) and forbid invented testimonials and urgency (16 CFR 465.2, Directive 2005/29/EC
// Annex I(7)). The ledger makes the proof a file a machine can check.

const NOW = "2026-09-25";
const rules = (violations: Violation[]): string[] => [...new Set(violations.map((v) => v.rule))].sort();

const CONFIG: CopyConfig = {
  marketingNamespaces: ["landing"],
  claimPatterns: [
    { name: "percentage", regex: "\\d+(?:[.,]\\d+)?\\s?%" },
    { name: "count", regex: "\\b\\d[\\d.,]*\\+?\\s+(?:audited|verified|tables?|features?|devs?|specialists?)" },
    { name: "absolute", regex: "\\b(?:zero|never|millions?|guaranteed)\\b" },
  ],
  urgencyPatterns: [
    { name: "today-only", regex: "\\b(?:only today|today only|last spots?|ends tonight)\\b" },
    { name: "limited-time", regex: "\\blimited[- ]time\\b" },
  ],
  testimonialKeyPattern: "^landing\\.testimonials\\.items\\.",
  staticImagePattern: "/static/[A-Za-z0-9_-]+\\.(?:jpe?g|png|webp)",
  literalAttributes: ["label", "title", "placeholder", "description", "aria-label", "alt", "subtitle", "text", "tooltip"],
};

const evidence = {
  count: { kind: "repo-count", files: ["layers/*/schema.ts"], pattern: "pgTable\\(", equals: 3 },
};

function ledger(overrides: Partial<Ledger> = {}): Ledger {
  return {
    schema: 1,
    claims: [
      {
        id: "tables-audited",
        keys: ["landing.db.title"],
        statement: "3 audited tables",
        evidence: evidence.count,
        verifiedAt: "2026-09-25",
        owner: "Adilson",
      },
    ],
    notClaims: [],
    testimonials: [],
    offers: [],
    ...overrides,
  };
}

function io(files: Record<string, string>): VerifyIO {
  const globToRegex = (glob: string): RegExp => new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$");
  return {
    files: (glob) => Object.keys(files).filter((file) => globToRegex(glob).test(file)),
    read: (file) => files[file] ?? "",
    exists: (file) => file in files,
  };
}

const SCHEMAS = {
  "layers/a/schema.ts": "export const a = pgTable('a'); export const b = pgTable('b');",
  "layers/b/schema.ts": "export const c = pgTable('c');",
};

// ---------------------------------------------------------------------------------
// The ledger (AC-007)
// ---------------------------------------------------------------------------------

describe("validating the ledger schema (AC-007)", () => {
  // SPECSFY: US-004 FR-009 NFR-001 NFR-002 AC-007
  it("accepts a complete ledger", () => {
    expect(validateLedger(ledger())).toEqual([]);
  });

  // SPECSFY: US-004 FR-009 NFR-001 NFR-002 AC-007
  it("rejects anything that is not an object with schema 1 and the four lists", () => {
    expect(rules(validateLedger(null))).toEqual(["ledger-invalid"]);
    expect(rules(validateLedger({ ...ledger(), schema: 2 }))).toEqual(["ledger-invalid"]);
    expect(rules(validateLedger({ schema: 1 }))).toEqual(["ledger-invalid"]);
  });

  // SPECSFY: US-004 FR-009 NFR-001 NFR-002 AC-007
  it("rejects a claim without id, keys, statement, owner or a valid verification date", () => {
    const base = ledger().claims[0];
    for (const broken of [
      { ...base, id: "" },
      { ...base, id: "Not Kebab" },
      { ...base, keys: [] },
      { ...base, statement: " " },
      { ...base, owner: "" },
      { ...base, verifiedAt: "yesterday" },
    ]) {
      expect(rules(validateLedger(ledger({ claims: [broken] }))), JSON.stringify(broken)).toEqual(["ledger-invalid"]);
    }
  });

  // SPECSFY: US-004 FR-009 NFR-001 NFR-002 AC-007
  it("rejects a duplicated claim id and a key claimed twice", () => {
    const base = ledger().claims[0];
    expect(rules(validateLedger(ledger({ claims: [base, { ...base, keys: ["landing.other"] }] })))).toEqual(["ledger-invalid"]);
    expect(rules(validateLedger(ledger({ claims: [base, { ...base, id: "second" }] })))).toEqual(["ledger-invalid"]);
  });

  // SPECSFY: US-004 FR-009 NFR-001 NFR-002 AC-007
  it("requires the fields of each evidence kind", () => {
    const base = ledger().claims[0];
    const withEvidence = (e: unknown) => ledger({ claims: [{ ...base, evidence: e as never }] });
    expect(validateLedger(withEvidence({ kind: "repo-file", path: "a.ts" }))).toEqual([]);
    expect(validateLedger(withEvidence({ kind: "url", url: "https://example.com/x", retrieved: "2026-09-25" }))).toEqual([]);
    expect(validateLedger(withEvidence({ kind: "owner-statement", by: "Adilson", on: "2026-09-25" }))).toEqual([]);
    for (const bad of [
      { kind: "repo-count", files: [], pattern: "x", equals: 1 },
      { kind: "repo-count", files: ["a"], pattern: "(", equals: 1 },
      { kind: "repo-count", files: ["a"], pattern: "x", equals: 1.5 },
      { kind: "repo-file" },
      { kind: "url", url: "https://example.com/x" },
      { kind: "url", url: "ftp://example.com/x", retrieved: "2026-09-25" },
      { kind: "owner-statement", by: "Adilson" },
      { kind: "magic" },
    ]) {
      expect(rules(validateLedger(withEvidence(bad))), JSON.stringify(bad)).toEqual(["ledger-invalid"]);
    }
  });

  // SPECSFY: US-004 FR-009 NFR-001 NFR-002 AC-007
  it("requires a reason for each not-a-claim, a date for each offer and the flags of each testimonial", () => {
    expect(rules(validateLedger(ledger({ notClaims: [{ key: "landing.v", reason: "" }] })))).toEqual(["ledger-invalid"]);
    expect(rules(validateLedger(ledger({ offers: [{ key: "landing.o", endsAt: "soon", source: "billing" }] })))).toEqual(["ledger-invalid"]);
    const testimonial = { id: "t1", key: "landing.testimonials.items.item1", name: "A", personExists: true, usedProduct: true, consent: true, image: "/static/a.jpeg", provenance: "email 2026-09-01" };
    expect(validateLedger(ledger({ testimonials: [testimonial] }))).toEqual([]);
    expect(rules(validateLedger(ledger({ testimonials: [{ ...testimonial, consent: "yes" as never }] })))).toEqual(["ledger-invalid"]);
  });
});

describe("the verifiers (AC-007)", () => {
  const claim = (e: unknown) => ({ ...ledger().claims[0], evidence: e as never });

  // SPECSFY: US-004 FR-009 NFR-001 AC-007
  it("repo-count passes when the pattern is found exactly `equals` times across the files", () => {
    expect(verifyClaim(claim(evidence.count), io(SCHEMAS), NOW)).toEqual([]);
  });

  // SPECSFY: US-004 FR-009 NFR-001 AC-007
  it("repo-count fails with the measured and the claimed value when they differ", () => {
    const found = verifyClaim(claim({ ...evidence.count, equals: 20 }), io(SCHEMAS), NOW);
    expect(rules(found)).toEqual(["claim-verifier"]);
    expect(found[0].message).toContain("3");
    expect(found[0].message).toContain("20");
  });

  // SPECSFY: US-004 FR-009 NFR-001 AC-007
  it("repo-count fails when no file matches, naming the pattern of files", () => {
    const found = verifyClaim(claim({ ...evidence.count, files: ["nowhere/*.ts"] }), io(SCHEMAS), NOW);
    expect(rules(found)).toEqual(["claim-verifier"]);
    expect(found[0].message).toContain("nowhere/*.ts");
  });

  // SPECSFY: US-004 FR-009 NFR-001 AC-007
  it("repo-file needs the file to exist and, when asked, to contain a pattern", () => {
    expect(verifyClaim(claim({ kind: "repo-file", path: "layers/a/schema.ts" }), io(SCHEMAS), NOW)).toEqual([]);
    expect(rules(verifyClaim(claim({ kind: "repo-file", path: "layers/z/schema.ts" }), io(SCHEMAS), NOW))).toEqual(["claim-verifier"]);
    expect(verifyClaim(claim({ kind: "repo-file", path: "layers/a/schema.ts", contains: "pgTable" }), io(SCHEMAS), NOW)).toEqual([]);
    expect(rules(verifyClaim(claim({ kind: "repo-file", path: "layers/a/schema.ts", contains: "nothing-here" }), io(SCHEMAS), NOW))).toEqual(["claim-verifier"]);
  });

  // SPECSFY: US-004 FR-009 NFR-001 AC-007
  it("url evidence needs a retrieved date that is not in the future; owner statements need a name and a date", () => {
    expect(verifyClaim(claim({ kind: "url", url: "https://example.com/x", retrieved: "2026-09-25" }), io({}), NOW)).toEqual([]);
    expect(rules(verifyClaim(claim({ kind: "url", url: "https://example.com/x", retrieved: "2026-12-01" }), io({}), NOW))).toEqual(["claim-evidence"]);
    expect(rules(verifyClaim(claim({ kind: "url", url: "https://example.com/x" }), io({}), NOW))).toEqual(["claim-evidence"]);
    expect(verifyClaim(claim({ kind: "owner-statement", by: "Adilson", on: "2026-09-25" }), io({}), NOW)).toEqual([]);
    expect(rules(verifyClaim(claim({ kind: "owner-statement", by: "", on: "2026-09-25" }), io({}), NOW))).toEqual(["claim-evidence"]);
  });

  // SPECSFY: US-004 FR-009 NFR-001 AC-007
  it("rejects a verification date in the future", () => {
    const future = { ...claim(evidence.count), verifiedAt: "2027-01-01" };
    expect(rules(verifyClaim(future, io(SCHEMAS), NOW))).toEqual(["claim-evidence"]);
  });
});

// ---------------------------------------------------------------------------------
// Claims in the marketing text (AC-007)
// ---------------------------------------------------------------------------------

describe("claims in the marketing namespaces need a ledger entry (AC-007)", () => {
  const strings = (map: Record<string, string>) => ({ en: map });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("flattens a locale file into dotted keys", () => {
    expect(flattenLocale({ a: { b: "x", c: ["y", "z"] }, d: "w", e: 3 })).toEqual({ "a.b": "x", "a.c.0": "y", "a.c.1": "z", d: "w" });
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("detects percentages, counted things and absolutes, only inside the marketing namespaces", () => {
    const found = detectClaims(
      { "landing.a": "20 audited tables", "landing.b": "Cut cost by 80%", "landing.c": "Zero cold starts", "landing.d": "Plain words", "blog.x": "80% faster" },
      CONFIG,
    );
    expect(found.map((f) => f.key).sort()).toEqual(["landing.a", "landing.b", "landing.c"]);
    expect(found.find((f) => f.key === "landing.b")?.pattern).toBe("percentage");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("reports a claim without an entry, naming the key, the locale and the pattern", () => {
    const found = auditClaims({ strings: strings({ "landing.db.title": "20 audited tables" }), ledger: ledger({ claims: [] }), config: CONFIG, io: io(SCHEMAS), now: NOW });
    expect(rules(found)).toEqual(["claim-unproven"]);
    expect(found[0].where).toBe("en:landing.db.title");
    expect(found[0].message).toContain("count");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("reports the measured value when the entry exists but its verifier does not hold", () => {
    const wrong = ledger({ claims: [{ ...ledger().claims[0], statement: "21 audited tables", evidence: { ...evidence.count, equals: 21 } }] });
    const found = auditClaims({ strings: strings({ "landing.db.title": "21 audited tables" }), ledger: wrong, config: CONFIG, io: io(SCHEMAS), now: NOW });
    expect(rules(found)).toEqual(["claim-verifier"]);
    expect(found[0].message).toContain("3");
    expect(found[0].message).toContain("21");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("passes a proven claim, in every locale that shares the key", () => {
    const found = auditClaims({
      strings: { en: { "landing.db.title": "3 audited tables" }, "pt-br": { "landing.db.title": "3 tabelas auditadas" } },
      ledger: ledger(),
      config: CONFIG,
      io: io(SCHEMAS),
      now: NOW,
    });
    expect(found).toEqual([]);
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("lets a number that is not a claim pass only with a not-a-claim entry and a reason", () => {
    const text = strings({ "landing.v": "Version 4 is here, 100% typed" });
    expect(rules(auditClaims({ strings: text, ledger: ledger({ claims: [] }), config: CONFIG, io: io({}), now: NOW }))).toEqual(["claim-unproven"]);
    const ok = ledger({ claims: [], notClaims: [{ key: "landing.v", reason: "a version number, not a measure" }] });
    expect(auditClaims({ strings: text, ledger: ok, config: CONFIG, io: io({}), now: NOW })).toEqual([]);
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("reports a claim whose numbers are not in the text it covers, in each locale", () => {
    const found = auditClaims({
      strings: { en: { "landing.db.title": "20 audited tables" }, "pt-br": { "landing.db.title": "3 tabelas auditadas" } },
      ledger: ledger(),
      config: CONFIG,
      io: io(SCHEMAS),
      now: NOW,
    });
    expect(rules(found)).toEqual(["claim-text-mismatch"]);
    expect(found).toHaveLength(1);
    expect(found[0].where).toBe("en:landing.db.title");
    expect(found[0].message).toContain("3");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("reports a ledger entry that points to a key that does not exist", () => {
    const found = auditClaims({ strings: strings({ "landing.other": "Plain words" }), ledger: ledger(), config: CONFIG, io: io(SCHEMAS), now: NOW });
    expect(rules(found)).toEqual(["ledger-invalid"]);
    expect(found[0].message).toContain("landing.db.title");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 NFR-001 AC-007
  it("can be grandfathered by an allowance with an owner and goes stale when the claim is fixed", () => {
    const unproven = auditClaims({ strings: strings({ "landing.x": "80% cheaper" }), ledger: ledger({ claims: [] }), config: CONFIG, io: io({}), now: NOW });
    const allow = [{ rule: "claim-unproven", where: "en:landing.x", removedBy: "SPEC-0003", since: NOW }];
    expect(applyAllowances(unproven, allow).remaining).toEqual([]);
    const fixed = auditClaims({ strings: strings({ "landing.x": "Cheaper" }), ledger: ledger({ claims: [] }), config: CONFIG, io: io({}), now: NOW });
    expect(rules(applyAllowances(fixed, allow).problems)).toEqual(["allowance-stale"]);
  });
});

// ---------------------------------------------------------------------------------
// Text outside the locale files (AC-008)
// ---------------------------------------------------------------------------------

describe("the literal-text scanner (AC-008)", () => {
  const scan = (template: string): string[] => scanLiterals(`<template>${template}</template>`);

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("finds text nodes and static attributes and ignores bindings, comments and script", () => {
    expect(scan("<h1>Hello world</h1>")).toEqual(["Hello world"]);
    expect(scan('<UButton label="Save changes" />')).toEqual(["Save changes"]);
    expect(scan('<UInput placeholder="Your email" :label="t(\'x\')" />')).toEqual(["Your email"]);
    expect(scan("<p>{{ $t('a.b') }}</p>")).toEqual([]);
    expect(scan("<!-- Leftover words --><p>{{ x }}</p>")).toEqual([]);
    expect(scanLiterals("<template><p>{{ x }}</p></template><script setup>const a = 'Some words'</script>")).toEqual([]);
  });

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("keeps the words around an interpolation and skips numbers, symbols, entities and empty attributes", () => {
    expect(scan("<p>Hello {{ name }}, welcome</p>")).toEqual(["Hello", ", welcome"].filter((s) => /[A-Za-z]{2}/.test(s)));
    expect(scan("<span>42</span><span>—</span><span>&nbsp;</span><span>x</span>")).toEqual([]);
    expect(scan('<img alt="" src="/a.png"><UIcon name="i-lucide-x" />')).toEqual([]);
  });

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("finds the same text in a multi-line element", () => {
    expect(scan("<p\n  class=\"x\"\n>\n  Two lines\n  of text\n</p>")).toEqual(["Two lines of text"]);
  });
});

describe("new literal text is refused (AC-008)", () => {
  const files = { "apps/app/A.vue": "<template><h1>Dashboard</h1></template>" };

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("reports each literal with the file and the text", () => {
    const found = auditLiterals(files);
    expect(rules(found)).toEqual(["literal-text"]);
    expect(found[0].where).toBe("apps/app/A.vue");
    expect(found[0].message).toContain("Dashboard");
  });

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("passes once the text is a locale key, and a baselined literal is accepted", () => {
    expect(auditLiterals({ "apps/app/A.vue": "<template><h1>{{ $t('dashboard.title') }}</h1></template>" })).toEqual([]);
    const allow = [{ rule: "literal-text", where: "apps/app/A.vue", match: "Dashboard", removedBy: "BACKLOG-app-ui-copy", since: NOW }];
    expect(applyAllowances(auditLiterals(files), allow).remaining).toEqual([]);
  });

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("fails as stale when a baselined literal was removed and the baseline was not lowered", () => {
    const allow = [{ rule: "literal-text", where: "apps/app/A.vue", match: "Dashboard", removedBy: "BACKLOG-app-ui-copy", since: NOW }];
    const moved = auditLiterals({ "apps/app/A.vue": "<template><h1>{{ $t('dashboard.title') }}</h1></template>" });
    expect(rules(applyAllowances(moved, allow).problems)).toEqual(["allowance-stale"]);
  });

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("matches a baselined literal exactly: a literal that contains another one does not use up its entry", () => {
    const both = { "apps/app/B.vue": '<template><b>Add feature</b><p>Click "Add feature" to start</p></template>' };
    const found = auditLiterals(both);
    expect(found).toHaveLength(2);
    const allow = ["Add feature", 'Click "Add feature" to start'].map((match) => ({ rule: "literal-text", where: "apps/app/B.vue", match, removedBy: "BACKLOG-app-ui-copy", since: NOW }));
    const { remaining, problems } = applyAllowances(found, allow);
    expect(remaining).toEqual([]);
    expect(problems).toEqual([]);
  });

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("has no inline ignore comment: the only exception is the dated, owned baseline (DEC-016)", () => {
    const ignored = { "apps/app/A.vue": "<template><!-- copy-ignore --><h1>Dashboard</h1></template>" };
    expect(rules(auditLiterals(ignored))).toEqual(["literal-text"]);
  });
});

// ---------------------------------------------------------------------------------
// Urgency, testimonials (AC-009)
// ---------------------------------------------------------------------------------

describe("urgency needs a dated, real limit (AC-009)", () => {
  const offer = (endsAt: string) => ledger({ claims: [], offers: [{ key: "landing.promo", endsAt, source: "infra/billing: coupon EARLY expires" }] });
  const text = { en: { "landing.promo": "Only today: 20% off" } };

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-009
  it("reports an urgency phrase with no offer record", () => {
    const found = auditUrgency({ strings: text, ledger: ledger({ claims: [] }), config: CONFIG, files: {}, now: NOW });
    expect(rules(found)).toEqual(["urgency-unproven"]);
    expect(found[0].where).toBe("en:landing.promo");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-009
  it("accepts the phrase while the recorded limit is in the future and rejects it once it passed", () => {
    expect(auditUrgency({ strings: text, ledger: offer("2026-12-31"), config: CONFIG, files: {}, now: NOW })).toEqual([]);
    expect(auditUrgency({ strings: text, ledger: offer("2026-09-25"), config: CONFIG, files: {}, now: NOW })).toEqual([]);
    const expired = auditUrgency({ strings: text, ledger: offer("2026-09-24"), config: CONFIG, files: {}, now: NOW });
    expect(rules(expired)).toEqual(["urgency-unproven"]);
    expect(expired[0].message).toContain("expired");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-009
  it("reports a countdown component that no offer record backs", () => {
    const files = { "apps/web/app/components/landing/Promo.vue": "<template><LandingCountdown :to=\"date\" /></template>" };
    const found = auditUrgency({ strings: {}, ledger: ledger({ claims: [] }), config: CONFIG, files, now: NOW });
    expect(rules(found)).toEqual(["urgency-unproven"]);
    expect(found[0].where).toBe("apps/web/app/components/landing/Promo.vue");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-009
  it("does not look outside the marketing namespaces", () => {
    const found = auditUrgency({ strings: { en: { "blog.title": "Only today" } }, ledger: ledger({ claims: [] }), config: CONFIG, files: {}, now: NOW });
    expect(found).toEqual([]);
  });
});

describe("testimonials need a person, a use, a consent and their own photo (AC-009)", () => {
  const strings = { en: { "landing.testimonials.items.item1.name": "Alex", "landing.testimonials.items.item1.quote": "It works", "landing.title": "Hello" } };
  const good = { id: "t1", key: "landing.testimonials.items.item1", name: "Alex", personExists: true, usedProduct: true, consent: true, image: "/static/a.jpeg", provenance: "email 2026-09-01" };
  const audit = (led: Ledger, files: Record<string, string> = {}) => auditTestimonials({ strings, ledger: led, config: CONFIG, files });

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-009
  it("reports a testimonial with no registry record", () => {
    const found = audit(ledger({ claims: [] }));
    expect(rules(found)).toEqual(["testimonial-unverified"]);
    expect(found[0].where).toBe("landing.testimonials.items.item1");
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-009
  it("reports a record whose person, use or consent is not confirmed, or that has no provenance", () => {
    for (const broken of [{ ...good, personExists: false }, { ...good, usedProduct: false }, { ...good, consent: false }, { ...good, provenance: "" }]) {
      expect(rules(audit(ledger({ claims: [], testimonials: [broken] }))), JSON.stringify(broken)).toEqual(["testimonial-unverified"]);
    }
    expect(audit(ledger({ claims: [], testimonials: [good] }))).toEqual([]);
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-009
  it("reports two records that use the same image for different people", () => {
    const other = { ...good, id: "t2", key: "landing.testimonials.items.item2", name: "Sam" };
    const found = audit(ledger({ claims: [], testimonials: [good, other] }));
    expect(rules(found)).toContain("testimonial-shared-image");
  });

  // SPECSFY: US-002 FR-006 AC-002
  it("accepts a testimonial shown without a photo and does not call two of them a shared image", () => {
    const noPhoto = { ...good, image: "" };
    const other = { ...noPhoto, id: "t2", key: "landing.testimonials.items.item2", name: "Sam" };
    expect(validateLedger(ledger({ claims: [], testimonials: [noPhoto, other] }))).toEqual([]);
    expect(audit(ledger({ claims: [], testimonials: [noPhoto, other] }))).toEqual([]);
    expect(rules(validateLedger(ledger({ claims: [], testimonials: [{ ...good, image: "static/a.jpeg" }] })))).toEqual(["ledger-invalid"]);
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-009
  it("reports an image of the static folder used in a marketing component that no record registers", () => {
    const files = { "apps/web/app/components/landing/LandingAvatars.vue": '<template><UAvatar src="/static/zzz.jpeg" alt="Someone" /></template>' };
    const found = audit(ledger({ claims: [], testimonials: [good] }), files);
    expect(rules(found)).toEqual(["testimonial-unregistered-image"]);
    expect(found[0].message).toContain("/static/zzz.jpeg");
    const registered = { ...good, image: "/static/zzz.jpeg" };
    expect(audit(ledger({ claims: [], testimonials: [registered] }), files)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------
// The command line (AC-007, AC-008)
// ---------------------------------------------------------------------------------

const SCRIPT = join(import.meta.dirname, "check-copy.ts");
const roots: string[] = [];
afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function project(options: { vue?: string; claim?: string; ledger?: string; baseline?: string }) {
  const root = mkdtempSync(join(tmpdir(), "check-copy-"));
  roots.push(root);
  write(join(root, "apps/app/A.vue"), options.vue ?? "<template><h1>{{ $t('x') }}</h1></template>");
  write(join(root, "locales/en.json"), JSON.stringify({ landing: { title: options.claim ?? "Plain words" } }));
  write(join(root, "ledger.yml"), options.ledger ?? "schema: 1\nclaims: []\nnotClaims: []\ntestimonials: []\noffers: []\n");
  write(join(root, "baseline.json"), options.baseline ?? JSON.stringify({ schema: 1, allow: [] }));
  write(
    join(root, "config.json"),
    JSON.stringify({ ...CONFIG, locales: { en: "locales/en.json" }, vueRoots: ["apps"], now: NOW }),
  );
  return root;
}

function run(root: string) {
  const args = ["--root", root, "--config", join(root, "config.json"), "--ledger", join(root, "ledger.yml"), "--baseline", join(root, "baseline.json")];
  const quoted = args.map((a) => `"${a}"`).join(" ");
  const result = spawnSync(`bun "${SCRIPT}" ${quoted}`, { encoding: "utf8", shell: true });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

describe("check:copy command line (AC-007, AC-008)", { timeout: 60_000 }, () => {
  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-007
  it("exits 0 on a project whose text is governed", () => {
    const { code, out } = run(project({}));
    expect(out).toContain("check:copy passed");
    expect(code).toBe(0);
  });

  // SPECSFY: US-003 US-004 FR-009 FR-010 AC-007
  it("exits 1 and names the rule and the key for an unproven claim", () => {
    const { code, out } = run(project({ claim: "20 audited tables" }));
    expect(code).toBe(1);
    expect(out).toContain("[claim-unproven]");
    expect(out).toContain("landing.title");
  });

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("exits 1 for a new literal and 0 when the baseline lists it with an owner", () => {
    const bad = run(project({ vue: "<template><h1>Dashboard</h1></template>" }));
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("[literal-text]");
    const baseline = JSON.stringify({ schema: 1, allow: [{ rule: "literal-text", where: "apps/app/A.vue", match: "Dashboard", removedBy: "BACKLOG-app-ui-copy", since: NOW }] });
    expect(run(project({ vue: "<template><h1>Dashboard</h1></template>", baseline })).code).toBe(0);
  });

  // SPECSFY: US-003 US-007 FR-010 NFR-002 AC-008
  it("exits 1 for a stale baseline entry", () => {
    const baseline = JSON.stringify({ schema: 1, allow: [{ rule: "literal-text", where: "apps/app/A.vue", match: "Gone", removedBy: "BACKLOG-app-ui-copy", since: NOW }] });
    const { code, out } = run(project({ baseline }));
    expect(code).toBe(1);
    expect(out).toContain("[allowance-stale]");
  });

  // SPECSFY: US-004 FR-009 NFR-001 AC-007
  it("exits 1 for a ledger that is not valid", () => {
    const { code, out } = run(project({ ledger: "schema: 2\n" }));
    expect(code).toBe(1);
    expect(out).toContain("[ledger-invalid]");
  });
});
