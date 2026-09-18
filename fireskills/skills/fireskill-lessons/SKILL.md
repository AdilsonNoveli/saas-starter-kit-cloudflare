---
name: fireskill-lessons
description: Sistema auto-evolutivo de lições aprendidas do Fireskills. Registra regras preventivas a partir de falhas de teste, regressões, mutantes sobreviventes e desvios de especificação, mantendo o playbook (.specsfy/LESSONS.md) ativo para prevenir a repetição de erros passados.
---

# Fireskill Lessons: Sistema Auto-Evolutivo de Lições

O `fireskill-lessons` é a memória evolutiva do Fireskills. Sempre que um bug for corrigido, um teste falhar inesperadamente ou uma mutação revelar fragilidade na cobertura, esta skill extrai uma **regra preventiva acionável** e a registra no sistema.

---

## Sinais de Origem

Toda lição deve ser fundamentada em um sinal real e comprovado por código:

| Sinal | Descrição |
|---|---|
| `ac_gap` | Critério de aceite da spec não coberto ou que falhou em produção. |
| `surviving_mutant` | O teste passou mesmo após uma mutação lógica no código (teste falso-positivo ou fraco). |
| `spec_precision_gap` | A especificação continha ambiguidade que levou a uma implementação incorreta. |
| `spec_deviation` | A implementação divergiu do plano técnico ou violou convenções do projeto. |
| `gate_fail` | Falha detectada em um dos gates (typecheck `vue-tsc`, linter ou Vitest). |

---

## Ciclo de Vida da Lição

1. **Candidata (`candidate`)**: Registrada pela primeira vez. Fica em observação no playbook.
2. **Confirmada (`confirmed`)**: Promovida automaticamente pelo motor quando reincide em 2 ou mais fatias distintas (`sources`). Torna-se **regra mandatória** consultada antes do planejamento de novas fatias.
3. **Quarentena (`quarantined`)**: Se uma lição causar falso-positivo ou se mostrar inviável na prática, recebe penalidade via `penalize` e é colocada em quarentena.

---

## Comandos Operacionais

```bash
# Registrar uma nova lição fundamentada
bun run fireskill lesson add \
  --signal gate_fail \
  --summary "Import de layer via caminho relativo no schema" \
  --rule "Sempre importar schemas de layers pelo especificador de pacote (@nuxfire/*) no apps/functions" \
  --source "0042-billing"

# Listar lições confirmadas ativas
bun run fireskill lesson list

# Listar todas as lições (incluindo candidatas e quarentena)
bun run fireskill lesson list --all

# Ver sumário quantitativo
bun run fireskill lesson status

# Limpar candidatas antigas não corroboradas
bun run fireskill lesson prune
```

---

## Arquivos Gerados e Mantidos

- **`.specsfy/lessons.json`**: Base canônica serializada em JSON, de propriedade do motor.
- **`.specsfy/LESSONS.md`**: Playbook formatado em Markdown, consumido diretamente por agentes antes de redigir especificações ou tarefas.
