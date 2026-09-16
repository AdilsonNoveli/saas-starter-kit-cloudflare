# Estrutura Real da Aplicação Nuxfire

> Atualizado em 2026-09-16 a partir do estado real do repositório (ver `_docs/AGENTS.md` — se algo aqui divergir do código, o código vence). Reflete a estrutura pós-migração para Nuxt Layers (`_docs/REFATORE_ARCHITETURE.md`, Fase 3 concluída): `packages/app` virou `apps/app`, `packages/auth-frontend` virou `apps/login`, `packages/design-tokens` virou `packages/tokens`, e todo domínio de negócio (teams, billing, notifications, admin, kanban) saiu para `layers/`.

## 📁 Estrutura de Diretórios (Estado Atual)

```
nuxfire/
│
├── .agents/                         # Skills e referências do Kiro AI
│   └── skills/
│       └── nuxt-ui/                 # Documentação Nuxt UI
│
├── .claude/                         # Configuração Claude Code
│   └── launch.json
│
├── .sst/                            # Cache e artefatos SST (gerado, não versionado)
│
├── _docs/                           # Documentação interna (planos, auditorias, este arquivo)
│   ├── AGENTS.md                    # Guia para LLMs/Agents — fonte de verdade viva
│   ├── ESTRUTURA_ATUAL.md           # Este arquivo
│   ├── REFATORE_ARCHITETURE.md      # Plano da migração para Nuxt Layers (histórico + decisões)
│   ├── DESIGN_SYSTEM.md             # Doc do design system
│   ├── BACKLOG.md / ROADMAP.md / CURRENT_STATE.md / CLEANUP_DEBT_PLAN.md / MAILER_FORK_PLAN.md
│   ├── template-kanban/             # Referência externa (template de terceiros)
│   └── emails/                      # Referências de templates
│
├── infra/                           # Infraestrutura como código (SST) — cada arquivo exporta `outputs`,
│   │                                   auto-importado por sst.config.ts, sem stack central
│   ├── app.ts                       # Worker do dashboard (apps/app)
│   ├── auth.ts                      # Worker de autenticação + AuthKV (serve apps/login como assets estáticos)
│   ├── cron.ts                      # Cron Worker
│   ├── database.ts                  # Hyperdrive (Postgres)
│   ├── dns.ts                       # Domínios e DNS por stage
│   ├── emails.ts                    # Email Worker
│   ├── jobs.ts                      # Queues (JobQueue + JobDLQ)
│   ├── secret.ts                    # sst.Secret — todas as credenciais/keys
│   ├── web.ts                       # Worker do site público (apps/web)
│   ├── websockets.ts                # Durable Object (Websockets)
│   └── utils/
│       ├── builder.ts               # command.local.Command que builda cada Nuxt app
│       ├── constants.ts
│       ├── durable-objects.ts       # Checa via API se a classe DO já existe antes de migrar
│       ├── nuxt.ts                  # Builda Nuxt + roda `drizzle-kit migrate` e o seed após cada deploy
│       └── semaphore.ts
│
├── apps/                            # Deployáveis independentes (Application Packages — critério real
│   │                                   do Turborepo, não "tem UI"; ver nota em REFATORE_ARCHITETURE.md)
│   ├── app/                         # 🎯 Composition Root (Nuxt SSR) — shell fino: dashboard layout,
│   │   ├── app/                     #    account-settings, tRPC context/composition. SEM lógica de
│   │   │   ├── components/          #    domínio — isso vive em layers/.
│   │   │   ├── composables/
│   │   │   ├── layouts/
│   │   │   ├── middleware/          # 0.auth.global.ts, 1.teams.global.ts (ordem entre layers importa)
│   │   │   ├── pages/               # [[team]]/, account-settings/ — resto vem de layers/
│   │   │   ├── plugins/
│   │   │   └── utils/
│   │   ├── server/
│   │   │   ├── api/
│   │   │   ├── trpc/                # context.ts, trpc.ts, routers/ (+ routers/.composition/ gerado)
│   │   │   └── utils/                # db.ts, auth.ts, audit-log.ts, mfa-crypto.ts, rate-limit.ts, ws-ticket.ts
│   │   ├── nuxt.config.ts
│   │   └── package.json             # @nuxfire/app
│   │
│   ├── web/                         # 🌐 Site público (Nuxt SSR + Content v3) — landing, blog, docs
│   │   ├── app/
│   │   │   ├── components/          # background/, content/ (Prose), docs/, folder-tree/, landing/, pricing/, search/...
│   │   │   ├── layouts/
│   │   │   └── pages/                # blog/, docs/, index.vue, contact.vue, license.vue...
│   │   ├── constants/
│   │   │   ├── hints.json           # Editorial, mantido à mão
│   │   │   └── paths.json           # GERADO por scripts/generate-paths.ts (git ls-files, a cada build)
│   │   ├── content/                 # docs/ (0.index.md hub + 1.saas-starter-kit/...), blog/, faqs/, legal solto
│   │   ├── content.config.ts
│   │   └── package.json             # @nuxfire/web
│   │
│   ├── login/                       # 🔐 UI de autenticação (Nuxt, `nuxt generate` estático,
│   │   ├── app/                     #    servido como assets do Worker `auth`, renomeado de
│   │   │   ├── components/          #    auth-frontend em 2026-09-14)
│   │   │   ├── composables/
│   │   │   ├── css/
│   │   │   └── pages/                # login.vue, signup.vue, forgot-password.vue ({ ssr: false })
│   │   └── package.json             # @nuxfire/login
│   │
│   └── functions/                   # ⚡ Cloudflare Workers que não são o app principal
│       ├── src/
│       │   ├── auth.ts              # OpenAuth.js issuer Worker
│       │   ├── cron.ts              # Cron handler
│       │   ├── emails.ts / sender.ts / emails-types.ts / subjects.ts
│       │   ├── jobs-consumer.ts     # Queue consumer
│       │   ├── dlq-consumer.ts      # Dead-letter queue consumer
│       │   ├── rate-limit.ts        # Fixed-window limiter (raw KVNamespace)
│       │   ├── websockets.js        # Durable Object "Websockets" (.js proposital)
│       │   └── database/
│       │       ├── schema.ts        # Barrel agregador — reexporta core-schema + uma linha por layer
│       │       ├── core-schema.ts   # Tabelas sem domínio: User, WaitlistEmail, Job, Log, DeadLetterRecord
│       │       ├── migrations/      # Fonte única de verdade: 0000_init.sql + meta/ (ver seção Database)
│       │       ├── seed-data.ts     # Dados determinísticos (Free plan, system roles)
│       │       ├── seed.ts          # Roda a cada deploy (idempotente)
│       │       ├── grant-platform-admin.ts   # Manual — concede platform admin a um user existente
│       │       └── seed-demo-accounts.ts     # Manual — apenas dev/demo local
│       ├── drizzle.config.ts
│       └── package.json             # @nuxfire/functions
│
├── layers/                          # Nuxt 4 Layers plugáveis por domínio de negócio — registradas em
│   │                                   `layers.core`/`layers.features` (config.ts); geradas em
│   │                                   apps/app/server/trpc/routers/.composition/ e
│   │                                   apps/app/app/composables/.composition/ por scripts/compose-layers.ts
│   ├── teams/                       # [core] Multi-tenancy, RBAC, membros, convites
│   ├── billing/                     # [core] Planos, benefícios, assinaturas (Stripe/Paddle)
│   ├── notifications/               # [core] Notificações in-app + WebSocket
│   ├── admin/                       # [core] Console /admin — PlatformAdmin, AuditLog, MFA elevada
│   ├── kanban/                      # [feature, opcional] Quadros Kanban de exemplo
│   │
│   │                                 # cada layer segue o mesmo contrato:
│   ├── <layer>/app/                 #   frontend: components/, composables/, pages/, (middleware/)
│   ├── <layer>/server/
│   │   ├── trpc/router.ts           #   exporta `routers`: { topLevelKey: router }
│   │   └── database/schema.ts       #   tabelas Drizzle desta layer (import por PACKAGE SPECIFIER, nunca relativo)
│   ├── <layer>/shared/utils/
│   │   ├── abilities.ts             #   defineAbility(), nomes prefixados pela layer (teamsX, kanbanX...)
│   │   └── permissions.ts
│   ├── <layer>/layer.manifest.ts    #   usa defineLayerManifest() de @nuxfire/manifest
│   ├── <layer>/nuxt.config.ts       #   exports["."] aponta para cá, NUNCA para o manifest
│   └── <layer>/package.json         #   @nuxfire/layer-<nome>, workspace:*
│
├── packages/                        # Bibliotecas compartilhadas, sem deploy próprio
│   ├── emails/                      # 📧 @nuxfire/emails — templates/ (React Email) + mailer/
│   │   └── mailer/                  #    fork vendorizado do @adonisjs/mail (substituiu @tanayvk/mailer)
│   ├── tokens/                      # 🎨 @nuxfire/tokens — cores, radius, dark-mode, overrides Nuxt UI
│   │   ├── index.ts
│   │   └── theme.css
│   └── manifest/                    # 📐 @nuxfire/manifest — contrato defineLayerManifest()
│       └── index.ts
│
├── patches/                         # Node module patches (bun patchedDependencies, versão exata)
│   ├── @openauthjs%2Fopenauth@0.3.9.patch
│   └── nodemailer@9.1.1.patch
│
├── scripts/                         # Scripts utilitários (rodados via bun, alguns chamados por nuxt.config.ts)
│   ├── compose-layers.ts            # Gera os dois arquivos de composição a cada dev/build/typecheck/prepare
│   ├── generate-paths.ts            # Gera apps/web/constants/paths.json a partir de `git ls-files`
│   ├── check-i18n-completeness.ts
│   ├── clean-nuxt-build-cache.ts
│   └── dev.ts
│
├── .env.example                     # Template de variáveis (SCREAMING_SNAKE_CASE)
├── .env.production                  # Prod env (não commitado)
├── .env.stage                       # Stage/dev env (não commitado)
├── .gitignore
├── bun.lock                         # Lockfile Bun
├── bunfig.toml                      # linker = "hoisted" (obrigatório no Windows)
├── config.ts                        # layers.core / layers.features, domínios, feature flags
├── package.json                     # Root workspaces: apps/*, packages/*, layers/*
├── README.md
├── skills-lock.json                 # Kiro skills lock
├── sst-env.d.ts                     # Types SST
├── sst.config.ts                    # Auto-importa infra/*.ts e mescla `outputs`
├── tsconfig.json                    # TypeScript config global
└── vitest.config.mts                # Aggregator: test.projects = [apps/app, layers/*]
```

