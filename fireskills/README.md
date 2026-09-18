# Fireskills

Sistema de engenharia de software com metodologia orientada a especificações para a stack Nuxfire.

Fireskills é uma metodologia completa que transforma intenções em software entregue — com contexto, contratos, testes e evidência verificável. É a única forma de trabalhar neste projeto.

## Stack do Projeto

Nuxfire é um SaaS starter kit multi-tenant, 100% Cloudflare Workers, com a seguinte stack:

- **Runtime**: Cloudflare Workers via SST 4 — ZERO Docker, ZERO Servidor Linux
- **Frontend**: Nuxt 4 + @nuxt/ui v4 (Reka UI + Tailwind CSS) — ZERO React, ZERO Next.js, ZERO Astro
- **API**: tRPC v10 via trpc-nuxt — ZERO REST puro, ZERO GraphQL
- **Auth**: OpenAuth.js — ZERO Lucia, ZERO Clerk, ZERO NextAuth
- **Database**: PostgreSQL via Cloudflare Hyperdrive + Drizzle ORM — ZERO Prisma, ZERO D1, ZERO SQLite
- **Authorization**: nuxt-authorization (Bouncer-style) — ZERO CASL
- **State**: Pinia — ZERO Vuex, ZERO Zustand
- **Deploy**: SST 4.14.0 → Cloudflare Workers (`bun run deploy`)
- **Pagamentos**: Stripe + Paddle (ambos ativos)
- **Email**: Resend
- **Testes**: Vitest — ZERO Jest, ZERO Playwright (ainda)
- **Package Manager**: Bun workspaces

## Metodologia

O fluxo de trabalho obrigatório é:

```
input → inbox → backlog → spec → validate → tasks → TDD/BDD → implement → documentator → progress
```

Três atos:
- **Ato 1 — Definir**: Inbox → Backlog → Spec → Validate
- **Ato 2 — Projetar/Provar**: Tasks → TDD/BDD
- **Ato 3 — Entregar**: Implement → Documentator → Progress

Tres gates:
- **Definition Gate**: valida a spec antes de planificar
- **Plan Gate**: valida tarefas e testes antes de implementar
- **Delivery Gate**: valida entrega antes de fechar

## Skills Core

| Skill | Propósito |
|---|---|
| `fireskill-01-inbox` | Captura intenções sem perguntas |
| `fireskill-02-backlog` | Refina no backlog |
| `fireskill-03-specify` | Cria a spec normativa |
| `fireskill-04-validate` | Valida o Definition Gate |
| `fireskill-05-tasks` | Decompõe em tarefas |
| `fireskill-06-tdd-bdd` | Cria testes TDD/BDD |
| `fireskill-07-implement` | Implementa (RED→GREEN→REFACTOR) |
| `fireskill-setup` | Prepara contexto do projeto |
| `fireskill-documentator` | Reconstrói documentação |
| `fireskill-update-spec` | Gerencia mudança tardia |
| `fireskill-progress` | Projeta estado global |
| `fireskill-interviewer` | Conversa com a spec |
| `fireskill-mvp-milestone-interviewer` | Define o MVP por estados demonstráveis |
| `fireskill-roadmap-milestone-interviewer` | Planeja a evolução após o MVP aceito |
| `fireskill-milestone-governor` | Mantém relações e a projeção `specs.md` |
| `fireskill-data-discovery` | Descobre dados que o produto precisa guardar |
| `fireskill-aux-stack` | Mantém `.specsfy/STACK.md` |
| `fireskill-aux-rules` | Mantém `.specsfy/RULES.md` |
| `fireskill-aux-database` | Mantém `.specsfy/DATABASE.md` |

## Especialistas Técnicos

Especialistas são skills opcionais que adicionam conhecimento técnico profundo ao agente para uma área específica.

### Stack Nuxfire (obrigatórios para o projeto)

