/**
 * validator.ts - Deterministic specification linter (spec.md) in Fireskills.
 *
 * Transforms Definition Gate and Plan Gate validation into a programmatic
 * check before the agent or developer advances the spec state.
 */

import { existsSync, promises as fs } from "node:fs";
import { isAbsolute, join } from "node:path";
import { SPEC_FOLDERS } from "./lifecycle.js";

export interface ValidationIssue {
  level: "error" | "warn";
  message: string;
  field?: string;
  line?: number;
}

export interface ValidationResult {
  path: string;
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
  };
}

const REQUIRED_SECTIONS = [
  { name: "Context or Problem", pattern: /#+\s*(?:\d+[.\s]*)?(?:context|problem|vision|objective|contexto|problema|visão|objetivo)/i },
  { name: "Actors, Stories or Requirements", pattern: /#+\s*(?:\d+[.\s]*)?(?:actors|stories|requirements|scope|atores|histórias|requisitos|escopo)/i },
  { name: "BDD Scenarios", pattern: /#+\s*(?:\d+[.\s]*)?(?:scenarios|bdd|behavior|acceptance|cenários|comportamento|aceite)/i },
  { name: "Task Phases", pattern: /#+\s*(?:\d+[.\s]*)?(?:tasks|phases|plan|tarefas|fases|plano)/i },
  { name: "Tests and Evidence", pattern: /#+\s*(?:\d+[.\s]*)?(?:[^\n]*\btests?\b|evidence|verification|testes?|evid[eê]ncias?|provas?|valida)/i },
];

const PLACEHOLDER_PATTERNS = [
  /\[TODO\]/i,
  /\[preencher\]/i,
  /\[TBD\]/i,
  /\[em aberto\]/i,
  /\[descrever\]/i,
  /\[fill\]/i,
  /\[describe\]/i,
];

/** Locates full path to spec.md given a path or ID. */
export async function resolveSpecPath(
  projectRoot: string,
  target: string,
): Promise<string | null> {
  if (isAbsolute(target) && existsSync(target)) {
    const stat = await fs.stat(target);
    return stat.isDirectory() ? join(target, "spec.md") : target;
  }

  const direct = join(projectRoot, target);
  if (existsSync(direct)) {
    const stat = await fs.stat(direct);
    return stat.isDirectory() ? join(direct, "spec.md") : direct;
  }

  // Searches in specs/<state>/<target>/spec.md
  for (const folder of SPEC_FOLDERS) {
    const candidate = join(projectRoot, "specs", folder, target, "spec.md");
    if (existsSync(candidate)) return candidate;

    // Partial search by slug
    const stateDir = join(projectRoot, "specs", folder);
    if (existsSync(stateDir)) {
      const entries = await fs.readdir(stateDir);
      for (const entry of entries) {
        if (entry.includes(target)) {
          const matched = join(stateDir, entry, "spec.md");
          if (existsSync(matched)) return matched;
        }
      }
    }
  }

  return null;
}

/** Comprehensively validates a spec.md file. */
export async function validateSpec(
  specPath: string,
  options: { strict?: boolean } = {},
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  if (!existsSync(specPath)) {
    return {
      path: specPath,
      valid: false,
      issues: [{ level: "error", message: `File not found: ${specPath}` }],
      summary: { errors: 1, warnings: 0 },
    };
  }

  const content = await fs.readFile(specPath, "utf-8");
  const lines = content.split("\n");

  // 1. Metadata Table Validation
  validateMetadata(lines, issues);

  // 2. Required Sections Validation
  validateSections(content, issues);

  // 3. Draft Placeholder Detection
  validatePlaceholders(lines, issues);

  // 4. BDD Scenarios Validation
  validateBdd(content, issues);

  // 5. Tasks Checklist Validation
  validateTasks(content, issues);

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warn").length;

  const valid = options.strict ? errors === 0 && warnings === 0 : errors === 0;

  return {
    path: specPath,
    valid,
    issues,
    summary: { errors, warnings },
  };
}

function validateMetadata(lines: string[], issues: ValidationIssue[]) {
  const meta: Record<string, string> = {};

  for (const line of lines.slice(0, 35)) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (match && match[1] && match[2]) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();
      if (key !== "field" && key !== "campo" && key !== "---") {
        meta[key] = value;
      }
    }
  }

  // Check Effort
  if (!meta.effort) {
    issues.push({ level: "error", message: "Required metadata 'Effort' not found in header table." });
  } else {
    const score = parseInt(meta.effort, 10);
    if (isNaN(score) || score < 1 || score > 10) {
      issues.push({ level: "error", message: `Invalid Effort '${meta.effort}': must be an integer between 1 and 10.` });
    }
  }

  // Check Effort rationale
  const rationale = meta["effort rationale"] || meta.rationale;
  if (!rationale || rationale.length < 5) {
    issues.push({ level: "error", message: "Metadata 'Effort rationale' is missing or too short. A justification is required." });
  }

  // Check Status
  if (!meta.status) {
    issues.push({ level: "error", message: "Required metadata 'Status' not found in header table." });
  }
}

function validateSections(content: string, issues: ValidationIssue[]) {
  for (const section of REQUIRED_SECTIONS) {
    if (!section.pattern.test(content)) {
      issues.push({
        level: "error",
        message: `Required section missing: '${section.name}'.`,
      });
    }
  }
}

function validatePlaceholders(lines: string[], issues: ValidationIssue[]) {
  lines.forEach((line, idx) => {
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(line)) {
        issues.push({
          level: "warn",
          line: idx + 1,
          message: `Draft placeholder detected on line ${idx + 1}: ${line.trim()}`,
        });
      }
    }
  });
}

function validateBdd(content: string, issues: ValidationIssue[]) {
  const hasGherkin =
    /(?:Scenario|Cenário):/i.test(content) &&
    /(?:Given|Dado|Quando|When)/i.test(content) &&
    /(?:Then|Então)/i.test(content);

  if (!hasGherkin) {
    issues.push({
      level: "warn",
      message: "No BDD scenario detected in Given-When-Then format.",
    });
  }
}

function validateTasks(content: string, issues: ValidationIssue[]) {
  const hasTasks =
    /-\s*\[[ xX]\]/i.test(content) ||
    /(?:Phase|Fase)\s*\d+/i.test(content) ||
    /Task|Tarefa/i.test(content);

  if (!hasTasks) {
    issues.push({
      level: "warn",
      message: "No task checklist detected in spec (expected checklist `- [ ]` or structured task phases).",
    });
  }
}
