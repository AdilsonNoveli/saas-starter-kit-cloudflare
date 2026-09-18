/**
 * lessons.ts - Motor determinístico de Lições Aprendidas para o Fireskills.
 *
 * O modelo/humano fornece o julgamento (qual erro aconteceu, a regra preventiva
 * e a evidência que o fundamenta). Este módulo gerencia o registro mecânico:
 * IDs sequenciais, contagem de recorrência por fatias distintas, promoção
 * automática de candidato para confirmado, quarentena e geração do playbook.
 *
 * Estado canônico: .fireskills/lessons.json (propriedade do motor)
 * Visão compilada: .fireskills/LESSONS.md (regenerado em cada escrita)
 */

import { existsSync, promises as fs } from "node:fs";
import { join } from "node:path";

export type LessonSignal =
  | "ac_gap"
  | "surviving_mutant"
  | "spec_precision_gap"
  | "spec_deviation"
  | "gate_fail";

export type LessonStatus = "candidate" | "confirmed" | "quarantined";

export interface Lesson {
  id: number;
  summary: string;
  rule: string;
  signal: LessonSignal;
  status: LessonStatus;
  sources: string[];
  occurrences: number;
  created_at: string;
  updated_at: string;
  penalties: number;
}

export interface LessonsStore {
  schema: number;
  promote_threshold: number;
  window_days: number;
  quarantine_threshold: number;
  next_id: number;
  lessons: Lesson[];
}

export const SIGNALS: Record<LessonSignal, string> = {
  ac_gap: "Critério de aceite não coberto ou quebrado",
  surviving_mutant: "Mutante sobreviveu (teste fraco ou falso-positivo)",
  spec_precision_gap: "Especificação imprecisa ou ambígua",
  spec_deviation: "Implementação divergiu do plano/contrato",
  gate_fail: "Falha de typecheck, linter ou teste unitário em gate",
};

const DEFAULTS = {
  promote_threshold: 2,
  window_days: 60,
  quarantine_threshold: 2,
};

function nowIso(): string {
  return new Date().toISOString();
}

function getStorePath(projectRoot: string): string {
  return join(projectRoot, ".fireskills", "lessons.json");
}

function getRenderPath(projectRoot: string): string {
  return join(projectRoot, ".fireskills", "LESSONS.md");
}

/** Carrega o banco de lições de .fireskills/lessons.json ou cria a estrutura padrão. */
export async function loadLessons(projectRoot: string): Promise<LessonsStore> {
  const path = getStorePath(projectRoot);
  if (!existsSync(path)) {
    return {
      schema: 1,
      promote_threshold: DEFAULTS.promote_threshold,
      window_days: DEFAULTS.window_days,
      quarantine_threshold: DEFAULTS.quarantine_threshold,
      next_id: 1,
      lessons: [],
    };
  }

  try {
    const raw = await fs.readFile(path, "utf-8");
    const data = JSON.parse(raw) as Partial<LessonsStore>;
    return {
      schema: 1,
      promote_threshold: data.promote_threshold ?? DEFAULTS.promote_threshold,
      window_days: data.window_days ?? DEFAULTS.window_days,
      quarantine_threshold: data.quarantine_threshold ?? DEFAULTS.quarantine_threshold,
      next_id: data.next_id ?? 1,
      lessons: data.lessons ?? [],
    };
  } catch {
    return {
      schema: 1,
      promote_threshold: DEFAULTS.promote_threshold,
      window_days: DEFAULTS.window_days,
      quarantine_threshold: DEFAULTS.quarantine_threshold,
      next_id: 1,
      lessons: [],
    };
  }
}

/** Salva o banco em .fireskills/lessons.json e compila o .fireskills/LESSONS.md. */
export async function saveLessons(
  projectRoot: string,
  store: LessonsStore,
): Promise<void> {
  const storePath = getStorePath(projectRoot);
  const renderPath = getRenderPath(projectRoot);

  await fs.mkdir(join(projectRoot, ".fireskills"), { recursive: true });

  await fs.writeFile(
    storePath,
    JSON.stringify(store, null, 2) + "\n",
    "utf-8",
  );

  const markdown = renderLessonsMarkdown(store);
  await fs.writeFile(renderPath, markdown, "utf-8");
}

/** Registra uma nova lição ou incrementa ocorrência em lição existente. */
export async function addLesson(
  projectRoot: string,
  input: {
    summary: string;
    rule: string;
    signal: LessonSignal;
    source: string;
  },
): Promise<{ lesson: Lesson; promoted: boolean }> {
  const store = await loadLessons(projectRoot);
  const now = nowIso();

  // Normaliza o resumo para comparar similaridade
  const normalizedSummary = input.summary.trim().toLowerCase();

  const existing = store.lessons.find(
    (l) => l.summary.trim().toLowerCase() === normalizedSummary,
  );

  if (existing) {
    if (!existing.sources.includes(input.source)) {
      existing.sources.push(input.source);
      existing.occurrences += 1;
    }
    existing.updated_at = now;

    let promoted = false;
    if (
      existing.status === "candidate" &&
      existing.occurrences >= store.promote_threshold
    ) {
      existing.status = "confirmed";
      promoted = true;
    }

    await saveLessons(projectRoot, store);
    return { lesson: existing, promoted };
  }

  const newLesson: Lesson = {
    id: store.next_id++,
    summary: input.summary.trim(),
    rule: input.rule.trim(),
    signal: input.signal,
    status: "candidate",
    sources: [input.source],
    occurrences: 1,
    created_at: now,
    updated_at: now,
    penalties: 0,
  };

  store.lessons.push(newLesson);
  await saveLessons(projectRoot, store);
  return { lesson: newLesson, promoted: false };
}

