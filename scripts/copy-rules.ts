import { isIsoDate } from "./allowances";
import type { Violation } from "./seo-rules";

// Pure rules of the `check:copy` gate (SPEC-0002 FR-009, FR-010, FR-011).
//
// Why a ledger: the primary texts read for this spec put the burden of proving an advertising
// claim on whoever makes it (Brazilian CDC art. 36 sole paragraph and art. 38), forbid invented
// testimonials (16 CFR 465.2) and invented urgency (Directive 2005/29/EC Annex I item 7). So a
// factual claim in a marketing text is not a sentence, it is a sentence plus the record that
// proves it, and a machine can check that the record still holds.

// ---------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------

export type Evidence =
  | { kind: "repo-count"; files: string[]; pattern: string; equals: number }
  | { kind: "repo-file"; path: string; contains?: string }
  | { kind: "url"; url: string; retrieved: string }
  | { kind: "owner-statement"; by: string; on: string };

export interface Claim {
  id: string;
  /** Dotted locale keys the claim covers, in every locale that has them. */
  keys: string[];
  statement: string;
  evidence: Evidence;
  verifiedAt: string;
  owner: string;
}

export interface Testimonial {
  id: string;
  /** The dotted key of the testimonial item, for example `landing.testimonials.items.item1`. */
  key: string;
  name: string;
  personExists: boolean;
  usedProduct: boolean;
  consent: boolean;
  image: string;
  provenance: string;
}

export interface Offer {
  key: string;
  /** Last day the offer is valid, `YYYY-MM-DD`. */
  endsAt: string;
  /** Where the limit is enforced (a coupon, a price schedule). */
  source: string;
}

export interface Ledger {
  schema: 1;
  claims: Claim[];
  notClaims: { key: string; reason: string }[];
  testimonials: Testimonial[];
  offers: Offer[];
}

export interface CopyConfig {
  /** Top-level keys of the locale files that are marketing text (`landing`). */
  marketingNamespaces: string[];
  claimPatterns: { name: string; regex: string }[];
  urgencyPatterns: { name: string; regex: string }[];
  testimonialKeyPattern: string;
  staticImagePattern: string;
  literalAttributes: string[];
}

export interface VerifyIO {
  /** Repository files matching a glob, as root-relative paths. */
  files: (glob: string) => string[];
  read: (file: string) => string;
  exists: (file: string) => boolean;
}

const bad = (rule: string, where: string, message: string, subject?: string): Violation =>
  subject === undefined ? { rule, where, message } : { rule, where, message, subject };
const text = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const compile = (pattern: string, flags = ""): RegExp | undefined => {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return undefined;
  }
};

// ---------------------------------------------------------------------------------
// The ledger schema (FR-009)
// ---------------------------------------------------------------------------------

