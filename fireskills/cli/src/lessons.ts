/**
 * lessons.ts - Deterministic Lessons Learned engine for Fireskills.
 *
 * The model/human provides judgment (what error happened, the preventive rule,
 * and the grounding evidence). This module manages mechanical bookkeeping:
 * sequential IDs, recurrence counting across distinct slices, automatic promotion
 * from candidate to confirmed, quarantine, and playbook rendering.
 *
 * Canonical state: .fireskills/lessons.json (engine owned)
 * Compiled view: .fireskills/LESSONS.md (regenerated on each write)
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
  ac_gap: "Acceptance criterion uncovered or broken",
  surviving_mutant: "Mutant survived (weak test or false positive)",
  spec_precision_gap: "Imprecise or ambiguous specification",
  spec_deviation: "Implementation deviated from plan or contract",
  gate_fail: "Typecheck, linter, or unit test failure at quality gate",
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

/** Loads or initializes the lessons store. */
export async function loadLessons(projectRoot: string): Promise<LessonsStore> {
  const storePath = getStorePath(projectRoot);
  if (!existsSync(storePath)) {
    return {
      schema: 1,
      promote_threshold: DEFAULTS.promote_threshold,
      window_days: DEFAULTS.window_days,
      quarantine_threshold: DEFAULTS.quarantine_threshold,
      next_id: 1,
      lessons: [],
    };
  }
  const content = await fs.readFile(storePath, "utf-8");
  return JSON.parse(content) as LessonsStore;
}

/** Saves store state and regenerates LESSONS.md. */
export async function saveLessons(
  projectRoot: string,
  store: LessonsStore,
): Promise<void> {
  const storePath = getStorePath(projectRoot);
  await fs.mkdir(join(projectRoot, ".fireskills"), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf-8");
  await renderPlaybook(projectRoot, store);
}

/**
 * Adds a new lesson or increments occurrences of an existing one.
 */
export async function addLesson(
  projectRoot: string,
  input: {
    signal: LessonSignal;
    summary: string;
    rule: string;
    source: string;
  },
): Promise<{ lesson: Lesson; promoted: boolean }> {
  const store = await loadLessons(projectRoot);
  const now = nowIso();

  const normalizedSummary = input.summary.trim();
  const normalizedRule = input.rule.trim();

  let existing = store.lessons.find(
    (l) =>
      l.status !== "quarantined" &&
      (l.summary.toLowerCase() === normalizedSummary.toLowerCase() ||
        l.rule.toLowerCase() === normalizedRule.toLowerCase()),
  );

  let promoted = false;

  if (existing) {
    if (!existing.sources.includes(input.source)) {
      existing.sources.push(input.source);
    }
    existing.occurrences += 1;
    existing.updated_at = now;

    if (
      existing.status === "candidate" &&
      existing.occurrences >= store.promote_threshold
    ) {
      existing.status = "confirmed";
      promoted = true;
    }
  } else {
    existing = {
      id: store.next_id++,
      summary: normalizedSummary,
      rule: normalizedRule,
      signal: input.signal,
      status: "candidate",
      sources: [input.source],
      occurrences: 1,
      created_at: now,
      updated_at: now,
      penalties: 0,
    };
    store.lessons.push(existing);
  }

  await saveLessons(projectRoot, store);
  return { lesson: existing, promoted };
}

/**
 * Penalizes an ineffective or misleading lesson.
 */
export async function penalizeLesson(
  projectRoot: string,
  id: number,
  _reason?: string,
): Promise<{ lesson: Lesson; quarantined: boolean }> {
  const store = await loadLessons(projectRoot);
  const lesson = store.lessons.find((l) => l.id === id);

  if (!lesson) {
    throw new Error(`Lesson with ID ${id} not found.`);
  }

  lesson.penalties += 1;
  lesson.updated_at = nowIso();

  let quarantined = false;
  if (lesson.penalties >= store.quarantine_threshold) {
    lesson.status = "quarantined";
    quarantined = true;
  }

  await saveLessons(projectRoot, store);
  return { lesson, quarantined };
}

/**
 * Prunes expired candidates.
 */
export async function pruneLessons(projectRoot: string): Promise<number> {
  const store = await loadLessons(projectRoot);
  const now = new Date();
  const windowMs = store.window_days * 24 * 60 * 60 * 1000;

  const initialCount = store.lessons.length;
  store.lessons = store.lessons.filter((l) => {
    if (l.status !== "candidate") return true;
    const updatedAt = new Date(l.updated_at).getTime();
    return now.getTime() - updatedAt <= windowMs;
  });

  const removed = initialCount - store.lessons.length;
  if (removed > 0) {
    await saveLessons(projectRoot, store);
  }
  return removed;
}

/** Returns counts by status. */
export async function getLessonsStatus(projectRoot: string): Promise<{
  total: number;
  confirmed: number;
  candidate: number;
  quarantined: number;
}> {
  const store = await loadLessons(projectRoot);
  return {
    total: store.lessons.length,
    confirmed: store.lessons.filter((l) => l.status === "confirmed").length,
    candidate: store.lessons.filter((l) => l.status === "candidate").length,
    quarantined: store.lessons.filter((l) => l.status === "quarantined").length,
  };
}

/**
 * Renders `.fireskills/LESSONS.md` from canonical state.
 */
async function renderPlaybook(
  projectRoot: string,
  store: LessonsStore,
): Promise<void> {
  const confirmed = store.lessons.filter((l) => l.status === "confirmed");
  const candidates = store.lessons.filter((l) => l.status === "candidate");
  const quarantined = store.lessons.filter((l) => l.status === "quarantined");

  const lines: string[] = [
    "# Playbook: Lessons Learned",
    "",
    "> Self-evolving playbook managed by Fireskills. Grounded in actual bugs and gate failures.",
    "> Generated automatically from `.fireskills/lessons.json` — do not edit manually.",
    "",
    "## 🛡️ Confirmed Preventive Rules (Active Playbook)",
    "",
  ];

  if (confirmed.length === 0) {
    lines.push("_No confirmed lessons yet._");
    lines.push("");
  } else {
    for (const l of confirmed) {
      lines.push(`### L-${String(l.id).padStart(3, "0")}: ${l.summary}`);
      lines.push(`- **Rule:** ${l.rule}`);
      lines.push(`- **Signal:** \`${l.signal}\` (${SIGNALS[l.signal] || l.signal})`);
      lines.push(`- **Occurrences:** ${l.occurrences} (Sources: ${l.sources.join(", ")})`);
      lines.push(`- **Confirmed on:** ${l.updated_at.split("T")[0]}`);
      lines.push("");
    }
  }

  lines.push("## 🧪 Candidate Lessons (Under Observation)");
  lines.push("");

  if (candidates.length === 0) {
    lines.push("_No candidate lessons in the observation window._");
    lines.push("");
  } else {
    for (const l of candidates) {
      lines.push(
        `- **L-${String(l.id).padStart(3, "0")}** [${l.signal}]: ${l.summary} → Rule: "${l.rule}" (${l.occurrences}/${store.promote_threshold} occurrences to confirm)`,
      );
    }
    lines.push("");
  }

  if (quarantined.length > 0) {
    lines.push("## ⚠️ Quarantined Lessons (Penalized)");
    lines.push("");
    for (const l of quarantined) {
      lines.push(
        `- **L-${String(l.id).padStart(3, "0")}**: ${l.summary} (Penalties: ${l.penalties})`,
      );
    }
    lines.push("");
  }

  await fs.writeFile(getRenderPath(projectRoot), lines.join("\n"), "utf-8");
}
