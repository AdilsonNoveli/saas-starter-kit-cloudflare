import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePatternLibrary, patternProblems, sharedWordRuns } from "./copy-rules";

// BDD source: specs/*/0002-web-performance-search-copy-specialists/spec.md (AC-010).
// The owner's copy material is local input. What the specialist publishes is a library of
// original, classified patterns, and this file proves it stays original and honest.

const ROOT = join(import.meta.dirname, "..");
const LIBRARY = "fireskills/specialists/fireskill-specialist-copywriting/references/pattern-library.md";
const RAW = join(ROOT, "docs/copywiter");

const SAMPLE = `
# Pattern library

### P-001 Specific outcome
- **Class**: A
- **Trigger**: specificity
- **Structure**: [audience] gets [named result] in [measured time]
- **Stage**: problem-aware
- **Reason**: names a result the reader can picture
- **Examples**:
  - en: Ship billing in a weekend
  - pt-br: Coloque a cobranca no ar em um fim de semana
  - es: Lanza la facturacion en un fin de semana

### P-002 Numbered proof
- **Class**: B
- **Trigger**: proof
- **Structure**: [count] [things] that [result]
- **Stage**: solution-aware
- **Reason**: a number is a claim and needs a ledger entry
- **Examples**:
  - en: 20 tables that isolate every tenant
  - pt-br: 20 tabelas que isolam cada tenant
  - es: 20 tablas que aislan cada tenant

### P-003 Fake countdown
- **Class**: C
- **Trigger**: scarcity
- **Structure**: [deadline] then the offer disappears
- **Stage**: any
- **Reason**: an invented deadline is prohibited (Directive 2005/29/EC Annex I, item 7)
- **Examples**: none, forbidden
`;

describe("the structure and classification of the library (AC-010)", () => {
  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("parses each pattern with its class, trigger, structure, stage, reason and examples", () => {
    const patterns = parsePatternLibrary(SAMPLE);
    expect(patterns.map((p) => p.id)).toEqual(["P-001", "P-002", "P-003"]);
    expect(patterns[0]).toMatchObject({ class: "A", trigger: "specificity", stage: "problem-aware" });
    expect(patterns[0].examples).toEqual({
      en: "Ship billing in a weekend",
      "pt-br": "Coloque a cobranca no ar em um fim de semana",
      es: "Lanza la facturacion en un fin de semana",
    });
    expect(patterns[2].examples).toEqual({});
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("accepts a well-formed library", () => {
    expect(patternProblems(parsePatternLibrary(SAMPLE))).toEqual([]);
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("rejects a pattern without a valid class, or without trigger, structure, stage or reason", () => {
    for (const [find, replace] of [
      ["**Class**: A", "**Class**: D"],
      ["**Class**: A", "**Class**: "],
      ["- **Trigger**: specificity\n", ""],
      ["- **Structure**: [audience] gets [named result] in [measured time]\n", ""],
      ["- **Stage**: problem-aware\n", ""],
      ["- **Reason**: names a result the reader can picture\n", ""],
    ]) {
      const broken = parsePatternLibrary(SAMPLE.replace(find, replace));
      expect(patternProblems(broken).length, find).toBeGreaterThan(0);
    }
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("rejects a duplicated pattern id", () => {
    const twice = parsePatternLibrary(SAMPLE.replace("P-002", "P-001"));
    expect(patternProblems(twice).map((v) => v.rule)).toContain("pattern-invalid");
  });
});

describe("languages and class C (AC-010)", () => {
  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("requires examples in en, pt-br and es for every class A and B pattern", () => {
    const missing = parsePatternLibrary(SAMPLE.replace("  - es: Lanza la facturacion en un fin de semana\n", ""));
    expect(patternProblems(missing).map((v) => v.message).join(" ")).toContain("es");
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("rejects an example on a class C pattern: a forbidden pattern is described, never demonstrated", () => {
    const shown = parsePatternLibrary(SAMPLE.replace("- **Examples**: none, forbidden", "- **Examples**:\n  - en: Only today, 50% off\n  - pt-br: Somente hoje\n  - es: Solo hoy"));
    expect(patternProblems(shown).map((v) => v.rule)).toContain("pattern-invalid");
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("has no class C pattern with examples in the published library", () => {
    const patterns = parsePatternLibrary(readFileSync(join(ROOT, LIBRARY), "utf8"));
    const forbidden = patterns.filter((p) => p.class === "C");
    expect(forbidden.length, "the library must name the forbidden patterns").toBeGreaterThan(0);
    for (const pattern of forbidden) expect(pattern.examples, pattern.id).toEqual({});
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("has a published library that is well formed, in three languages, with enough patterns", () => {
    const patterns = parsePatternLibrary(readFileSync(join(ROOT, LIBRARY), "utf8"));
    expect(patternProblems(patterns)).toEqual([]);
    expect(patterns.length).toBeGreaterThanOrEqual(15);
    expect(patterns.filter((p) => p.class === "A").length).toBeGreaterThan(0);
    expect(patterns.filter((p) => p.class === "B").length).toBeGreaterThan(0);
  });
});

describe("originality against the raw material (AC-010, NFR-005)", () => {
  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("finds a run of 8 identical words and none of 7, ignoring case and punctuation", () => {
    const a = "The quick brown fox jumps over the lazy dog, again and again.";
    expect(sharedWordRuns(a, "A quick brown fox jumps over the lazy dog!", 8)).toEqual(["quick brown fox jumps over the lazy dog"]);
    expect(sharedWordRuns(a, "quick brown fox jumps over the lazy cat", 8)).toEqual([]);
    expect(sharedWordRuns(a, "quick brown fox jumps over the lazy", 8)).toEqual([]);
    expect(sharedWordRuns(a, "quick brown fox jumps over the lazy", 7)).toEqual(["quick brown fox jumps over the lazy"]);
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("reports the longest shared run once, not every window of it", () => {
    const text = "one two three four five six seven eight nine ten";
    expect(sharedWordRuns(text, text, 8)).toEqual(["one two three four five six seven eight nine ten"]);
  });

  const rawFiles = existsSync(RAW) ? readdirSync(RAW).filter((file) => file.endsWith(".md")) : [];

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it.skipIf(rawFiles.length === 0)("shares no run of 8 identical words with any file of docs/copywiter", () => {
    const library = readFileSync(join(ROOT, LIBRARY), "utf8");
    const shared = rawFiles.flatMap((file) => sharedWordRuns(library, readFileSync(join(RAW, file), "utf8"), 8).map((run) => `${file}: ${run}`));
    expect(shared).toEqual([]);
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("says the check was skipped, and why, when the raw material is absent", () => {
    if (rawFiles.length > 0) return;
    console.info("copy-patterns: docs/copywiter is absent, so the originality check against the raw material was skipped");
    expect(rawFiles).toEqual([]);
  });

  // SPECSFY: US-005 FR-011 NFR-005 AC-010
  it("keeps the raw material out of git", () => {
    const tracked = spawnSync("git", ["ls-files", "docs/copywiter"], { cwd: ROOT, encoding: "utf8" });
    expect(tracked.stdout.trim()).toBe("");
  });
});