## 🎯 Packages e suas Responsabilidades

### Apps (deployáveis independentemente)

| Package | Tipo | Output | Domínio | Descrição |
|---------|------|--------|---------|-----------|
| `apps/app` | Nuxt SSR | Worker | `app.{domain}` | Composition Root: shell do dashboard, tRPC context/composition. Toda lógica de domínio está em `layers/`. |
| `apps/web` | Nuxt SSR | Worker | `{domain}` | Landing, blog, docs (Nuxt Content v3) |
| `apps/login` | Nuxt estático | Worker (assets do Auth) | `auth.{domain}` | Login, signup, forgot-password UI |
| `apps/functions` | Cloudflare Workers | 6 Workers independentes | `auth.{domain}` + internos | Auth issuer, emails, websockets, jobs/DLQ consumers, cron, database (schema/migrations/seeds) |

### Layers (domínios de negócio plugáveis)

| Layer | Tipo | Pacote | Descrição |
|-------|------|--------|-----------|
| `layers/teams` | core | `@nuxfire/layer-teams` | Multi-tenancy, RBAC, membros, convites — dependência transversal das demais |
| `layers/billing` | core | `@nuxfire/layer-billing` | Plan, Benefit, BenefitsOnPlan, Subscription — Stripe/Paddle |
| `layers/notifications` | core | `@nuxfire/layer-notifications` | Notification + WebSocket push |
| `layers/admin` | core | `@nuxfire/layer-admin` | Console `/admin` — PlatformAdmin, AuditLog, MFA elevada (autoridade separada da RBAC de tenant) |
| `layers/kanban` | feature (opcional) | `@nuxfire/layer-kanban` | KanbanBoard/Card/Column — exemplo de feature layer toggleável |

