#!/usr/bin/env node
/** Validates the Specsfy/2.0 structural contract. */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const input = args.find((arg) => !arg.startsWith("--"));
const draft = args.includes("--allow-draft");
const asJson = args.includes("--json");

const sections = [
  ["Problem and Outcome", "Problema e resultado"],
  ["Research and Clarifications", "Research e esclarecimentos"],
  ["Scope and Actors", "Escopo e atores"],
  ["Project Principles and Constraints", "Princípios e restrições do projeto"],
  ["User Stories", "Histórias de usuário"],
  ["Acceptance BDD Scenarios", "Cenários BDD de aceite"],
  ["Requirements", "Requisitos"],
  ["Technical Plan", "Plano técnico"],
  ["Data Model", "Modelo de dados"],
  ["Interfaces and Contracts", "Interfaces e contratos"],
  ["TDD Strategy", "Estratégia TDD"],
  ["Testing and Traceability Plan", "Plano de testes e rastreabilidade"],
  ["Validations", "Validações"],
  ["Tasks", "Tarefas"],
  ["Execution Order", "Ordem de execução"],
  ["Dependencies, Risks, and Assumptions", "Dependências, riscos e suposições"],
  ["Decisions", "Decisões"],
  ["Definition of Done", "Definition of Done"],
];

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const field = (body, keys) => {
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    const match = body.match(new RegExp(`^\\|\\s*${escape(key)}\\s*\\|\\s*(.+?)\\s*\\|\\s*$`, "im"));
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
};
const identifiers = (body, kind) => [...new Set([...body.matchAll(new RegExp(`\\b${kind}-\\d{3,}\\b`, "g"))].map((match) => match[0]))];

