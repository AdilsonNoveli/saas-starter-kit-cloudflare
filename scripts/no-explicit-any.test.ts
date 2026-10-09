import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// RULES.md: strict typing, zero `any`. This is what enforces it: every tracked TypeScript
// source (and the <script> of every .vue file) is parsed and any `AnyKeyword` node fails.
const root = join(import.meta.dirname, "..");
const SOURCE = /\.(ts|tsx|mts|vue)$/;
const SKIPPED = [/\.d\.ts$/, /^fireskills\//, /^apps\/web\/content\//];

const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => SOURCE.test(file) && !SKIPPED.some((skip) => skip.test(file)));

function anyLines(code: string, offsetLines = 0): number[] {
  const source = ts.createSourceFile("source.ts", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines: number[] = [];
  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      lines.push(source.getLineAndCharacterOfPosition(node.getStart()).line + 1 + offsetLines);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return lines;
}

function violationsIn(file: string): string[] {
  const text = readFileSync(join(root, file), "utf8");
  if (!file.endsWith(".vue")) return anyLines(text).map((line) => `${file}:${line}`);

  const found: string[] = [];
  for (const block of text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const before = text.slice(0, block.index + block[0].indexOf(block[1])).split("\n").length - 1;
    found.push(...anyLines(block[1], before).map((line) => `${file}:${line}`));
  }
  // Template bindings (`(x: any) => ...`) are TypeScript too, but are not inside <script>.
  const template = /<template[^>]*>([\s\S]*)<\/template>/.exec(text)?.[1] ?? "";
  template.split("\n").forEach((line, index) => {
    if (/(?::\s*any\b|\bas any\b|<any>|\bany\[\])/.test(line)) found.push(`${file}:template:${index + 1}`);
  });
  return found;
}

describe("no explicit any", () => {
  it("scans the tracked sources", () => {
    expect(tracked.length).toBeGreaterThan(300);
  });

  it("finds none in any tracked TypeScript or Vue source", () => {
    const violations = tracked.flatMap(violationsIn);
    // Joined so a failure prints every `file:line`, not a truncated array.
    expect(violations.join(", ")).toBe("");
  });

  it("does detect an `any` (the scan is not vacuous)", () => {
    expect(anyLines("const value: any = 1;\nlet list: any[] = [];\n")).toEqual([1, 2]);
  });
});
