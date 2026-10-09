// SPEC-0008 (Fase 2): scanner that keeps visual customization inside `packages/tokens`.
// A color, font, gradient or glass effect written outside the tokens is a violation, except the
// few files listed in the exceptions table of `.fireskills/DESIGNSYSTEM.MD`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type FixedKind = "hex" | "rgb" | "palette-class" | "palette-name" | "font-name" | "gradient" | "backdrop" | "radius";

export interface FixedValue {
  file: string;
  line: number;
  kind: FixedKind;
  match: string;
}

export interface Exception {
  file: string;
  reason: string;
  kinds?: FixedKind[];
}

export interface ScanOptions {
  exceptions?: Exception[];
  kinds?: FixedKind[];
}

const RAW_COLORS = "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const PROPERTIES = "text|bg|border|ring|ring-offset|from|via|to|fill|stroke|divide|outline|decoration|shadow|accent|caret|placeholder";

const PATTERNS: Record<Exclude<FixedKind, "radius">, RegExp> = {
  // Six and eight digit hex anywhere; three and four digit only where a color is written, never an id selector.
  hex: /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|(?<=[:(,'"\s])#[0-9a-fA-F]{3,4}(?=[;),'"}\s]|$)(?!\s*\{)/g,
  rgb: /\b(?:rgba?|hsla?|oklch)\(/g,
  "palette-class": new RegExp(`\\b(?:${PROPERTIES})-(?:(?:${RAW_COLORS})-\\d{2,3}|black|white)\\b`, "g"),
  "palette-name": /\b(?:flame|fire|night|mint)-(?:50|100|200|300|400|500|600|700|800|900|950)\b|--color-(?:flame|fire|night|mint)\b/g,
  "font-name": /\b(?:Geist|Montserrat|JetBrains Mono)\b/g,
  gradient: /gradient|\bbg-(?:linear|radial|conic)\b/g,
  backdrop: /\bbackdrop-(?:blur|filter)\b/g,
};
const KINDS = [...(Object.keys(PATTERNS) as Exclude<FixedKind, "radius">[]), "radius"] as FixedKind[];

/** No corner above 3px (decision D11): the most a radius may be, in px. */
const MAX_RADIUS_PX = 3;
const CORNER = "(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?";
const px = (amount: string, unit: string): number => (unit === "rem" ? parseFloat(amount) * 16 : parseFloat(amount));

/** `rounded-full`, `rounded-xl` or larger, an arbitrary radius over 3px, and a `border-radius` over 3px. */
function radiusMatches(line: string): string[] {
  const found: string[] = [];
  for (const m of line.matchAll(new RegExp(String.raw`\brounded${CORNER}-(?:full|xl|2xl|3xl|4xl)\b`, "g"))) found.push(m[0]);
  for (const m of line.matchAll(new RegExp(String.raw`\brounded${CORNER}-\[(\d*\.?\d+)(px|rem|%)\]`, "g"))) if (m[2] === "%" || px(m[1], m[2]) > MAX_RADIUS_PX) found.push(m[0]);
  for (const m of line.matchAll(/border-radius:\s*(\d*\.?\d+)(px|rem|%)/g)) if (m[2] === "%" || px(m[1], m[2]) > MAX_RADIUS_PX) found.push(m[0]);
  return found;
}

/** Every fixed visual value found in `text`, with its 1-based line. */
export function findFixedValues(text: string, file: string): FixedValue[] {
  const found: FixedValue[] = [];
  text.split(/\r?\n/).forEach((content, index) => {
    for (const kind of KINDS) {
      const matches = kind === "radius" ? radiusMatches(content) : [...content.matchAll(PATTERNS[kind])].map((m) => m[0]);
      for (const match of matches) found.push({ file, line: index + 1, kind, match });
    }
  });
  return found;
}

const SCOPES = ["apps", "layers", "packages"];
const SKIPPED_DIRS = new Set(["node_modules", ".nuxt", ".output", "dist", ".data", ".wrangler", ".git", ".turbo"]);
const SCANNED_FILES = /\.(vue|ts|tsx|css)$/;
const SKIPPED_FILES = /\.(test|spec)\.ts$|\.d\.ts$/;

/** Directories to scan under `root`: `apps/*`, `layers/*` and `packages/*` except `packages/tokens`. */
export function scopeDirs(root: string): string[] {
  return SCOPES.flatMap((scope) => {
    const base = join(root, scope);
    if (!existsSync(base)) return [];
    return readdirSync(base)
      .filter((name) => statSync(join(base, name)).isDirectory())
      .filter((name) => !(scope === "packages" && name === "tokens"))
      .map((name) => join(base, name));
  });
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIPPED_DIRS.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return SCANNED_FILES.test(name) && !SKIPPED_FILES.test(name) ? [path] : [];
  });
}

/** Fixed values in every scoped directory, minus the documented exceptions. */
export function scanRepo(root: string, options: ScanOptions = {}): FixedValue[] {
  const kinds = new Set(options.kinds ?? KINDS);
  const exceptions = options.exceptions ?? [];
  return scopeDirs(root)
    .flatMap(walk)
    .flatMap((path) => {
      const file = relative(root, path).replaceAll("\\", "/");
      const allowed = exceptions.filter((exception) => exception.file === file);
      return findFixedValues(readFileSync(path, "utf8"), file).filter(
        (value) => kinds.has(value.kind) && !allowed.some((exception) => !exception.kinds || exception.kinds.includes(value.kind)),
      );
    });
}

/**
 * Reads the exceptions table of `.fireskills/DESIGNSYSTEM.MD`: the row's `Scope` cell names the file in
 * backticks, `Rationale` is the reason, and the kinds (`hex`, `rgb`, ...) named in `Overridden Rule`
 * limit what is allowed (all kinds when none is named).
 */
export function parseExceptions(markdown: string): Exception[] {
  const lines = markdown.split(/\r?\n/);
  const header = lines.findIndex((line) => /^\|.*\bScope\b.*\bRationale\b/.test(line));
  if (header === -1) return [];
  const cells = (line: string): string[] => line.split("|").slice(1, -1).map((cell) => cell.trim());
  const names = cells(lines[header]);
  const column = (name: string): number => names.findIndex((cell) => cell === name);
  const [scope, rationale, rule] = [column("Scope"), column("Rationale"), column("Overridden Rule")];
  const exceptions: Exception[] = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith("|")) break;
    const row = cells(line);
    const file = /`([^`]+)`/.exec(row[scope] ?? "")?.[1];
    if (!file) continue;
    const named = KINDS.filter((kind) => new RegExp(`\\b${kind}\\b`).test(row[rule] ?? ""));
    exceptions.push({ file, reason: row[rationale] ?? "", ...(named.length ? { kinds: named } : {}) });
  }
  return exceptions;
}
