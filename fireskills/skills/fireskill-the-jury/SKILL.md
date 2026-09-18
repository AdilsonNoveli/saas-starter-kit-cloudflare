---
name: fireskill-the-jury
description: Protocolo deliberativo multi-agente para decisões arquiteturais, técnicas ou estratégicas de alto impacto no Nuxfire. Spawna um painel de 3 a 5 subagentes que formam opiniões cegas independentes (anti-ancoragem), debatem sob papéis ortogonais e emitem um veredito vinculante com rubrica explícita e registro de divergência.
---

# Fireskill The Jury: Deliberação Colegiada

O **The Jury** é o protocolo colegiado do Fireskills para decisões de alto impacto onde uma única perspectiva ou suposição de agente não é suficiente. 

Ele elimina o viés de concordância cega (*sycophancy*) e o viés de ancoragem através de uma **rodada inicial cega e simultânea** entre múltiplos avaliadores.

---

## Quando Utilizar

- Escolha de arquitetura irreversível (ex.: adoção de novo binding Cloudflare, divisão de monorepo).
- Dilemas técnicos complexos (ex.: persistência em KV vs. Hyperdrive/Postgres para determinada carga).
- Redesenho de modelo de dados multi-tenant ou estratégia de autorização RBAC.
- Decisões de produto de alto risco (ex.: modelo de precificação Stripe vs. Paddle).

*Não use para tarefas factuais simples ou correções triviais de sintaxe.*

---

## O Fluxo em 5 Fases

```text
FASE 0: Enquadramento → FASE 1: Montagem → FASE 2: Rodada Cega → FASE 3: Deliberação → FASE 4: Veredito
```

### Fase 0: Enquadramento da Questão
O orquestrador define 3 elementos obrigatórios antes de iniciar:
1. **Pergunta em Forma Decidível**: "Devemos migrar a fila X para Cloudflare Queues ou manter no Drizzle com polling?"
2. **Rubrica de Avaliação (2 a 4 critérios)**: Ex.: Performance sob concorrência, complexidade de manutenção, blast radius e custo.
3. **Evidência Compartilhada**: Arquivos reais de código, schemas ou métricas do projeto.

### Fase 1: Montagem do Painel
O painel é montado com papéis estritamente ortogonais:
- **Proponente**: Defende o caso mais forte a favor da opção principal.
- **Cético / Advogado do Diabo**: Ataca as premissas e defende a alternativa mais robusta ou a manutenção do status quo.
- **Integrador**: Focado na rubrica, custo total de propriedade e impacto a longo prazo.

### Fase 2: Rodada Cega (Blind Round) — Não Negociável
Todos os jurados emitem seus pareceres iniciais de forma **independente e simultânea**. Nenhum jurado tem acesso à resposta dos outros antes de registrar sua convicção inicial. Isso previne que o primeiro agente ancore o restante do grupo.

### Fase 3: Deliberação
Os pareceres são revelados ao grupo. Cada jurado avalia os contra-argumentos e só pode alterar seu voto caso um argumento novo e factual tenha sido apresentado.

### Fase 4: Veredito Vinculante
O júri emite um veredito consolidado:
- **Opção Escolhida** com nível de confiança calibrado.
- **Divergência Preservada (*Dissent*)**: Registro dos pontos de alerta do cético que devem ser monitorados na implementação.
- **Ação Concreta Imediata**: Qual especificação ou tarefa deve ser criada.