### Packages compartilhados (sem deploy próprio)

| Package | Tipo | Descrição |
|---------|------|-----------|
| `packages/emails` | Library | Templates React Email + `mailer/` (fork vendorizado do @adonisjs/mail) |
| `packages/tokens` | Library | `@nuxfire/tokens` — fonte única de theming (cores, radius, dark-mode, overrides Nuxt UI) |
| `packages/manifest` | Library | `@nuxfire/manifest` — contrato `defineLayerManifest()` usado por toda layer |

### Workers (dentro de `apps/functions/src/`)

| Worker | Arquivo | Tipo | Descrição |
|--------|---------|------|-----------|
| Auth | `auth.ts` | Worker | OpenAuth.js issuer (password, code) — serve `apps/login` como assets estáticos |
| Emails | `emails.ts` | Worker | Envia emails via o mailer forkado (`packages/emails/mailer`) |
| Websockets | `websockets.js` | Durable Object | Real-time via WebSocket, topic = `user.id` |
| Jobs Consumer | `jobs-consumer.ts` | Queue Consumer | Processa jobs assíncronos |
| DLQ Consumer | `dlq-consumer.ts` | Queue Consumer | Dead letter queue |
| Cron | `cron.ts` | Cron Worker | Tarefas agendadas |

## 🗄️ Database

