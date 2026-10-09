import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "./helpers.js";
import {
  addLesson,
  getLessonsStatus,
  loadLessons,
  penalizeLesson,
  pruneLessons,
} from "../src/lessons.js";

describe("lessons engine", () => {
  it("inicia com estado vazio e adiciona candidato", async () => {
    const root = await temporaryDirectory();
    const store = await loadLessons(root);
    expect(store.lessons).toHaveLength(0);

    const { lesson, promoted } = await addLesson(root, {
      summary: "Evitar import circular entre layers",
      rule: "Usar especificador de pacote em apps/functions/src/database/schema.ts",
      signal: "gate_fail",
      source: "0001-test",
    });

    expect(lesson.id).toBe(1);
    expect(lesson.status).toBe("candidate");
    expect(lesson.occurrences).toBe(1);
    expect(promoted).toBe(false);

    const status = await getLessonsStatus(root);
    expect(status.candidate).toBe(1);
    expect(status.confirmed).toBe(0);
  });

  it("promove candidato para confirmado ao atingir reincidência", async () => {
    const root = await temporaryDirectory();

    await addLesson(root, {
      summary: "Evitar import circular",
      rule: "Usar especificador de pacote",
      signal: "gate_fail",
      source: "spec-A",
    });

    const second = await addLesson(root, {
      summary: "Evitar import circular",
      rule: "Usar especificador de pacote",
      signal: "gate_fail",
      source: "spec-B",
    });

    expect(second.lesson.occurrences).toBe(2);
    expect(second.lesson.status).toBe("confirmed");
    expect(second.promoted).toBe(true);

    const status = await getLessonsStatus(root);
    expect(status.confirmed).toBe(1);
    expect(status.candidate).toBe(0);
  });

  it("penaliza lição e coloca em quarentena ao atingir limite", async () => {
    const root = await temporaryDirectory();

    const { lesson } = await addLesson(root, {
      summary: "Regra instável",
      rule: "Não fazer nada",
      signal: "spec_deviation",
      source: "spec-1",
    });

    await penalizeLesson(root, lesson.id, "falhou na prática");
    let updated = (await loadLessons(root)).lessons[0];
    expect(updated.penalties).toBe(1);
    expect(updated.status).toBe("candidate");

    await penalizeLesson(root, lesson.id, "segunda falha");
    updated = (await loadLessons(root)).lessons[0];
    expect(updated.penalties).toBe(2);
    expect(updated.status).toBe("quarantined");

    const status = await getLessonsStatus(root);
    expect(status.quarantined).toBe(1);
  });

  it("limpa candidatos não confirmados expirados", async () => {
    const root = await temporaryDirectory();

    const { lesson } = await addLesson(root, {
      summary: "Candidato antigo",
      rule: "Regra antiga",
      signal: "ac_gap",
      source: "spec-old",
    });

    // Força data antiga
    const store = await loadLessons(root);
    store.lessons[0].updated_at = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    store.window_days = 30;
    const { saveLessons } = await import("../src/lessons.js");
    await saveLessons(root, store);

    const pruned = await pruneLessons(root);
    expect(pruned).toBe(1);

    const afterPrune = await loadLessons(root);
    expect(afterPrune.lessons).toHaveLength(0);
  });
});
