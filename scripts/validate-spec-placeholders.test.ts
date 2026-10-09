import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Guards the placeholder rule of fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs:
// "TODO" only counts in capitals (in Portuguese "todo" is an ordinary word), while TBD, FIXME and the
// clarification flag stay case-insensitive.
const root = join(import.meta.dirname, "..");
const validator = join(
  root,
  "fireskills",
  "skills",
  "fireskill-04-validate",
  "scripts",
  "validate_spec.mjs",
);
const dir = mkdtempSync(join(tmpdir(), "validate-spec-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const SECTIONS = [
  "Problem and Outcome",
  "Research and Clarifications",
  "Scope and Actors",
  "Project Principles and Constraints",
  "User Stories",
  "Acceptance BDD Scenarios",
  "Requirements",
  "Technical Plan",
  "Data Model",
  "Interfaces and Contracts",
  "TDD Strategy",
  "Testing and Traceability Plan",
  "Validations",
  "Tasks",
  "Execution Order",
  "Dependencies, Risks, and Assumptions",
  "Decisions",
  "Definition of Done",
];

const specWith = (extra: string) => {
  const scenarios = ["AC-001", "AC-002", "AC-003"]
    .map(
      (id) => `#### ${id} — cenário\n\n**Covers**: US-001, FR-001, NFR-001\n`,
    )
    .join("\n");
  const body = SECTIONS.map((title, index) => {
    const content =
      title === "Acceptance BDD Scenarios"
        ? scenarios
        : title === "User Stories"
          ? "#### US-001 — história\n"
          : title === "Requirements"
            ? "- **FR-001**: requisito.\n- **NFR-001**: qualidade.\n"
            : "Texto.\n";
    return `### ${index + 1}. ${title}\n\n${content}`;
  }).join("\n");
  return [
    "# Spec",
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| Format | Specsfy/2.0 |",
    "| Slug | 0001-exemplo |",
    "| Status | Defined |",
    "| Definition Gate | Passed |",
    "| Plan Gate | Pending |",
    "| Delivery Gate | Pending |",
    "| Human Interface | No |",
    "",
    body,
    extra,
  ].join("\n");
};

const PLACEHOLDER = "Unresolved placeholders found in specification.";
const errorsFor = (extra: string): string[] => {
  const file = join(dir, `spec-${Math.random().toString(36).slice(2)}.md`);
  writeFileSync(file, specWith(extra));
  const run = spawnSync("node", [validator, file, "--json"], {
    encoding: "utf8",
  });
  return (JSON.parse(run.stdout) as { errors: string[] }).errors;
};

// Each case starts a Node process; give them room when the whole suite runs in parallel.
describe("validate_spec placeholder rule", { timeout: 30_000 }, () => {
  it('accepts the Portuguese word "todo" and reports nothing else about placeholders', () => {
    expect(
      errorsFor("Deve funcionar em todo o código e em todo arquivo."),
    ).not.toContain(PLACEHOLDER);
  });

  it("rejects a capitalised TODO marker", () => {
    expect(errorsFor("TODO: definir o limite.")).toContain(PLACEHOLDER);
  });

  it("rejects TBD, FIXME and the clarification flag in any letter case", () => {
    for (const marker of [
      "TBD",
      "tbd",
      "FIXME",
      "fixme",
      "[NEEDS CLARIFICATION: prazo]",
      "[needs clarification: prazo]",
    ]) {
      expect(errorsFor(`Ponto pendente ${marker}.`), marker).toContain(
        PLACEHOLDER,
      );
    }
  });
});
