/**
 * validator.ts - Linter determinístico de especificações (spec.md) no Fireskills.
 *
 * Transforma a validação do Definition Gate e do Plan Gate em uma checagem
 * programática antes que o agente ou desenvolvedor avance o estado da spec.
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
  { name: "Contexto ou Problema", pattern: /#+\s*(?:\d+[.\s]*)?(?:contexto|problema|visão|objetivo)/i },
  { name: "Atores, Histórias ou Requisitos", pattern: /#+\s*(?:\d+[.\s]*)?(?:atores|histórias|requisitos|escopo)/i },
  { name: "Cenários BDD", pattern: /#+\s*(?:\d+[.\s]*)?(?:cenários|bdd|comportamento|aceite)/i },
  { name: "Fases de Tarefas", pattern: /#+\s*(?:\d+[.\s]*)?(?:tarefas|tasks|plano|fases)/i },
  { name: "Testes e Evidências", pattern: /#+\s*(?:\d+[.\s]*)?(?:[^\n]*\btestes?\b|evid[eê]ncias?|provas?|valida)/i },
];

const PLACEHOLDER_PATTERNS = [
  /\[TODO\]/i,
  /\[preencher\]/i,
  /\[TBD\]/i,
  /\[em aberto\]/i,
  /\[descrever\]/i,
];

/** Localiza o caminho completo para o spec.md dado um caminho ou ID. */
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

  // Busca em specs/<estado>/<target>/spec.md
  for (const folder of SPEC_FOLDERS) {
    const candidate = join(projectRoot, "specs", folder, target, "spec.md");
    if (existsSync(candidate)) return candidate;

    // Busca parcial por slug
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

/** Valida integralmente uma spec.md. */
export async function validateSpec(
  specPath: string,
  options: { strict?: boolean } = {},
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  if (!existsSync(specPath)) {
    return {
      path: specPath,
      valid: false,
      issues: [{ level: "error", message: `Arquivo não encontrado: ${specPath}` }],
      summary: { errors: 1, warnings: 0 },
    };
  }

  const content = await fs.readFile(specPath, "utf-8");
  const lines = content.split("\n");

  // 1. Validação da Tabela de Metadados
  validateMetadata(lines, issues);

  // 2. Validação de Seções Obrigatórias
  validateSections(content, issues);

  // 3. Detecção de Placeholders Não Preenchidos
  validatePlaceholders(lines, issues);

  // 4. Validação de Cenários BDD
  validateBdd(content, issues);

  // 5. Validação de Tarefas
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
      if (key !== "campo" && key !== "---") {
        meta[key] = value;
      }
    }
  }

  // Verifica Effort
  if (!meta.effort) {
    issues.push({ level: "error", message: "Metadado obrigatório 'Effort' não encontrado no cabeçalho." });
  } else {
    const score = parseInt(meta.effort, 10);
    if (isNaN(score) || score < 1 || score > 10) {
      issues.push({ level: "error", message: `Effort inválido '${meta.effort}': deve ser um número inteiro de 1 a 10.` });
    }
  }

  // Verifica Effort rationale
  const rationale = meta["effort rationale"] || meta.rationale;
  if (!rationale || rationale.length < 5) {
    issues.push({ level: "error", message: "Metadado 'Effort rationale' ausente ou vazio. É obrigatório justificar o esforço." });
  }

  // Verifica Status
  if (!meta.status) {
    issues.push({ level: "error", message: "Metadado obrigatório 'Status' não encontrado no cabeçalho." });
  }
}

function validateSections(content: string, issues: ValidationIssue[]) {
  for (const section of REQUIRED_SECTIONS) {
    if (!section.pattern.test(content)) {
      issues.push({
        level: "error",
        message: `Seção obrigatória ausente: '${section.name}'.`,
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
          message: `Placeholder de rascunho detectado na linha ${idx + 1}: ${line.trim()}`,
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
      message: "Nenhum cenário de comportamento no formato BDD (Given-When-Then ou Dado-Quando-Então) detectado.",
    });
  }
}

function validateTasks(content: string, issues: ValidationIssue[]) {
  const hasTasks =
    /-\s*\[[ xX]\]/i.test(content) ||
    /Fase\s*\d+/i.test(content) ||
    /Task|Tarefa/i.test(content);

  if (!hasTasks) {
    issues.push({
      level: "warn",
      message: "Nenhuma lista de tarefas identificada na spec (esperado checklist `- [ ]` ou fases estruturadas).",
    });
  }
}