function validateEvidence(evidence: unknown, where: string): Violation[] {
  const found: Violation[] = [];
  const e = evidence as Record<string, unknown> | null;
  if (!e || typeof e !== "object") return [bad("ledger-invalid", where, "evidence is missing")];
  switch (e.kind) {
    case "repo-count":
      if (!Array.isArray(e.files) || e.files.length === 0 || !e.files.every(text)) found.push(bad("ledger-invalid", where, "repo-count needs a non-empty list of files (globs)"));
      if (!text(e.pattern) || compile(e.pattern) === undefined) found.push(bad("ledger-invalid", where, "repo-count needs a pattern that is a valid regular expression"));
      if (!Number.isInteger(e.equals) || (e.equals as number) < 0) found.push(bad("ledger-invalid", where, "repo-count needs equals, a whole number of 0 or more"));
      break;
    case "repo-file":
      if (!text(e.path)) found.push(bad("ledger-invalid", where, "repo-file needs a path"));
      if (e.contains !== undefined && (!text(e.contains) || compile(e.contains) === undefined)) found.push(bad("ledger-invalid", where, "contains must be a valid regular expression"));
      break;
    case "url":
      if (!text(e.url) || !/^https?:\/\//i.test(e.url)) found.push(bad("ledger-invalid", where, "url evidence needs an http(s) URL"));
      if (!isIsoDate(e.retrieved)) found.push(bad("ledger-invalid", where, "url evidence needs the date it was retrieved (YYYY-MM-DD)"));
      break;
    case "owner-statement":
      if (!text(e.by)) found.push(bad("ledger-invalid", where, "owner-statement needs the name of who made it"));
      if (!isIsoDate(e.on)) found.push(bad("ledger-invalid", where, "owner-statement needs the date it was made (YYYY-MM-DD)"));
      break;
    default:
      found.push(bad("ledger-invalid", where, `evidence kind "${String(e.kind)}" is not repo-count, repo-file, url or owner-statement`));
  }
  return found;
}

export function validateLedger(raw: unknown): Violation[] {
  const found: Violation[] = [];
  const ledger = raw as Record<string, unknown> | null;
  if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) return [bad("ledger-invalid", "ledger", "the ledger is not an object")];
  if (ledger.schema !== 1) found.push(bad("ledger-invalid", "schema", "schema must be 1"));
  for (const list of ["claims", "notClaims", "testimonials", "offers"]) {
    if (!Array.isArray(ledger[list])) found.push(bad("ledger-invalid", list, `${list} must be a list (it may be empty)`));
  }
  if (found.length > 0) return found;

  const ids = new Set<string>();
  const keys = new Set<string>();
  (ledger.claims as Partial<Claim>[]).forEach((claim, index) => {
    const where = `claims[${index}]`;
    if (!text(claim.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(claim.id)) found.push(bad("ledger-invalid", where, "id must be kebab-case"));
    else if (ids.has(claim.id)) found.push(bad("ledger-invalid", where, `id ${claim.id} is used twice`));
    else ids.add(claim.id);
    if (!Array.isArray(claim.keys) || claim.keys.length === 0 || !claim.keys.every(text)) found.push(bad("ledger-invalid", where, "keys must list the locale keys the claim covers"));
    else {
      for (const key of claim.keys) {
        if (keys.has(key)) found.push(bad("ledger-invalid", where, `the key ${key} is claimed by two entries`));
        keys.add(key);
      }
    }
    if (!text(claim.statement)) found.push(bad("ledger-invalid", where, "statement is empty"));
    if (!text(claim.owner)) found.push(bad("ledger-invalid", where, "owner is empty"));
    if (!isIsoDate(claim.verifiedAt)) found.push(bad("ledger-invalid", where, "verifiedAt must be a date (YYYY-MM-DD)"));
    found.push(...validateEvidence(claim.evidence, `${where}.evidence`));
  });
  (ledger.notClaims as { key?: unknown; reason?: unknown }[]).forEach((entry, index) => {
    if (!text(entry.key) || !text(entry.reason)) found.push(bad("ledger-invalid", `notClaims[${index}]`, "a not-a-claim needs the key and the reason it is not a claim"));
  });
  (ledger.offers as Partial<Offer>[]).forEach((offer, index) => {
    if (!text(offer.key) || !isIsoDate(offer.endsAt) || !text(offer.source)) found.push(bad("ledger-invalid", `offers[${index}]`, "an offer needs key, endsAt (YYYY-MM-DD) and source"));
  });
  (ledger.testimonials as Partial<Testimonial>[]).forEach((t, index) => {
    const where = `testimonials[${index}]`;
    if (!text(t.id) || !text(t.key) || !text(t.name)) found.push(bad("ledger-invalid", where, "a testimonial needs id, key and name"));
    for (const flag of ["personExists", "usedProduct", "consent"] as const) {
      if (typeof t[flag] !== "boolean") found.push(bad("ledger-invalid", where, `${flag} must be true or false`));
    }
    // "" means the testimonial is shown without a photo, which is honest; a photo is a root-relative path
    if (typeof t.image !== "string" || (t.image !== "" && !t.image.startsWith("/"))) found.push(bad("ledger-invalid", where, "image must be empty (no photo) or a root-relative path"));
    if (typeof t.provenance !== "string") found.push(bad("ledger-invalid", where, "provenance must be text (where the testimonial came from)"));
  });
  return found;
}

// ---------------------------------------------------------------------------------
// The verifiers (FR-009)
// ---------------------------------------------------------------------------------

export function verifyClaim(claim: Claim, io: VerifyIO, now: string): Violation[] {
  const where = `claims:${claim.id}`;
  const found: Violation[] = [];
  if (isIsoDate(claim.verifiedAt) && claim.verifiedAt > now) found.push(bad("claim-evidence", where, `verifiedAt ${claim.verifiedAt} is in the future`));
  const e = claim.evidence;
  switch (e.kind) {
    case "repo-count": {
      const pattern = compile(e.pattern, "g");
      if (!pattern) return [...found, bad("claim-evidence", where, `the pattern ${e.pattern} is not a valid regular expression`)];
      const files = [...new Set(e.files.flatMap((glob) => io.files(glob)))];
      if (files.length === 0) return [...found, bad("claim-verifier", where, `no file matches ${e.files.join(", ")}`)];
      const count = files.reduce((sum, file) => sum + (io.read(file).match(pattern)?.length ?? 0), 0);
      if (count !== e.equals) found.push(bad("claim-verifier", where, `"${claim.statement}": ${e.pattern} counts ${count} in ${files.length} file(s), the claim says ${e.equals}`));
      return found;
    }
    case "repo-file": {
      if (!io.exists(e.path)) return [...found, bad("claim-verifier", where, `${e.path} does not exist`)];
      if (e.contains !== undefined && !new RegExp(e.contains).test(io.read(e.path))) {
        found.push(bad("claim-verifier", where, `${e.path} does not contain ${e.contains}`));
      }
      return found;
    }
    case "url":
      if (!isIsoDate(e.retrieved)) found.push(bad("claim-evidence", where, "url evidence has no retrieved date"));
      else if (e.retrieved > now) found.push(bad("claim-evidence", where, `retrieved ${e.retrieved} is in the future`));
      return found;
    case "owner-statement":
      if (!text(e.by) || !isIsoDate(e.on)) found.push(bad("claim-evidence", where, "an owner statement needs the name and the date"));
      return found;
    default:
      return [...found, bad("claim-evidence", where, "unknown evidence kind")];
  }
}

// ---------------------------------------------------------------------------------
// Locale strings and claims in marketing text (FR-009, FR-010)
// ---------------------------------------------------------------------------------

/** `{ a: { b: "x", c: ["y"] } }` to `{ "a.b": "x", "a.c.0": "y" }`; only strings are kept. */
export function flattenLocale(json: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  const visit = (value: unknown, key: string): void => {
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value)) value.forEach((item, index) => visit(item, key === "" ? String(index) : `${key}.${index}`));
    else if (value && typeof value === "object") {
      for (const [name, child] of Object.entries(value as Record<string, unknown>)) visit(child, key === "" ? name : `${key}.${name}`);
    }
  };
  visit(json, prefix);
  return out;
}

