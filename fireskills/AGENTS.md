# Fireskills — Governance para Agentes LLM

Este arquivo governa o comportamento de agentes LLM ao trabalhar com o fireskills dentro do projeto Nuxfire.

## Identidade do Projeto

- **Nome**: Nuxfire
- **Domínio**: nuxfire.com
- **Namespace de pacotes**: `@nuxfire/*`
- **Repositório**: c:\\nuxfire\\

## Princípios Fundamentais

1. **Zero suposição**: Consulte o código antes de afirmar qualquer coisa sobre o projeto
2. **Stack fixa**: A stack está 100% definida — não sugira alternativas
3. **Metodologia obrigatória**: Todo trabalho passa pelo fluxo fireskills
4. **Evidência real**: Testes passam, build compila, deploy funciona

## Stack — Fatos Verificados (não alterar sem re-verificar)

### O que existe e deve ser usado
- Nuxt 4 + @nuxt/ui v4 (Reka UI + Tailwind CSS)
- tRPC v10 via trpc-nuxt
- Drizzle ORM + PostgreSQL via Cloudflare Hyperdrive
- OpenAuth.js (PasswordProvider + CodeProvider)
- nuxt-authorization (Bouncer-style `defineAbility`)
- Pinia + @pinia/nuxt
- SST 4.14.0 → Cloudflare Workers (deploy único)
- NuxtHub: hubBlob() → R2, hubKV() → KV, hubCache() → Cache
- Cloudflare Durable Objects (WebSockets)
- Cloudflare Queues + DLQ (Jobs)
- Cloudflare Cron Triggers
- Resend (email)
- Stripe + Paddle (pagamentos)
- Vitest (testes)
- Bun workspaces (package manager)

### O que NÃO existe (jamais sugerir ou criar)
- shadcn/ui — ZERO
- React (exceto packages/emails que usa React Email)
- Next.js, Astro, SvelteKit
- Docker em produção
- Redis (usa Cloudflare KV)
- Supabase (usa Postgres + Hyperdrive direto)
- Prisma (usa Drizzle)
- Lucia / Clerk / NextAuth (usa OpenAuth.js)
- CASL (usa nuxt-authorization)
- npm / pnpm / yarn (usa Bun)
- Servidor Linux gerenciado

## Regras Críticas Técnicas

As regras completas estão em `_docs/docs/AGENTS.md` (histórico) e em `.specsfy/RULES.md` (vigentes, na raiz do repositório). Este arquivo as sumariza:

1. `useDB()` cria um cliente postgres.js **por request** — nunca cacheie globalmente
2. `closeDB()` deve ser chamado em `afterResponse` e `error` via `ExecutionContext.waitUntil()`
3. Sessões de auth estão no Cloudflare KV (`AuthKV`), não no Postgres
4. Pages `/login`, `/signup`, `/forgot-password` usam `ssr: false` — não remover
5. `platformAdminProcedure` exige 3 gates: PlatformAdmin row + MFA enrollado + sessão elevada (30min)
6. Secrets sempre `SCREAMING_SNAKE_CASE`
7. NuxtHub bindings nomeados exatamente `BLOB`/`KV`/`CACHE`
8. Separator do AuthKV é `\x1f` (0x1f), não dois-pontos
9. `Role.teamId = null` = role de sistema (global), não tenant-scoped
10. Durations são strings, nunca números: `"120 seconds"`, não `120`

## Arquitetura de Layers

Layers de domínio em `layers/`: teams, billing, notifications, admin (core), kanban (feature).

- `config.ts` na raiz é a **única fonte de verdade** de quais layers estão ativas
- `scripts/compose-layers.ts` **gera** os arquivos de composição automaticamente — não edite manualmente
- Cada layer exporta `routers` (não `<name>Router`) com `satisfies Record<string, AnyRouter>`
- Ability names são prefixados com o nome do layer: `teamsDeleteTeam`, não `deleteTeam`
- `package.json` `exports["."]` deve apontar para `nuxt.config.ts`, não `layer.manifest.ts`

## Fluxo de Trabalho

Todo trabalho segue a metodologia fireskills. Carregue a skill adequada:

- Novo pedido → `fireskill-01-inbox`
- Spec nova → `fireskill-03-specify`
- Implementar → `fireskill-07-implement`
- Verificar estado → `fireskill-progress`

## Onde está cada coisa

- Instruções de entrada para agentes (lidas em toda conversa): `AGENTS.md` e
  `CLAUDE.md` **na raiz do repositório** (não este arquivo).
- Contexto do projeto (migrado de `_docs/docs`, conferido contra o código):
  `PROJECT.md`, `DESIGNSYSTEM.MD`, `INTERFACE.md` e `.specsfy/{STACK,RULES,DATABASE,PACKAGES}.md`.
  Relatório da migração: `fireskills/MIGRACAO-DOCS.md`.
- Skills de fluxo: `fireskills/skills/` (contrato: `skills/Spec.md`; templates:
  `skills/templates/`; exemplo: `skills/examples/Spec.md`).
- Especialistas: `fireskills/specialists/`.
- Motor do fluxo (estados de spec, esforço, progresso, milestones): CLI
  `fireskill`, `fireskills/cli/`, chamado por `bun run fireskill <comando>`.
- Specs: `specs/<estado>/<NNNN>-<slug>/spec.md`; capturas em `specs/inbox/`.