function minimumBddErrors(body) {
  const covered = new Map();
  const matches = [...body.matchAll(/^####\s+(AC-\d{3,})\b/gm)];
  for (const [index, match] of matches.entries()) {
    const chunk = body.slice(match.index, matches[index + 1]?.index);
    const ids = chunk.match(/\*\*(?:Covers|Cobre)\*\*:\s*([^\n]+)/i)?.[1]?.match(/\b(?:US|FR|NFR)-\d{3,}\b/g) ?? [];
    for (const id of ids) covered.set(id, new Set([...(covered.get(id) ?? []), match[1]]));
  }
  const errors = [];
  for (const kind of ["US", "FR", "NFR"]) for (const id of identifiers(body, kind)) {
    const count = covered.get(id)?.size ?? 0;
    if (count < 3) errors.push(`${id} has ${count} BDD scenarios; minimum required is 3.`);
  }
  return errors;
}

/** Enforces the human interface contract and, when applicable, the canonical CRUD contract. */
function interfaceErrors(body, status) {
  const value = field(body, ["Human Interface", "Interface para pessoas"]);
  if (!value) return status === "Draft" ? [] : ["Header must declare whether Human Interface applies."];
  if (status === "Draft" && /^(?:To be defined|A definir|Pending|Pendente)\b/i.test(value)) return [];
  if (!/^(Yes|Sim|No|Não|Nao)\b/i.test(value)) {
    return ["Human Interface must start with Yes, No, Sim, or Não."];
  }
  if (!/^(Yes|Sim)\b/i.test(value)) return [];

  const requiredSections = [
    ["Human Interface", "Interface para pessoas"],
    ["Interface Stack and Conventions", "Stack e convenções de interface"],
    ["Screens and Responsibilities", "Telas e responsabilidades"],
    ["Information Flow and Navigation", "Fluxo de informação e navegação"],
    ["Menus and Primary Navigation", "Menus e navegação principal"],
    ["Forms and Actions", "Formulários e ações"],
    ["Composition and Layout", "Composição e disposição"],
    ["Selected Vue and @nuxt/ui Components", "Componentes Vue e @nuxt/ui selecionados"],
    ["States and Accessibility", "Estados e acessibilidade"],
    ["Visual Review During Development", "Revisão visual durante o desenvolvimento"],
  ];
  if (/\b(?:CRUD|DataGrid|DetailLists|PageHeader)\b/i.test(body)) {
    requiredSections.push(["CRUD Contract", "Contrato CRUD"]);
  }

  const errors = [];
  for (const aliases of requiredSections) {
    let match = null;
    let foundTitle = aliases[0];
    for (const title of aliases) {
      match = body.match(new RegExp(`^####\\s+${escape(title)}\\s*$`, "im"));
      if (match) {
        foundTitle = title;
        break;
      }
    }
    if (!match) {
      errors.push(`Human Interface: missing mandatory heading: ${aliases[0]}.`);
      continue;
    }
    const next = body.slice(match.index + match[0].length).search(/^####\s+|^###\s+/m);
    const content = body.slice(match.index + match[0].length, next < 0 ? undefined : match.index + match[0].length + next);
    if (/\[(?:Screen|How|Menu|Fields|Hierarchy|Loading|Yes or No|Tela|Como|Campos|Hierarquia|Sim ou Não)/i.test(content) || !content.trim()) {
      errors.push(`Human Interface: ${foundTitle} must describe actual behavior without template placeholders.`);
    }
    if ((aliases.includes("Menus and Primary Navigation") || aliases.includes("Menus e navegação principal")) &&
        (!/\bmenus?\b/i.test(content) || !/\b(?:item|route|destination|screen|navigat|rota|destino|tela|navega)/i.test(content))) {
      errors.push("Human Interface: Menus and Primary Navigation must map menus, items, and targets, or state why no menu exists.");
    }
    const visualChecks = [
      [/borders?|bordas?/i, "borders"],
      [/spacings?|espaçamentos?/i, "spacing"],
      [/margins?|margens?/i, "margins"],
      [/padding/i, "padding"],
      [/typography|tipografia/i, "typography"]
    ];
    if ((aliases.includes("Visual Review During Development") || aliases.includes("Revisão visual durante o desenvolvimento")) &&
        visualChecks.some(([pattern]) => !pattern.test(content))) {
      errors.push("Human Interface: Visual Review During Development must verify borders, spacing, margins, padding, and typography.");
    }
    if ((aliases.includes("CRUD Contract") || aliases.includes("Contrato CRUD")) &&
        (!/PageHeader/i.test(content) || !/UTable|DataGrid/i.test(content) || !/\bID\b/.test(content) || !/edit|editar/i.test(content) || !/delete|apagar/i.test(content))) {
      errors.push("Human Interface: CRUD Contract must declare PageHeader, UTable, ID, edit, and delete.");
    }
  }
  return errors;
}

if (!input || !existsSync(input)) {
  console.error(`ERROR: File not found: ${input ?? ""}`);
  process.exitCode = 1;
} else {
  const path = resolve(input);
  const body = await readFile(path, "utf8");
  const errors = [];
  const warnings = [];
  const status = field(body, "Status");
  const slug = field(body, "Slug");
  const gates = {
    definition: field(body, "Definition Gate"),
    plan: field(body, "Plan Gate"),
    delivery: field(body, "Delivery Gate"),
  };
  const formatValue = field(body, ["Format", "Formato"]);
  if (formatValue !== "Specsfy/2.0") errors.push("Tabular header must declare Format as Specsfy/2.0.");
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push("Slug must be kebab-case in header Slug row.");
  if (!['Draft', 'Defined', 'Planned', 'Implementing', 'Reviewing', 'Complete'].includes(status)) {
    errors.push("Status must be Draft, Defined, Planned, Implementing, Reviewing, or Complete.");
  }
  if (!draft && (status === "Draft" || gates.definition !== "Passed")) {
    errors.push("Definition Gate must be Passed for strict validation.");
  }
  for (const name of ["definition", "plan"]) {
    if (!['Pending', 'Failed', 'Passed'].includes(gates[name])) errors.push(`${name} Gate is invalid.`);
  }
  if (!['Pending', 'In Progress', 'Failed', 'Passed'].includes(gates.delivery)) {
    errors.push("Delivery Gate is invalid.");
  }
  for (const aliases of sections) {
    const found = aliases.some((title) => new RegExp(`^###\\s+(?:\\d+\\.\\s+)?${escape(title)}\\s*$`, "im").test(body));
    if (!found) errors.push(`Missing mandatory heading: ${aliases[0]}.`);
  }
  const ids = Object.fromEntries(["US", "FR", "NFR", "AC", "DEC"].map((kind) => [kind, identifiers(body, kind)]));
  for (const kind of ["US", "FR", "NFR", "AC"]) {
    if (!ids[kind].length) errors.push(`No ${kind}-NNN definition found.`);
  }
  errors.push(...minimumBddErrors(body));
  if (status === "Complete" && /^\s*-\s+\[ \]\s+T\d{3,}/m.test(body)) {
    errors.push("Status Complete does not allow uncompleted tasks in section 14.");
  }
  if (/\b(?:TODO|TBD|FIXME)\b|\[NEEDS CLARIFICATION/im.test(body) && !(status === "Draft" && draft)) {
    errors.push("Unresolved placeholders found in specification.");
  }
  errors.push(...interfaceErrors(body, status));
  const result = {
    path,
    format: formatValue,
    slug,
    status,
    gates,
    counts: Object.fromEntries(Object.entries(ids).map(([key, value]) => [key, value.length])),
    errors,
    warnings,
  };
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Spec: ${path}`);
    errors.forEach((error) => console.log(`ERROR: ${error}`));
    console.log(errors.length ? "RESULT: NOT READY" : status === "Draft" ? "RESULT: VALID DRAFT" : "RESULT: READY");
  }
  process.exitCode = errors.length ? 1 : 0;
}