const inMarketing = (key: string, config: CopyConfig): boolean => config.marketingNamespaces.some((ns) => key === ns || key.startsWith(`${ns}.`));

function firstMatch(patterns: { name: string; regex: string }[], value: string): string | undefined {
  for (const pattern of patterns) {
    const regex = compile(pattern.regex, "i");
    if (regex?.test(value)) return pattern.name;
  }
  return undefined;
}

export function detectClaims(strings: Record<string, string>, config: CopyConfig): { key: string; pattern: string }[] {
  return Object.entries(strings).flatMap(([key, value]) => {
    if (!inMarketing(key, config)) return [];
    const pattern = firstMatch(config.claimPatterns, value);
    return pattern ? [{ key, pattern }] : [];
  });
}

export interface ClaimsInput {
  /** Locale code to flattened strings. */
  strings: Record<string, Record<string, string>>;
  ledger: Ledger;
  config: CopyConfig;
  io: VerifyIO;
  /** `YYYY-MM-DD`, injected so a run is repeatable. */
  now: string;
}

export function auditClaims(input: ClaimsInput): Violation[] {
  const { strings, ledger, config, io, now } = input;
  const found: Violation[] = [];
  const covered = new Set([...ledger.claims.flatMap((claim) => claim.keys), ...ledger.notClaims.map((entry) => entry.key)]);
  for (const [locale, map] of Object.entries(strings)) {
    for (const { key, pattern } of detectClaims(map, config)) {
      if (!covered.has(key)) {
        found.push(bad("claim-unproven", `${locale}:${key}`, `a claim (pattern: ${pattern}) with no ledger entry: "${map[key]}"`));
      }
    }
  }
  const known = new Set(Object.values(strings).flatMap((map) => Object.keys(map)));
  for (const claim of ledger.claims) {
    const numbers = claim.statement.match(/\d[\d.,]*/g) ?? [];
    for (const key of claim.keys) {
      if (!known.has(key)) found.push(bad("ledger-invalid", `claims:${claim.id}`, `the claim points to the key ${key}, which no locale file has`));
      // The ledger proves the statement; the text must say the same numbers, or it says something else.
      for (const [locale, map] of Object.entries(strings)) {
        const value = map[key];
        const missing = value === undefined ? [] : numbers.filter((n) => !value.includes(n));
        if (missing.length > 0) {
          found.push(bad("claim-text-mismatch", `${locale}:${key}`, `the ledger proves "${claim.statement}" but the text does not contain ${missing.join(", ")}: "${value}"`));
        }
      }
    }
    found.push(...verifyClaim(claim, io, now));
  }
  return found;
}