**Schema:** `apps/functions/src/database/schema.ts` é um **barrel agregador**, não a fonte — reexporta `./core-schema` mais uma linha por layer (`@nuxfire/layer-{kanban,teams,billing,notifications,admin}/server/database/schema`, sempre por **package specifier**, nunca caminho relativo — ver `_docs/AGENTS.md` para o incidente de deploy real que isso evita).

**Tabelas (20, todas em `public`):**
`User`, `Team`, `TeamMembership`, `TeamInvite`, `Role`, `Permission`, `Plan`, `Benefit`, `BenefitsOnPlan`, `Subscription`, `Job`, `Log`, `Notification`, `PlatformAdmin`, `AuditLog`, `DeadLetterRecord`, `WaitlistEmail`, `KanbanBoard`, `KanbanCard`, `KanbanColumn` — mais o enum `platform_role` e a extensão `postgis`. Não existe tabela `sessions` — sessões de auth ficam no Cloudflare KV (`AuthKV`), nunca no Postgres.

**Migrations:** `apps/functions/src/database/migrations/` — consolidadas em **fonte única de verdade** em 2026-09-16:
- `0000_init.sql` — cria o schema completo (20 tabelas, 14 FKs, o enum `platform_role` e `CREATE EXTENSION IF NOT EXISTS postgis`) a partir de um banco vazio. Gerado com `drizzle-kit generate` a partir do `schema.ts` atual (não escrito à mão), depois de confirmar que não havia nenhuma divergência entre o schema e o histórico das 10 migrations antigas (`0000_ordinary_wildside` … `0009_lively_mother_askani`, removidas).
- `meta/_journal.json` — um único entry, tag `0000_init`.
- Aplicadas automaticamente a cada deploy via `infra/utils/nuxt.ts` (`bunx drizzle-kit migrate`), nunca à mão. Sem down-migrations — rollback é expand/contract (ver `apps/functions/src/database/MIGRATIONS.md`).
- **Importante para quem já tinha um banco com o histórico antigo aplicado:** como o `0000_init.sql` consolidado tem um hash diferente de qualquer uma das 10 migrations antigas, o `drizzle-kit migrate` não vai reconhecer as tabelas existentes como já migradas. Um banco com o histórico antigo precisa ser resetado (schema `public` e `drizzle` derrubados e recriados) antes do próximo deploy aplicar a migration única — feito e verificado ponta-a-ponta no stage local (`desktop-h6uunuvadilson`) nesta consolidação. `production` ainda não tem `DATABASE_HOST` configurado, então não é afetado.

**Seeds:**
- `seed.ts` — Seed principal (Free plan + system roles), roda a cada deploy, idempotente
- `seed-demo-accounts.ts` — Contas demo (manual, apenas dev/demo local)
- `grant-platform-admin.ts` — Concede platform admin a um user existente (manual)

## 🚀 Infrastructure (SST)

**Localização:** `infra/`

**Recursos Cloudflare:**