/** Penaliza uma lição caso ela cause falso-positivo ou falhe na prática. */
export async function penalizeLesson(
  projectRoot: string,
  id: number,
  _reason?: string,
): Promise<Lesson> {
  const store = await loadLessons(projectRoot);
  const lesson = store.lessons.find((l) => l.id === id);
  if (!lesson) {
    throw new Error(`Lição com ID ${id} não encontrada.`);
  }

  lesson.penalties += 1;
  lesson.updated_at = nowIso();

  if (lesson.penalties >= store.quarantine_threshold) {
    lesson.status = "quarantined";
  }

  await saveLessons(projectRoot, store);
  return lesson;
}

/** Remove candidatos antigos não corroborados. */
export async function pruneLessons(projectRoot: string): Promise<number> {
  const store = await loadLessons(projectRoot);
  const now = Date.now();
  const windowMs = store.window_days * 24 * 60 * 60 * 1000;

  const initialCount = store.lessons.length;
  store.lessons = store.lessons.filter((lesson) => {
    if (lesson.status === "confirmed") return true;
    const updatedMs = new Date(lesson.updated_at).getTime();
    return now - updatedMs <= windowMs;
  });

  const pruned = initialCount - store.lessons.length;
  if (pruned > 0) {
    await saveLessons(projectRoot, store);
  }
  return pruned;
}

/** Retorna resumo quantitativo do banco de lições. */
export async function getLessonsStatus(projectRoot: string): Promise<{
  confirmed: number;
  candidate: number;
  quarantined: number;
  total: number;
}> {
  const store = await loadLessons(projectRoot);
  return {
    confirmed: store.lessons.filter((l) => l.status === "confirmed").length,
    candidate: store.lessons.filter((l) => l.status === "candidate").length,
    quarantined: store.lessons.filter((l) => l.status === "quarantined").length,
    total: store.lessons.length,
  };
}

/** Renderiza a visão formatada do playbook em .fireskills/LESSONS.md. */
export function renderLessonsMarkdown(store: LessonsStore): string {
  const confirmed = store.lessons.filter((l) => l.status === "confirmed");
  const candidates = store.lessons.filter((l) => l.status === "candidate");
  const quarantined = store.lessons.filter((l) => l.status === "quarantined");

  const lines: string[] = [
    "# Playbook de Lições Aprendidas (Fireskills)",
    "",
    "> **Arquivo gerado automaticamente pelo motor de lições do Fireskills.**",
    "> Regras preventivas extraídas de regressões, mutações e falhas de teste passadas.",
    "> Não edite este arquivo manualmente. Use `bun run fireskill lesson add`.",
    "",
    "## Resumo",
    "",
    `- **Confirmadas (ativas)**: ${confirmed.length}`,
    `- **Candidatas (em observação)**: ${candidates.length}`,
    `- **Em Quarentena**: ${quarantined.length}`,
    "",
    "---",
    "",
    "## 🛡️ Lições Confirmadas (Obrigatórias no Planejamento e Código)",
    "",
  ];

  if (confirmed.length === 0) {
    lines.push("_Nenhuma lição confirmada registrada ainda._", "");
  } else {
    for (const l of confirmed) {
      lines.push(`### L-${String(l.id).padStart(3, "0")}: ${l.summary}`);
      lines.push("");
      lines.push(`- **Regra Preventiva**: ${l.rule}`);
      lines.push(`- **Sinal de Origem**: \`${l.signal}\` (${SIGNALS[l.signal]})`);
      lines.push(`- **Ocorrências**: ${l.occurrences} (fontes: ${l.sources.join(", ")})`);
      lines.push(`- **Última Atualização**: ${l.updated_at.split("T")[0]}`);
      lines.push("");
    }
  }

  lines.push("---", "", "## 🧪 Lições Candidatas (Aguardando Reincidência)", "");

  if (candidates.length === 0) {
    lines.push("_Nenhuma candidata pendente._", "");
  } else {
    for (const l of candidates) {
      lines.push(`- **[C-${String(l.id).padStart(3, "0")}]** **${l.summary}** — ${l.rule} *(sinal: \`${l.signal}\`, fonte: ${l.sources.join(", ")})*`);
    }
    lines.push("");
  }

  if (quarantined.length > 0) {
    lines.push("---", "", "## ⚠️ Lições em Quarentena", "");
    for (const l of quarantined) {
      lines.push(`- **[Q-${String(l.id).padStart(3, "0")}]** **${l.summary}** — Penalidades: ${l.penalties}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