// ---------------------------------------------------------------------------------
// Text outside the locale files (FR-010)
// ---------------------------------------------------------------------------------

export const DEFAULT_LITERAL_ATTRIBUTES = ["label", "title", "placeholder", "description", "aria-label", "alt", "subtitle", "text", "tooltip"];

const SEPARATOR = "\u0001";
const TAG = String.raw`<\/?[A-Za-z][\w:.-]*(?:[^>"']|"[^"]*"|'[^']*')*>`;

/**
 * The human-readable literals of the `<template>` of a Vue file: text nodes and the static value
 * of the listed attributes. Bindings (`:label`, `v-bind`, `{{ }}`) are code, not literals.
 */
export function scanLiterals(vue: string, attributes: string[] = DEFAULT_LITERAL_ATTRIBUTES): string[] {
  const start = vue.search(/<template(?:\s[^>]*)?>/);
  const end = vue.lastIndexOf("</template>");
  if (start === -1 || end === -1 || end < start) return [];
  let template = vue.slice(vue.indexOf(">", start) + 1, end).replace(/<!--[\s\S]*?-->/g, "");

  const literals: string[] = [];
  const hasWords = (value: string): boolean => /\p{L}{2,}/u.test(value);
  const listed = new Set(attributes.map((name) => name.toLowerCase()));

  for (const tag of template.match(new RegExp(TAG, "g")) ?? []) {
    for (const attr of tag.matchAll(/\s([A-Za-z][\w:.-]*)\s*=\s*"([^"]*)"/g)) {
      const name = attr[1].toLowerCase();
      const value = attr[2].replace(/\s+/g, " ").trim();
      if (listed.has(name) && hasWords(value) && !value.includes("{{")) literals.push(value);
    }
  }

  template = template.replace(/\{\{[\s\S]*?\}\}/g, SEPARATOR).replace(new RegExp(TAG, "g"), SEPARATOR);
  for (const chunk of template.split(SEPARATOR)) {
    const value = chunk.replace(/&[#\w]+;/g, " ").replace(/\s+/g, " ").trim();
    if (hasWords(value)) literals.push(value);
  }
  return literals;
}

/** One violation per distinct literal of each file. */
export function auditLiterals(files: Record<string, string>, attributes?: string[]): Violation[] {
  return Object.keys(files)
    .sort()
    .flatMap((file) =>
      [...new Set(scanLiterals(files[file], attributes))].map((literal) =>
        bad("literal-text", file, `literal text "${literal}" in a template: move it to a locale key so that the copy specialist governs it`, literal),
      ),
    );
}

// ---------------------------------------------------------------------------------
// Serelius voice (SPEC-0008, FR-009): plano mestre Part 3.1 and premise P7
// ---------------------------------------------------------------------------------

/** Where the voice is enforced: the signed-in app, the login and every layer. `apps/web` is the kit's content, rebuilt in Phase 12. */
const VOICE_SCOPE = /^(?:apps\/app\/|apps\/login\/|layers\/)/;
/** The people words of premise P7, judged in Portuguese only. */
const FORBIDDEN_TERMS = /\b(?:contatos?|leads?|registros?|nós)\b/iu;

/** Exclamation, celebration emoji or sparkle icon, and (in Portuguese) the words the premise forbids. */
export function auditVoice(strings: Record<string, string>, file: string, locale: string): Violation[] {
  const found: Violation[] = [];
  for (const [key, value] of Object.entries(strings)) {
    const where = `${file}:${key}`;
    if (value.includes("!")) found.push(bad("voice-exclamation", where, `"${value}" has an exclamation mark: the voice is calm, with short sentences`, value));
    if (/\p{Extended_Pictographic}/u.test(value)) found.push(bad("voice-emoji", where, `"${value}" has an emoji: no celebration emoji and no sparkle for AI`, value));
    if (/^pt/i.test(locale) && FORBIDDEN_TERMS.test(value)) found.push(bad("voice-forbidden-term", where, `"${value}" uses a word premise P7 forbids: say pessoas, conexões, círculos or conversas`, value));
  }
  return found;
}

/** The voice rules over repository-relative files: locale JSON files and the literals of `.vue` templates. */
export function auditVoiceFiles(files: Record<string, string>): Violation[] {
  return Object.keys(files)
    .filter((file) => VOICE_SCOPE.test(file))
    .sort()
    .flatMap((file) => {
      const locale = /\/i18n\/locales\/([^/]+)\.json$/.exec(file)?.[1];
      if (locale) return auditVoice(flattenLocale(JSON.parse(files[file])), file, locale);
      if (!file.endsWith(".vue")) return [];
      const literals = Object.fromEntries([...new Set(scanLiterals(files[file]))].map((literal, index) => [String(index), literal]));
      return auditVoice(literals, file, "en");
    });
}

// ---------------------------------------------------------------------------------
// Urgency and testimonials (FR-009, FR-010)
// ---------------------------------------------------------------------------------

export interface UrgencyInput {
  strings: Record<string, Record<string, string>>;
  ledger: Ledger;
  config: CopyConfig;
  /** Vue files of the marketing components, path to source. */
  files: Record<string, string>;
  now: string;
}

export function auditUrgency(input: UrgencyInput): Violation[] {
  const { strings, ledger, config, files, now } = input;
  const found: Violation[] = [];
  for (const [locale, map] of Object.entries(strings)) {
    for (const [key, value] of Object.entries(map)) {
      if (!inMarketing(key, config)) continue;
      const pattern = firstMatch(config.urgencyPatterns, value);
      if (!pattern) continue;
      const offer = ledger.offers.find((entry) => entry.key === key);
      if (!offer) found.push(bad("urgency-unproven", `${locale}:${key}`, `an urgency phrase (${pattern}) with no dated offer record: "${value}"`));
      else if (offer.endsAt < now) found.push(bad("urgency-unproven", `${locale}:${key}`, `the offer expired on ${offer.endsAt}: remove the phrase or record the new limit`));
    }
  }
  const live = ledger.offers.some((offer) => offer.endsAt >= now);
  for (const [file, source] of Object.entries(files)) {
    if (/<\s*[A-Za-z]*Countdown\b/i.test(source) && !live) {
      found.push(bad("urgency-unproven", file, "a countdown component with no offer whose recorded limit is still in the future"));
    }
  }
  return found;
}

export interface TestimonialInput {
  strings: Record<string, Record<string, string>>;
  ledger: Ledger;
  config: CopyConfig;
  /** Vue files of the marketing components, path to source. */
  files: Record<string, string>;
}

export function auditTestimonials(input: TestimonialInput): Violation[] {
  const { strings, ledger, config, files } = input;
  const found: Violation[] = [];
  const prefix = compile(config.testimonialKeyPattern);
  if (prefix) {
    const items = new Set<string>();
    for (const map of Object.values(strings)) {
      for (const key of Object.keys(map)) {
        const match = key.match(prefix);
        if (match) items.add(match[0] + key.slice(match[0].length).split(".")[0]);
      }
    }
    for (const item of [...items].sort()) {
      const record = ledger.testimonials.find((t) => t.key === item);
      if (!record || !record.personExists || !record.usedProduct || !record.consent || record.provenance.trim() === "") {
        found.push(bad("testimonial-unverified", item, "no registry record proves that the person exists, used the product and consented (16 CFR 465.2)"));
      }
    }
  }
  const byImage = new Map<string, Set<string>>();
  for (const t of ledger.testimonials) if (t.image !== "") byImage.set(t.image, new Set([...(byImage.get(t.image) ?? []), t.name]));
  for (const [image, names] of byImage) {
    if (names.size > 1) found.push(bad("testimonial-shared-image", image, `the same photo is registered for ${[...names].join(" and ")}`));
  }
  const image = compile(config.staticImagePattern, "g");
  if (image) {
    const registered = new Set(ledger.testimonials.map((t) => t.image));
    for (const [file, source] of Object.entries(files)) {
      for (const path of new Set(source.match(image) ?? [])) {
        if (!registered.has(path)) found.push(bad("testimonial-unregistered-image", file, `${path} is used in a marketing component but no testimonial record registers it`, path));
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------
// The pattern library (FR-011)
// ---------------------------------------------------------------------------------

export interface Pattern {
  id: string;
  name: string;
  class: string;
  trigger: string;
  structure: string;
  stage: string;
  reason: string;
  examples: Record<string, string>;
}

export const PATTERN_STAGES = ["problem-aware", "solution-aware", "any"];
const LANGUAGES = ["en", "pt-br", "es"];

export function parsePatternLibrary(markdown: string): Pattern[] {
  const patterns: Pattern[] = [];
  let current: Pattern | undefined;
  let inExamples = false;
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const heading = line.match(/^###\s+(P-\d+)\s+(.*)$/);
    if (heading) {
      current = { id: heading[1], name: heading[2].trim(), class: "", trigger: "", structure: "", stage: "", reason: "", examples: {} };
      patterns.push(current);
      inExamples = false;
      continue;
    }
    if (!current) continue;
    const field = line.match(/^-\s+\*\*(Class|Trigger|Structure|Stage|Reason|Examples)\*\*:\s*(.*)$/);
    if (field) {
      inExamples = field[1] === "Examples";
      if (!inExamples) (current as unknown as Record<string, string>)[field[1].toLowerCase()] = field[2].trim();
      continue;
    }
    const example = inExamples ? line.match(/^\s+-\s+(en|pt-br|es):\s*(.+)$/) : null;
    if (example) current.examples[example[1]] = example[2].trim();
  }
  return patterns;
}

export function patternProblems(patterns: Pattern[]): Violation[] {
  const found: Violation[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    const problem = (message: string): void => void found.push(bad("pattern-invalid", pattern.id, message));
    if (seen.has(pattern.id)) problem("the id is used twice");
    seen.add(pattern.id);
    if (!["A", "B", "C"].includes(pattern.class)) problem(`class must be A, B or C, not "${pattern.class}"`);
    for (const field of ["trigger", "structure", "reason"] as const) if (pattern[field] === "") problem(`${field} is empty`);
    if (!PATTERN_STAGES.includes(pattern.stage)) problem(`stage must be one of ${PATTERN_STAGES.join(", ")}`);
    if (pattern.class === "A" || pattern.class === "B") {
      const missing = LANGUAGES.filter((lang) => !pattern.examples[lang]);
      if (missing.length > 0) problem(`examples are missing in ${missing.join(", ")}`);
    }
    if (pattern.class === "C" && Object.keys(pattern.examples).length > 0) {
      problem("a class C pattern is forbidden: it is described, never demonstrated with an example");
    }
  }
  return found;
}

/**
 * Runs of at least `minRun` consecutive words that two texts share, case and punctuation
 * ignored. A longer run is reported once, not once per window.
 */
export function sharedWordRuns(a: string, b: string, minRun = 8): string[] {
  const words = (value: string): string[] => value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const wa = words(a);
  const wb = words(b);
  const index = new Map<string, number[]>();
  for (let j = 0; j + minRun <= wb.length; j += 1) {
    const key = wb.slice(j, j + minRun).join(" ");
    index.set(key, [...(index.get(key) ?? []), j]);
  }
  const runs: string[] = [];
  let i = 0;
  while (i + minRun <= wa.length) {
    const positions = index.get(wa.slice(i, i + minRun).join(" "));
    if (!positions) {
      i += 1;
      continue;
    }
    let longest = 0;
    for (const j of positions) {
      let length = minRun;
      while (i + length < wa.length && j + length < wb.length && wa[i + length] === wb[j + length]) length += 1;
      longest = Math.max(longest, length);
    }
    runs.push(wa.slice(i, i + longest).join(" "));
    i += longest - minRun + 1;
  }
  return runs;
}
