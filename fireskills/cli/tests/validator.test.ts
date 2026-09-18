import { promises as fs } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "./helpers.js";
import { validateSpec } from "../src/validator.js";

describe("spec validator", () => {
  it("aprova uma spec válida e bem formatada", async () => {
    const root = await temporaryDirectory();
    const specPath = join(root, "spec.md");

    const validContent = `
# 0001 - Teste Válido

| Campo | Valor |
|---|---|
| Status | Defined |
| State | defined |
| Effort | 4 |
| Effort rationale | Justificativa técnica consistente e válida |
| Created at | 2026-09-18T10:00:00Z |
| Updated at | 2026-09-18T10:00:00Z |

## 1. Contexto e Problema
Descrição do problema real.

## 2. Atores e Requisitos
Requisitos do usuário.

## 3. Cenários BDD
Scenario: Cenário principal
  Given que o usuário está logado
  When acessa a página
  Then os dados são exibidos

## 4. Fases de Tarefas
- [ ] T01: Implementação do serviço

## 5. Testes e Evidências
Testes com Vitest.
`;

    await fs.writeFile(specPath, validContent.trim(), "utf-8");
    const result = await validateSpec(specPath);

    expect(result.valid).toBe(true);
    expect(result.summary.errors).toBe(0);
  });

  it("reprova uma spec sem Effort ou com metadados inválidos", async () => {
    const root = await temporaryDirectory();
    const specPath = join(root, "spec.md");

    const invalidContent = `
# 0001 - Incompleto

| Campo | Valor |
|---|---|
| Status | Draft |

## 1. Contexto
Apenas contexto.
`;

    await fs.writeFile(specPath, invalidContent.trim(), "utf-8");
    const result = await validateSpec(specPath);

    expect(result.valid).toBe(false);
    expect(result.summary.errors).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.message.includes("Effort"))).toBe(true);
  });

  it("emite avisos para placeholders de rascunho", async () => {
    const root = await temporaryDirectory();
    const specPath = join(root, "spec.md");

    const placeholderContent = `
# 0001 - Com Placeholders

| Campo | Valor |
|---|---|
| Status | Draft |
| Effort | 2 |
| Effort rationale | Justificativa |

## 1. Contexto e Problema
[TODO] Preencher depois

## 2. Atores e Requisitos
Requisitos

## 3. Cenários BDD
Scenario: Teste
  Given x
  When y
  Then z

## 4. Fases de Tarefas
- [ ] T01: Algo

## 5. Testes e Evidências
Evidência
`;

    await fs.writeFile(specPath, placeholderContent.trim(), "utf-8");
    const result = await validateSpec(specPath);

    expect(result.summary.warnings).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.message.includes("Placeholder"))).toBe(true);

    // Em modo strict, avisos invalidam a spec
    const strictResult = await validateSpec(specPath, { strict: true });
    expect(strictResult.valid).toBe(false);
  });

  it("aceita o template oficial de spec sem erros de estrutura", async () => {
    const template = join(import.meta.dirname, "..", "..", "skills", "templates", "Spec.md");
    const result = await validateSpec(template, { strict: true });

    expect(result.issues.filter((i) => i.level === "error")).toEqual([]);
  });
});