| Recurso | Arquivo | Tipo | Descrição |
|---------|---------|------|-----------|
| AppDB | `database.ts` | Hyperdrive | Connection pooling PostgreSQL |
| Auth | `auth.ts` | Worker + KV | OpenAuth issuer + credentials (serve `apps/login`) |
| AuthKV | `auth.ts` | KV | Sessions e credentials |
| App | `app.ts` | Worker | `apps/app` (Nuxt Nitro) |
| Web | `web.ts` | Worker | `apps/web` (Nuxt Nitro) |
| Emails | `emails.ts` | Worker | Email sender |
| Websockets | `websockets.ts` | Worker + DO | Real-time |
| JobQueue | `jobs.ts` | Queue | Jobs assíncronos |
| JobDLQ | `jobs.ts` | Queue | Dead letter queue |
| Cron | `cron.ts` | Cron | Tarefas agendadas |

**Secrets:** Gerenciados via `infra/secret.ts` (SST Secrets), carregados por stage (`.env.stage` / `.env.production`, nunca um `.env` único).

**DNS:** Configurado em `infra/dns.ts` — `app.{domain}`, `auth.{domain}`, `websockets.{domain}`, `{domain}` (site público).

## 📦 Workspace (Bun)

**Root:** `package.json`
```json
{
  "workspaces": ["apps/*", "packages/*", "layers/*"]
}
```

**Packages (`@nuxfire/*`):**
- `@nuxfire/app`, `@nuxfire/web`, `@nuxfire/login`, `@nuxfire/functions` (apps)
- `@nuxfire/layer-teams`, `@nuxfire/layer-billing`, `@nuxfire/layer-notifications`, `@nuxfire/layer-admin`, `@nuxfire/layer-kanban` (layers)
- `@nuxfire/emails`, `@nuxfire/tokens`, `@nuxfire/manifest` (packages)

## 🔧 Configuração

### Arquivo: `config.ts`
- `layers.core` / `layers.features` — única fonte de verdade de quais layers estão ativas (`activeLayerNames`)
- Domínios (prod/dev), email config, feature flags (stripe, paddle, oauth, websockets, jobs)

### Arquivos: `.env.*`
- `.env.example` — Template canônico (todas as chaves, em branco)
- `.env.stage` — Dev/stage (não commitado)
- `.env.production` — Produção (não commitado; hoje sem `DATABASE_HOST` configurado)

### Secrets (via SST, `SCREAMING_SNAKE_CASE`):
- Database (host, port, name, user, password)
- OAuth (GitHub, Google)
- Payments (Stripe, Paddle)
- Email (Resend, Mailgun)
- Platform admin (`PLATFORM_MFA_SESSION_SECRET`, `PLATFORM_ADMIN_ENCRYPTION_KEY`)
- User MFA (session, encryption)

## 🛠️ Ferramentas e Build

- **Runtime:** Bun (linker `hoisted`, obrigatório no Windows)
- **Framework:** Nuxt 4, com Nuxt Layers para domínios plugáveis
- **IaC:** SST v4 (sem CI/CD — deploy é `bun run deploy` manual)
- **ORM:** Drizzle (`drizzle-orm/postgres-js`, dialect `postgresql`)
- **Auth:** OpenAuth.js (`PasswordProvider` + `CodeProvider`)
- **Authorization:** `nuxt-authorization` (Bouncer-style `defineAbility`)
- **UI:** Nuxt UI (Tailwind CSS)
- **Content:** Nuxt Content v3
- **Validation:** Valibot
- **Email:** React Email + mailer forkado (`packages/emails/mailer`)
- **Payments:** Stripe + Paddle
- **Testes:** Vitest — `layers/{billing,teams,kanban}` têm suites; `apps/app` ainda não tem nenhuma

## 📝 Documentação

- `README.md` — Overview geral
- `_docs/AGENTS.md` — Guia para LLMs/Agents (fonte de verdade viva — o código vence em caso de conflito)
- `_docs/DESIGN_SYSTEM.md` — Design system
- `_docs/REFATORE_ARCHITETURE.md` — Plano e decisões da migração para Nuxt Layers (histórico)
- `apps/functions/src/database/MIGRATIONS.md` — Guia de migrations (geração, rollback)
- `apps/web/content/docs/` — Documentação completa do produto (site público, já reflete `apps/`/`layers/`/`packages/`)
