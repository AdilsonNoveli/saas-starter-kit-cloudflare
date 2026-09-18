---
name: fireskills
description: Metodologia orientada a especificações do Nuxfire (Nuxt 4 + @nuxt/ui + tRPC + Drizzle + Cloudflare Workers + SST). Use ao receber qualquer pedido de trabalho neste repositório — captura, refinamento, spec, validação, tarefas, TDD/BDD, implementação, documentação — para escolher a skill de fluxo e os especialistas técnicos certos.
---

# Fireskills

Ponto de entrada do sistema. Ele não executa etapas: encaminha para a skill
certa e para os especialistas que dão conhecimento técnico do Nuxfire.
Contrato normativo: [`skills/Spec.md`](skills/Spec.md). Governança de agentes:
[`AGENTS.md`](AGENTS.md). Visão geral: [`README.md`](README.md).

## Fluxo

`inbox → backlog → spec → validate → tasks → TDD/BDD → implement → documentator → progress`,
em três atos (Definir, Projetar/Provar, Entregar) com três gates (Definition,
Plan, Delivery).

| Situação | Skill |
|---|---|
| Pedido novo, ideia solta | `fireskill-01-inbox` |
| Refinar item e decisões | `fireskill-02-backlog` |
| Escrever a spec normativa | `fireskill-03-specify` |
| Provar a definição | `fireskill-04-validate` |
| Quebrar em tarefas | `fireskill-05-tasks` |
| Testes TDD a partir do BDD | `fireskill-06-tdd-bdd` |
| Implementar (RED → GREEN → REFACTOR) | `fireskill-07-implement` |
| Preparar contexto do projeto | `fireskill-setup` |
| Mudança tardia na spec | `fireskill-update-spec` |
| Reconstruir `docs/` | `fireskill-documentator` |
| Ver o estado | `fireskill-progress` |
| Conversar com a spec | `fireskill-interviewer` |
| Definir o MVP / evolução | `fireskill-mvp-milestone-interviewer`, `fireskill-roadmap-milestone-interviewer`, `fireskill-milestone-governor` |
| Descobrir dados do produto | `fireskill-data-discovery` |
| Registrar / consultar lições aprendidas | `fireskill-lessons` |
| Deliberação colegiada / decisão de alto impacto | `fireskill-the-jury` |
| Ataque adversarial e detecção de premissas frágeis | `fireskill-the-fool` |
| Revisão técnica de PR / diff com evidências | `fireskill-the-judge` |
| Manter STACK/RULES/DATABASE | `fireskill-aux-stack`, `fireskill-aux-rules`, `fireskill-aux-database` |
| Mudar estado, esforço, validar spec, lições ou milestones | `bun run fireskill <comando>` (ver `README.md`) |

## Especialistas do Nuxfire

Carregue **antes** de escrever código na área:

| Ao tocar | Carregue |
|---|---|
| `.vue`, componentes `U*`, tema, formulários, tabelas | `fireskill-specialist-nuxt-ui` |
| páginas, layouts, middleware, plugins, Nitro, `runtimeConfig` | `fireskill-specialist-nuxt` |
| `layers/`, `config.ts`, `layer.manifest.ts` | `fireskill-specialist-nuxfire-layers` |
| routers e procedures, `useTrpcClient()` | `fireskill-specialist-trpc` |
| schema, migrações, seed, queries | `fireskill-specialist-drizzle` (+ `-postgres`) |
| permissões, `defineAbility`, `<Can>` | `fireskill-specialist-nuxt-authorization` |
| login, sessão, cookies, `apps/functions/src/auth.ts` | `fireskill-specialist-openauth` |
| stores | `fireskill-specialist-pinia` |
| Workers, bindings, filas, cron, Durable Objects | `fireskill-specialist-cloudflare-workers` |
| `infra/`, secrets, stages, deploy | `fireskill-specialist-sst` |

Os demais especialistas (segurança, acessibilidade, performance, observabilidade,
arquitetura, UX/UI, TypeScript, Postgres, Tailwind, revisão, depuração…) estão em
[`specialists/`](specialists/); `specialists/catalog.json` os descreve.

## Regras

1. **O código vence a documentação.** Leia o arquivo antes de afirmar.
2. Os especialistas dizem "o que existe de fato" e "o que NÃO existe" (ver o
   `references/nuxfire-*.md` de cada um); não assuma o que está na segunda lista.
3. `tsc`, `vitest` e `nuxt build` verdes **não** provam que `sst deploy` funciona;
   para o que toca `apps/functions`/`layers`, o deploy é o gate real.
4. Especialista orienta padrões e validação; não cria specs, não avança gates.
5. Ação irreversível ou externa (deploy, apagar dados, publicar) exige
   autorização explícita.

## Fontes de verdade (em conflito, vence a de cima)

1. O código e os testes.
2. `.specsfy/*` (`PROJECT`, `STACK`, `RULES`, `DATABASE`, `INTERFACE`, `DESIGNSYSTEM`):
   contexto migrado de `_docs/docs` e conferido contra o código
   (`fireskills/MIGRACAO-DOCS.md`).
3. Os `references/nuxfire-*.md` dos especialistas.
4. `_docs/docs/*`: histórico; pode estar desatualizado (nomes antigos de pacote).

## Comandos

| Para | Comando (raiz do repositório) |
|---|---|
| Testes | `bun run test` |
| Typecheck | `bun run typecheck` em `apps/app` **e** `bunx vue-tsc --noEmit -p server/tsconfig.json` |
| i18n | `bun run check:i18n` |
| Specs: progresso, estado, esforço, milestones | `bun run fireskill progress`, `transition <id> <estado>`, `effort <id> <1-10> --reason "…"`, `milestones sync` |
| Validação determinística de spec | `bun run fireskill validate <id> [--strict]` |
| Lições aprendidas | `bun run fireskill lesson add/list/status/prune` |
| Monitor de contexto | `node fireskills/skills/fireskill-setup/scripts/monitor_context.mjs --project . --check` |
| Proteção do banco | `node fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs --project . --command "<comando>"` |
| Deploy (**só com autorização**) | `bun run deploy -- --stage <stage>` |

## Manter o Fireskills vivo

- Terminou uma entrega: `fireskill-documentator` e o monitor sem `PENDING`.
- Mudou regra, tela ou tabela: atualize `.specsfy/RULES.md`, `INTERFACE.md` ou
  `DATABASE.md` (as skills `fireskill-aux-*` fazem isso sem apagar texto humano).
- Especialista errado ou incompleto: corrija o `references/nuxfire-*.md` dele com a
  evidência, no mesmo passo.
- Pendências do próprio Fireskills: `fireskills/PLANO-REFATORACAO.md`.