| Especialista | Área |
|---|---|
| `fireskill-specialist-nuxt` | Nuxt 4: pages, layers, middleware, composables, Nitro |
| `fireskill-specialist-nuxt-ui` | @nuxt/ui v4: 125+ componentes, temas, app.config.ts |
| `fireskill-specialist-trpc` | tRPC v10: procedures, routers, composição de layers |
| `fireskill-specialist-drizzle` | Drizzle ORM: schema, relations, migrations, query builder |
| `fireskill-specialist-cloudflare-workers` | Workers, KV, R2, Queues, DOs, Cron, Hyperdrive |
| `fireskill-specialist-sst` | SST 4: infra como código, secrets, linking, deploy |
| `fireskill-specialist-openauth` | OpenAuth.js: providers, KV sessions, callbacks |
| `fireskill-specialist-nuxfire-layers` | Arquitetura de layers Nuxfire (padrão único do projeto) |
| `fireskill-specialist-nuxt-authorization` | RBAC: defineAbility, abilityProcedure, Can |
| `fireskill-specialist-pinia` | Pinia: stores, SSR hydration, composables |

### Engenharia (agnósticos de stack)

| Especialista | Área |
|---|---|
| `fireskill-specialist-typescript` | TypeScript estrito, modelagem de tipos |
| `fireskill-specialist-postgres` | PostgreSQL: modelagem, SQL, índices, migrations |
| `fireskill-specialist-tailwind-css` | Tailwind CSS: tokens, responsividade, variantes |
| `fireskill-specialist-software-architecture` | Arquitetura: boundaries, dependências, ADRs |
| `fireskill-specialist-web-api-design` | APIs: contratos, erros, paginação (relevante para tRPC) |
| `fireskill-specialist-application-security` | Segurança: OWASP, secrets, auth, webhooks |
| `fireskill-specialist-debugging` | Diagnóstico disciplinado de bugs e regressões |
| `fireskill-specialist-code-review` | Revisão técnica por contrato e evidência |
| `fireskill-specialist-performance-engineering` | Performance: Web Vitals, Workers, profiling |
| `fireskill-specialist-observability` | Logs, traces, SLOs (Cloudflare Workers Logs/Traces) |
| `fireskill-specialist-data-modeling` | Modelagem de dados, entidades, relações, Drizzle schema |
| `fireskill-specialist-domain-modeling` | Modelagem de domínio, linguagem compartilhada, invariantes |
| `fireskill-specialist-prototyping` | Protótipos para reduzir incerteza técnica |
| `fireskill-specialist-technical-research` | Pesquisa técnica rastreável em fontes primárias |
| `fireskill-specialist-design-system` | Design system: @nuxt/ui tokens, padrões SaaS |
| `fireskill-specialist-ui-design` | UI SaaS: dashboards, tabelas, formulários (Vue SFC) |
| `fireskill-specialist-ux-design` | UX: fluxos, arquitetura da informação, pesquisa |
| `fireskill-specialist-interface-experience` | Experiência de interface: telas, formulários, tarefas |
| `fireskill-specialist-web-accessibility` | WCAG, semântica, teclado, Reka UI (base do @nuxt/ui) |
| `fireskill-specialist-delivery-engineering` | CI/CD: SST stages, deploy Cloudflare, rollback |
| `fireskill-specialist-versioning` | SEMVER, releases, tags, alinhamento deploy |
| `fireskill-specialist-gitflow` | Branches main/develop/feature/release/hotfix |
| `fireskill-specialist-merge-conflict-resolution` | Resolução de conflitos Git |

## Arquivos de Contexto

O `fireskill-setup` cria e mantém estes arquivos na raiz do projeto:

| Arquivo | Propósito |
|---|---|
| `PROJECT.md` | Visão do produto, objetivos, público-alvo |
| `INTERFACE.md` | Contratos de interface (@nuxt/ui, padrões visuais) |
| `DESIGNSYSTEM.MD` | Tokens, cores, tipografia, componentes |
| `.specsfy/STACK.md` | Stack técnica completa (autenticidade é tudo) |
| `.specsfy/RULES.md` | Regras obrigatórias do projeto |
| `.specsfy/DATABASE.md` | Schema Drizzle, tabelas, relações |
| `.specsfy/PACKAGES.md` | Pacotes instalados por workspace |

> O diretório de contexto chama-se `.specsfy/` porque é o que os scripts das
> skills leem e escrevem hoje. Renomeá-lo para `.fireskills/` exige alterar as
> skills, os scripts e o `Spec.md` de uma vez (pendência de decisão em
> `PLANO-REFATORACAO.md`).
