#!/usr/bin/env node
/**
 * Imports only development requirements from MVP as backlog and Draft spec.
 * The milestone records provenance and screening without copying business
 * context. Gaps remain pending; the workflow does not implement code or pass gates.
 */

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const skillRoot = dirname(fileURLToPath(import.meta.url));
const backlogScript = resolve(skillRoot, "../../fireskill-02-backlog/scripts/iniciar_backlog.mjs");
const specScript = resolve(skillRoot, "../../fireskill-03-specify/scripts/iniciar_spec.mjs");

function fail(message) { throw new Error(message); }

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--")) fail(`invalid argument: ${key}`);
    if (value === undefined || value.startsWith("--")) fail(`missing value for ${key}`);
    values[key.slice(2)] = value;
    index += 1;
  }
  return values;
}

function containsSensitiveData(content) {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*\S+/iu.test(content);
}

function titleFromTheme(theme, index) {
  const firstLine = theme.split(/\r?\n/u).find((line) => line.trim())?.replace(/^#+\s*/u, "").trim();
  return firstLine && firstLine.length <= 100 ? firstLine : `MVP Theme ${index}`;
}

const developmentSignals = [
  "cadastro", "consulta", "listagem", "dashboard", "tela", "pagina", "formulario",
  "login", "autenticacao", "autorizacao", "integracao", "api", "endpoint", "banco",
  "persist", "notificacao", "upload", "download", "workflow", "funcionalidade",
  "feature", "servico", "relatorio", "filtro", "busca", "criar", "editar", "excluir",
  "listar", "consultar", "enviar", "gerar", "salvar", "automatizar", "receber",
  "mostrar", "acompanhar", "visualizar", "pedido", "cliente", "andamento", "painel", "lista",
  "registration", "query", "listing", "screen", "page", "form", "authentication", "authorization",
  "integration", "database", "notification", "service", "report", "filter", "search", "create",
  "edit", "delete", "list", "send", "generate", "save", "automate", "receive", "show", "track", "view"
];

const nonDevelopmentHeadings = [
  "visao", "visao do produto", "publico", "publico-alvo", "persona", "posicionamento",
  "principios", "principios do produto", "contexto", "problema", "metricas", "metricas de sucesso",
  "premissas", "restricoes", "escopo", "fora de escopo", "objetivo geral", "modelo de negocio",
  "modelo comercial", "monetizacao", "preco", "precificacao", "receita", "jornada do cliente",
  "vision", "product vision", "audience", "target audience", "positioning", "principles",
  "context", "problem", "metrics", "success metrics", "assumptions", "constraints", "scope",
  "out of scope", "general objective", "business model", "monetization", "pricing", "revenue"
];

function classifyTheme(theme, index) {
  const title = normalized(titleFromTheme(theme, index));
  const text = normalized(theme);
  const explicitBuild = /\b(?:desenvolver|desenvolvimento|implementar|implementacao|construir|criar|entregar|feature|funcionalidade|develop|development|implement|build|create|deliver)\b/u.test(text);
  const explicitBehavior = /\b(?:sistema|aplicacao|app|produto|servico|system|application|product|service)\b.{0,80}\b(?:deve|permitir|possibilitar|salvar|consultar|listar|enviar|gerar|automatizar|must|should|allow|enable|save|query|list|send|generate|automate)\b/u.test(text);
  const headingOnlyContext = nonDevelopmentHeadings.some((value) => title === value || title.startsWith(`${value}:`));
  const featureNoun = developmentSignals.some((value) => title.includes(value));
  const bodyBehavior = developmentSignals.some((value) => text.includes(value));

  if (headingOnlyContext) {
    return { developable: false, reason: "business or contextual topic, preserved only in MVP" };
  }
  if (explicitBuild || explicitBehavior || featureNoun) {
    return { developable: true, reason: "software capability or behavior identified" };
  }
  if (bodyBehavior && /\b(?:resultado|entrega|capacidade|fluxo|outcome|deliverable|capability|flow)\b/u.test(text)) {
    return { developable: true, reason: "software delivery suggested by excerpt" };
  }
  return { developable: false, reason: "no software capability or behavior identified" };
}

function quotedTheme(theme) {
  return theme.trim().split(/\r?\n/gu).map((line) => `> ${line}`).join("\n");
}

function normalized(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function cleanValue(value) {
  return value
    .replace(/^[-*+]\s+/u, "")
    .replace(/^>\s?/u, "")
    .replace(/[`*_]/gu, "")
    .trim();
}

const labels = {
  problem: ["problema", "problema percebido", "dor", "necessidade", "problem", "pain", "need"],
  person: ["pessoa", "pessoas", "publico", "publico-alvo", "usuario", "usuarios", "para quem", "quem usa", "destinado a", "person", "audience", "target audience", "user", "users", "for whom"],
  result: ["resultado", "resultado esperado", "valor", "objetivo", "sucesso", "saida", "outcome", "expected outcome", "result", "value", "objective", "success", "output"],
  context: ["contexto", "jornada", "fluxo", "escopo", "context", "journey", "flow", "scope"],
  menu: ["menus e navegacao principal", "menu", "menus", "navegacao", "navegacao principal", "main navigation and menus", "navigation", "main navigation"],
};

function labelValue(line, field) {
  const candidate = normalized(line).replace(/^#+\s*/u, "");
  const matches = labels[field].map(normalized).sort((left, right) => right.length - left.length);
  for (const label of matches) {
    if (candidate === label) return "";
    if (candidate.startsWith(`${label}:`)) return cleanValue(line.slice(line.indexOf(":") + 1));
    if (candidate.startsWith(`${label} -`)) return cleanValue(line.slice(line.indexOf("-") + 1));
  }
  return null;
}

function extractLabeledValue(theme, field) {
  const lines = theme.split(/\r?\n/gu);
  for (let index = 0; index < lines.length; index += 1) {
    const direct = labelValue(lines[index], field);
    if (direct) return direct;
    if (direct === null) continue;

    const heading = lines[index].replace(/^\s*#+\s*/u, "").trim();
    if (!labels[field].some((label) => normalized(heading) === normalized(label))) continue;
    const collected = [];
    for (let next = index + 1; next < lines.length; next += 1) {
      if (/^\s*#{1,6}\s+/u.test(lines[next])) break;
      const value = cleanValue(lines[next]);
      if (value) collected.push(value);
    }
    if (collected.length) return collected.join("\n");
  }
  return null;
}

function extractObviousValue(theme, field) {
  const labeled = extractLabeledValue(theme, field);
  if (labeled) return { value: labeled, reason: "explicit label in excerpt" };

  const candidates = theme.split(/\r?\n/gu).map(cleanValue).filter(Boolean);
  const patterns = {
    problem: [/^(?:o|a|the)\s+(?:problema|dor|necessidade|problem|pain|need)\s+(?:e|é|is)\s+/iu, /\b(?:nao|não|cannot|unable to)\s+(?:consegue|conseguem|tem|têm|possui|possuem)?\b/iu, /\bdificuldade|difficulty\b/iu],
    person: [/^(?:para quem|destinado a|feito para|usuarios?|usuárias?|pessoas?|for whom|intended for|users?)\b/iu],
    result: [/^(?:o sistema|a pessoa|o usuario|a usuaria|the system|the user)\s+(?:deve|consegue|conseguira|conseguirá|shall|must|can|will)\b/iu, /^(?:permitir|possibilitar|entregar|gerar|obter|allow|enable|deliver|generate|obtain)\b/iu],
    context: [/^(?:durante|quando|ao|na|no|em|during|when|upon|in|at)\b/iu],
    menu: [/\bmenus?\b/iu, /\bnavega(?:ção|cao)\b/iu, /\bnavigation\b/iu],
  };
  const candidate = candidates.find((line) => patterns[field].some((pattern) => pattern.test(line)));
  return candidate ? { value: candidate, reason: "unambiguous formulation in excerpt" } : null;
}

function themeBody(theme) {
  return theme.replace(/^\s*#{1,6}\s+[^\r\n]*(?:\r?\n|$)/u, "").trim() || theme.trim();
}

function initialBacklogFields(theme) {
  const extracted = Object.fromEntries(Object.keys(labels).map((field) => [field, extractObviousValue(theme, field)]));
  const fields = {
    idea: themeBody(theme),
    problem: extracted.problem?.value ?? "Gap: the MVP does not state the perceived problem for this topic.",
    person: extracted.person?.value ?? "Gap: the MVP does not identify the affected user/beneficiary for this topic.",
    result: extracted.result?.value ?? "Gap: the MVP does not state the expected outcome or value for this topic.",
    context: extracted.context?.value ?? "Requirement imported from MVP.md and linked to milestone M01.",
    menu: extracted.menu?.value ?? "Gap: the MVP does not state menus or main navigation for this topic.",
  };
  const defaults = Object.entries(extracted)
    .filter(([, item]) => item)
    .map(([field, item]) => ({ field, value: item.value, reason: item.reason }));
  return { fields, defaults };
}

function automaticDefaults(defaults) {
  if (!defaults.length) return "## Automatically applied defaults\n\n- No safe defaults found; gaps remain open for interview.\n\n";
  return [
    "## Automatically applied defaults",
    "",
    "The importer applied only answers supported by the MVP excerpt:",
    "",
    ...defaults.map(({ field, value, reason }) => `- **${field}**: ${value} _(basis: ${reason})_`),
    "",
    "Unfilled gaps remain open for `$fireskill-02-backlog`.",
    "",
  ].join("\n");
}

function mvpEvidence(theme) {
  return [
    "## Confirmed MVP records",
    "",
    "- Origin source: `MVP.md`.",
    "- Origin milestone: `specs/milestones/M01.md`.",
    "- Use text below to fill already declared answers before asking questions.",
    "- Ask only about remaining gaps, ambiguities, or contradictions.",
    "",
    "### Imported excerpt",
    "",
    quotedTheme(theme),
    "",
  ].join("\n");
}

function themes(content) {
  const sections = content
    .split(/(?=^#{2,}\s+)/mu)
    .map((section) => section.trim())
    .filter((section) => section && section.replace(/^#\s+.*$/mu, "").trim());
  if (/^#{2,}\s+/mu.test(content) && sections.length) return sections;

  const paragraphs = content.split(/\r?\n\s*\r?\n/gu).map((item) => item.trim()).filter(Boolean);
  return paragraphs.length ? paragraphs : [content.trim()];
}

async function resolveSuperprojectRoot(root) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, "rev-parse", "--show-superproject-working-tree"], { encoding: "utf8" });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function readMvpSource(root) {
  const localSource = join(root, "MVP.md");
  try {
    return { content: await readFile(localSource, "utf8"), source: localSource };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const superprojectRoot = await resolveSuperprojectRoot(root);
  if (!superprojectRoot) fail("MVP.md not found at project root");
  const source = join(superprojectRoot, "MVP.md");
  try {
    return { content: await readFile(source, "utf8"), source };
  } catch (error) {
    if (error?.code === "ENOENT") fail("MVP.md not found in project or parent repository");
    throw error;
  }
}

async function run(script, args) {
  const { stdout } = await execFileAsync("node", [script, ...args], { encoding: "utf8" });
  return stdout.trim();
}

function replaceOnce(content, needle, value) {
  if (!content.includes(needle)) return content;
  return content.replace(needle, value);
}

function automaticAnswers(defaults) {
  return defaults.length
    ? defaults.map(({ field, value, reason }) => `- **${field}**: ${value} _(basis: ${reason})_`).join("\n")
    : "- No safe automatic answers found.";
}

function openQuestions(fields) {
  const missing = Object.entries(fields)
    .filter(([field, value]) => ["problem", "person", "result", "menu"].includes(field) && (value.startsWith("Gap:") || value.startsWith("Lacuna:")))
    .map(([, value]) => `- ${value.replace(/^(?:Gap|Lacuna):/u, "Pending:")}`);
  return missing.length ? missing.join("\n") : "- No gaps in these fields; validate remaining choices during refinement.";
}

function renderDraftSpec(content, title, backlogPath, fields, defaults) {
  const pending = (value) => (value.startsWith("Gap:") || value.startsWith("Lacuna:")) ? value.replace(/^(?:Gap|Lacuna):/u, "Pending:") : value;
  const actor = pending(fields.person);
  const problem = pending(fields.problem);
  const result = pending(fields.result);
  const menu = pending(fields.menu);
  const idea = fields.idea;
  let rendered = content
    .replaceAll("| Milestones | |", "| Milestones | M01 |")
    .replaceAll("| Human Interface | To be defined |", "| Human Interface | Pending: MVP does not specify if there is a human interface. |")
    .replaceAll("| Interface para pessoas | A definir |", "| Interface para pessoas | Pending: MVP does not specify if there is a human interface. |")
    .replaceAll("[Dor observável e contexto.]", problem)
    .replaceAll("[Observable pain and context.]", problem)
    .replaceAll("[Mudança percebida pelo usuário ou negócio.]", result)
    .replaceAll("[Change perceived by user or business.]", result)
    .replaceAll("[Capacidade incluída.]", idea)
    .replaceAll("[Included capability.]", idea)
    .replaceAll("[Limite explícito.]", "MVP did not state additional boundaries; maintain scope of this topic.")
    .replaceAll("[Explicit boundary.]", "MVP did not state additional boundaries; maintain scope of this topic.")
    .replaceAll("[Ator]", actor)
    .replaceAll("[Actor]", actor)
    .replaceAll("[Menu principal e menus secundários, seus itens, destinos ou rotas, permissões e comportamento responsivo. Se não houver menu, declare como a pessoa chega às telas e por que a navegação direta é suficiente.]", menu)
    .replaceAll("[Main menu and secondary menus, their items, destinations or routes, permissions, and responsive behavior. If there is no menu, declare how the user reaches the screens and why direct navigation is sufficient.]", menu)
    .replaceAll("[objetivo, permissões ou responsabilidade]", "Executes or receives the result described in the MVP; permissions to be confirmed.")
    .replaceAll("[goal, permissions, or responsibility]", "Executes or receives the result described in the MVP; permissions to be confirmed.")
    .replaceAll("[título]", title)
    .replaceAll("[title]", title)
    .replaceAll("[capacidade]", idea)
    .replaceAll("[capability]", idea)
    .replaceAll("[valor]", result)
    .replaceAll("[value]", result)
    .replaceAll("[capacidade observável]", title)
    .replaceAll("[observable capability]", title)
    .replaceAll("[estado inicial]", "MVP topic is available to be executed.")
    .replaceAll("[initial state]", "MVP topic is available to be executed.")
    .replaceAll("[ação]", idea)
    .replaceAll("[action]", idea)
    .replaceAll("[resultado observável]", result)
    .replaceAll("[observable result]", result)
    .replaceAll("[contexto alternativo]", "Flow receives the data anticipated in the MVP topic.")
    .replaceAll("[alternative context]", "Flow receives the data anticipated in the MVP topic.")
    .replaceAll("[regra observável]", "System preserves the outcome described in the MVP.")
    .replaceAll("[observable rule]", "System preserves the outcome described in the MVP.")
    .replaceAll("[condição de falha ou limite]", "Required information is not yet declared in the MVP.")
    .replaceAll("[failure condition or boundary]", "Required information is not yet declared in the MVP.")
    .replaceAll("[tratamento observável]", "System records the gap and does not invent an answer.")
    .replaceAll("[observable handling]", "System records the gap and does not invent an answer.")
    .replaceAll("O sistema deve [comportamento verificável].", `The system must execute ${idea} and produce ${result}.`)
    .replaceAll("The system must [verifiable behavior].", `The system must execute ${idea} and produce ${result}.`)
    .replaceAll("[pergunta investigada] → [conclusão e impacto].", `Reading ${backlogPath} → defaults reused; gaps remain in Draft.`)
    .replaceAll("[investigated question] → [conclusion and impact].", `Reading ${backlogPath} → defaults reused; gaps remain in Draft.`)
    .replaceAll("[Código, documento, stakeholder ou “Nenhuma fonte externa”.]", `MVP.md and ${backlogPath}.`)
    .replaceAll("[Code, document, stakeholder, or “No external source”.]", `MVP.md and ${backlogPath}.`)
    .replaceAll("[Pergunta material] → **A**: [resposta incorporada].", automaticAnswers(defaults))
    .replaceAll("[Material question] → **A**: [incorporated response].", automaticAnswers(defaults))
    .replaceAll("[Pergunta bloqueante ou “Nenhuma”.]", openQuestions(fields))
    .replaceAll("[Blocking question or “None”.]", openQuestions(fields))
    .replaceAll("[Stack, arquitetura e convenções encontradas no repositório.]", "Not analyzed during import; no implementation is executed.")
    .replaceAll("[Stack, architecture, and conventions found in the repository.]", "Not analyzed during import; no implementation is executed.")
    .replaceAll("[Framework, roteamento, componentes, estilos, formulários, testes, telas atuais afetadas e fontes locais observadas. Explique “A confirmar” quando a stack não definir a camada.]", "To be confirmed in later step; this import does not select stack.")
    .replaceAll("[Framework, routing, components, styles, forms, tests, affected current screens, and observed local sources. Explain “To be confirmed” when the stack does not define the layer.]", "To be confirmed in later step; this import does not select stack.")
    .replaceAll("[Condição] → [comportamento observável].", "Material gap → keep spec as Draft and ask only during refinement.")
    .replaceAll("[Condition] → [observable behavior].", "Material gap → keep spec as Draft and ask only during refinement.");
  rendered = replaceOnce(rendered, "- [Métrica mensurável com alvo.]", "- Metric and target to be confirmed; MVP did not declare observable measurement.");
  rendered = replaceOnce(rendered, "- [Measurable metric with target.]", "- Metric and target to be confirmed; MVP did not declare observable measurement.");
  rendered = replaceOnce(rendered, "- [Fora de escopo]", "- Out of scope not declared in MVP; confirm before promoting gate.");
  rendered = replaceOnce(rendered, "- [Out of scope]", "- Out of scope not declared in MVP; confirm before promoting gate.");
  return rendered.replace(/\[([^\]\r\n]+)\]/gu, "Pending: $1");
}

async function createDraftSpec(root, title, backlogPath, fields, defaults) {
  const specPath = await run(specScript, ["--title", title, "--root", root]);
  const content = await readFile(specPath, "utf8");
  const rendered = renderDraftSpec(content, title, backlogPath, fields, defaults);
  await writeFile(specPath, rendered, "utf8");
  return specPath;
}

async function createMilestone(root, source, content, developmentThemes, skippedThemes) {
  const destination = join(root, "specs", "milestones", "M01.md");
  await mkdir(dirname(destination), { recursive: true });
  const hash = createHash("sha256").update(content).digest("hex");
  const milestone = [
    "# Milestone 1.0",
    "",
    "| Metadata | Value |",
    "| --- | --- |",
    "| Status | Imported from MVP.md |",
    `| Origin | \`${relative(root, source) || "MVP.md"}\` |`,
    `| Origin integrity | SHA-256 \`${hash}\` |`,
    "",
    "## Import Screening",
    "",
    `- Imported development requirements: ${developmentThemes.length}.`,
    "- Business context, positioning, audience, metrics, and other non-technical topics remain solely in `MVP.md`.",
    ...(skippedThemes.length ? ["", "### Non-imported topics", "", ...skippedThemes.map(({ title, classification }) => `- ${title}: ${classification.reason}.`), "", "If any of these is a software deliverable, create the backlog with `$fireskill-02-backlog`."] : []),
    "",
    "## Provenance and Next Steps",
    "",
    "Each imported requirement directly generates a backlog and Draft spec.",
    "Importing does not create Inboxes and does not duplicate business content into Fireskills.",
    "",
  ].join("\n");
  try {
    await writeFile(destination, milestone, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") fail("milestone 1.0 already exists and will not be overwritten");
    throw error;
  }
  return destination;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolve(args.root ?? process.cwd());
  const { content, source } = await readMvpSource(root);
  if (!content.trim()) fail("MVP.md cannot be empty");
  if (containsSensitiveData(content)) fail("MVP.md contains apparent sensitive data; remove before importing");

  const classified = themes(content)
    .map((theme, index) => ({ theme, title: titleFromTheme(theme, index + 1), classification: classifyTheme(theme, index + 1) }));
  const developmentThemes = classified.filter(({ classification }) => classification.developable);
  const skippedThemes = classified.filter(({ classification }) => !classification.developable);
  const milestone = await createMilestone(root, source, content, developmentThemes, skippedThemes);
  const created = [];

  for (const { theme, title, classification } of developmentThemes) {
    const extracted = initialBacklogFields(theme);
    const backlog = await run(backlogScript, [
      "--title", title,
      "--idea", extracted.fields.idea,
      "--problem", extracted.fields.problem,
      "--person", extracted.fields.person,
      "--result", extracted.fields.result,
      "--context", extracted.fields.context,
      "--root", root,
    ]);
    const backlogContent = await readFile(backlog, "utf8");
    const backlogRelative = relative(root, backlog);
    await writeFile(backlog, backlogContent.replace(
      "## Related references\n\n- No relevant references found.",
      `${automaticDefaults(extracted.defaults)}${mvpEvidence(theme)}\n## Related references\n\n- Origin source: \`MVP.md\`.\n- Origin milestone: \`specs/milestones/M01.md\`.\n- Mandatory refinement: \`$fireskill-02-backlog\` only for gaps, ambiguities, or contradictions before promotion.`,
    ).replace(
      "## Referências relacionadas\n\n- Nenhuma referência relevante encontrada.",
      `${automaticDefaults(extracted.defaults)}${mvpEvidence(theme)}\n## Related references\n\n- Origin source: \`MVP.md\`.\n- Origin milestone: \`specs/milestones/M01.md\`.\n- Mandatory refinement: \`$fireskill-02-backlog\` only for gaps, ambiguities, or contradictions before promotion.`,
    ), "utf8");
    const specPath = await createDraftSpec(
      root,
      title,
      backlogRelative,
      extracted.fields,
      extracted.defaults,
    );
    const completedBacklog = await readFile(backlog, "utf8");
    await writeFile(backlog, completedBacklog
      .replace("| Status | Captured |", "| Status | Promoted |")
      .replace("| Promoted Spec | None |", `| Promoted Spec | \`${relative(root, specPath)}\` |`)
      .replace("| Spec promovida | Nenhuma |", `| Promoted Spec | \`${relative(root, specPath)}\` |`), "utf8");
    created.push({
      title,
      backlog: backlogRelative,
      spec: relative(root, specPath),
      reason: classification.reason,
      defaults: extracted.defaults,
    });
  }

  console.log(JSON.stringify({ milestone: relative(root, milestone), items: created }, null, 2));
}

main().catch((error) => {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
