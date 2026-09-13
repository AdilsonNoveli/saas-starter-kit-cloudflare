# Estrutura Real da Aplicação NuxFire

## 📁 Estrutura de Diretórios (Estado Atual)

```
nuxfire/
│
├── .agents/                         # Skills e referencias do Kiro AI
│   └── skills/
│       └── nuxt-ui/                 # Documentação Nuxt UI
│
├── .claude/                         # Configuração Claude
│   └── launch.json
│
├── .sst/                            # Cache e artefatos SST
│   ├── artifacts/                   # Workers compilados
│   │   ├── AppWorker-src/          # Dashboard compilado
│   │   ├── Auth-src/               # Auth worker
│   │   ├── CronHandler-src/        # Cron jobs
│   │   ├── Emails-src/             # Email sender
│   │   ├── JobDLQSubscriberFunction-src/
│   │   ├── JobQueueSubscriberFunction-src/
│   │   ├── Websockets-src/         # WebSocket DO
│   │   └── WebWorker-src/          # Site público compilado
│   ├── log/                        # Logs SST/Pulumi
│   └── platform/                   # SST core
│
├── infra/                          # Infraestrutura como código (SST)
│   ├── app.ts                      # Worker do dashboard
│   ├── auth.ts                     # Worker de autenticação
│   ├── cron.ts                     # Cron jobs
│   ├── database.ts                 # Hyperdrive config
│   ├── dns.ts                      # Domínios e DNS
│   ├── emails.ts                   # Email worker
│   ├── jobs.ts                     # Queues (Jobs + DLQ)
│   ├── secret.ts                   # Secrets management
│   ├── web.ts                      # Site público worker
│   ├── websockets.ts               # Durable Object config
│   └── utils/                      # Utilitários infra
│       ├── builder.ts              # Build helper
│       ├── constants.ts            # Constantes
│       ├── durable-objects.ts      # DO helpers
│       ├── nuxt.ts                 # Deploy Nuxt helper
│       └── semaphore.ts            # Semaphore helper
│
├── packages/                       # Monorepo packages
│   │
│   ├── app/                        # 🎯 Dashboard Principal (Nuxt)
│   │   ├── app/                    # Código fonte Nuxt
│   │   │   ├── app.config.ts
│   │   │   ├── app.vue
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── account/
│   │   │   │   ├── admin/
│   │   │   │   ├── background/
│   │   │   │   ├── layout/
│   │   │   │   ├── loader/
│   │   │   │   ├── members/
│   │   │   │   ├── notifications/
│   │   │   │   ├── pricing/
│   │   │   │   ├── settings/
│   │   │   │   └── team/
│   │   │   ├── composables/
│   │   │   ├── error.vue
│   │   │   ├── layouts/
│   │   │   │   ├── admin.vue
│   │   │   │   ├── dashboard.vue
│   │   │   │   └── page.vue
│   │   │   ├── middleware/
│   │   │   │   ├── 0.auth.global.ts
│   │   │   │   ├── 1.teams.global.ts
│   │   │   │   ├── admin.ts
│   │   │   │   └── invite.ts
│   │   │   ├── pages/
│   │   │   │   ├── [[team]]/
│   │   │   │   │   ├── dashboard.vue
│   │   │   │   │   └── settings/
│   │   │   │   ├── account-settings/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── audit-log.vue
│   │   │   │   │   ├── companies/
│   │   │   │   │   ├── index.vue
│   │   │   │   │   ├── mfa.vue
│   │   │   │   │   ├── plans/
│   │   │   │   │   └── queue/
│   │   │   │   ├── invite/
│   │   │   │   └── select-team.vue
│   │   │   ├── plugins/
│   │   │   ├── utils/
│   │   │   └── public/
│   │   ├── server/                 # Backend Nitro
│   │   │   ├── api/
│   │   │   │   ├── admin/
│   │   │   │   ├── auth/
│   │   │   │   ├── trpc/
│   │   │   │   ├── upload/
│   │   │   │   └── webhooks/
│   │   │   ├── plugins/
│   │   │   ├── trpc/
│   │   │   │   ├── context.ts
│   │   │   │   ├── routers/
│   │   │   │   └── trpc.ts
│   │   │   └── utils/
│   │   ├── shared/                 # Compartilhado app
│   │   │   └── utils/
│   │   │       ├── abilities.ts    # RBAC abilities
│   │   │       └── permissions.ts  # Permission constants
│   │   ├── types/
│   │   ├── nuxt.config.ts
│   │   ├── package.json
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   ├── auth-frontend/              # 🔐 UI de Autenticação (Nuxt Static)
│   │   ├── app/
│   │   │   ├── app.config.ts
│   │   │   ├── app.vue
│   │   │   ├── components/
│   │   │   │   ├── AuthAgreement.vue
│   │   │   │   ├── AuthIcon.vue
│   │   │   │   ├── AuthLayout.vue
│   │   │   │   └── AuthSocialLogin.vue
│   │   │   ├── composables/
│   │   │   ├── css/
│   │   │   ├── pages/
│   │   │   │   ├── forgot-password.vue
│   │   │   │   ├── login.vue
│   │   │   │   └── signup.vue
│   │   │   └── public/
│   │   ├── server/
│   │   ├── nuxt.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── design-tokens/              # 🎨 Design System Tokens
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── theme.css
│   │
│   ├── emails/                     # 📧 Templates de Email (React Email)
│   │   ├── emails/
│   │   │   ├── Invitation.tsx
│   │   │   ├── VerificationCode.tsx
│   │   │   └── Welcome.tsx
│   │   ├── index.ts
│   │   ├── package.json
│   │   ├── props.ts
│   │   └── tsconfig.json
│   │
│   ├── functions/                  # ⚡ Cloudflare Workers & Logic
│   │   ├── src/
│   │   │   ├── auth.ts            # OpenAuth.js worker
│   │   │   ├── cron.ts            # Cron handler
│   │   │   ├── database/          # Database layer
│   │   │   │   ├── grant-platform-admin.ts
│   │   │   │   ├── migrations/
│   │   │   │   ├── schema.ts      # Drizzle schema
│   │   │   │   ├── seed-data.ts
│   │   │   │   ├── seed-demo-accounts.ts
│   │   │   │   └── seed.ts
│   │   │   ├── dlq-consumer.ts    # Dead letter queue
│   │   │   ├── emails-types.ts
│   │   │   ├── emails.ts          # Email sender worker
│   │   │   ├── jobs-consumer.ts   # Jobs queue consumer
│   │   │   ├── rate-limit.ts      # Rate limiting
│   │   │   ├── sender.ts          # Email sender impl
│   │   │   ├── subjects.ts        # Email subjects
│   │   │   └── websockets.js      # Durable Object
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # 🌐 Site Público (Nuxt + Content)
│       ├── app/
│       │   ├── app.config.ts
│       │   ├── app.vue
│       │   ├── assets/
│       │   ├── components/
│       │   │   ├── background/
│       │   │   ├── color-mode/
│       │   │   ├── content/        # Prose components
│       │   │   ├── docs/
│       │   │   ├── folder-tree/
│       │   │   ├── landing/
│       │   │   ├── layout/
│       │   │   ├── loader/
│       │   │   ├── navigation/
│       │   │   ├── pricing/
│       │   │   ├── search/
│       │   │   └── testimonial/
│       │   ├── composables/
│       │   ├── error.vue
│       │   ├── layouts/
│       │   │   ├── default.vue
│       │   │   ├── docs.vue
│       │   │   └── page.vue
│       │   ├── pages/
│       │   │   ├── blog/
│       │   │   ├── contact.vue
│       │   │   ├── docs/
│       │   │   ├── index.vue
│       │   │   ├── license.vue
│       │   │   ├── privacy-policy.vue
│       │   │   └── terms-of-service.vue
│       │   ├── public/
│       │   └── utils/
│       ├── constants/
│       │   ├── hints.json
│       │   └── paths.json
│       ├── content/                # Nuxt Content
│       │   ├── blog/
│       │   ├── docs/
│       │   │   ├── 0.index.md
│       │   │   └── 1.saas-starter-kit/
│       │   │       ├── 0.index.md
│       │   │       ├── 1.getting-started/
│       │   │       ├── 2.features/
│       │   │       └── 3.concepts/
│       │   ├── faqs/
│       │   ├── license.md
│       │   ├── privacy-policy.md
│       │   └── terms-of-service.md
│       ├── content.config.ts
│       ├── nuxt.config.ts
│       ├── package.json
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
├── patches/                        # Node module patches
│   ├── @openauthjs%2Fopenauth@0.3.9.patch
│   ├── @tanayvk%2Fmailer@9.5.6.patch
│   └── nodemailer@6.10.1.patch
│
├── scripts/                        # Scripts utilitários
│   └── dev.ts
│
├── .env.example                    # Template de variáveis
├── .env.production                 # Prod env (não commitado)
├── .env.stage                      # Stage env (não commitado)
├── .gitignore
├── AGENTS.md                       # Documentação para LLMs
├── bun.lock                        # Lockfile Bun
├── bunfig.toml                     # Config Bun
├── config.ts                       # Config global (flags, domínios)
├── DESIGN_SYSTEM.md                # Doc design system
├── package.json                    # Root package (workspaces)
├── README.md
├── skills-lock.json                # Kiro skills lock
├── sst-env.d.ts                    # Types SST
├── sst.config.ts                   # Config SST
└── tsconfig.json                   # TypeScript config global
```

## 🎯 Packages e suas Responsabilidades

### Apps (Nuxt Applications)

| Package | Tipo | Output | Domínio | Descrição |
|---------|------|--------|---------|-----------|
| `packages/app` | Nuxt SSR | Worker | `app.{domain}` | Dashboard multi-tenant, billing, RBAC, admin |
| `packages/auth-frontend` | Nuxt Static | Worker | `auth.{domain}` | Login, signup, forgot password UI |
| `packages/web` | Nuxt SSR | Worker | `{domain}` | Landing, blog (Nuxt Content), docs |

### Shared Packages

| Package | Tipo | Descrição |
|---------|------|-----------|
| `packages/design-tokens` | Library | Tokens CSS, theme config |
| `packages/emails` | Library | Templates React Email (Invitation, Code, Welcome) |
| `packages/functions` | Workers | Lógica backend, database, auth worker, jobs, cron |

### Workers (dentro de `packages/functions/src/`)

| Worker | Arquivo | Tipo | Descrição |
|--------|---------|------|-----------|
| Auth | `auth.ts` | Worker | OpenAuth.js issuer (password, code, OAuth) |
| Emails | `emails.ts` | Worker | Envia emails via Resend/Mailgun |
| Websockets | `websockets.js` | Durable Object | Real-time via WebSocket |
| Jobs Consumer | `jobs-consumer.ts` | Queue Consumer | Processa jobs async (batch 10/5s) |
| DLQ Consumer | `dlq-consumer.ts` | Queue Consumer | Dead letter queue |
| Cron | `cron.ts` | Cron Worker | Tarefas agendadas (1x/hora) |

## 🗄️ Database

**Schema:** `packages/functions/src/database/schema.ts` (Drizzle ORM)

**Tabelas principais:**
- `User` - Usuários
- `Team` - Teams (multi-tenant)
- `TeamMembership` - Membros de teams
- `TeamInvite` - Convites pendentes
- `Role` - Roles RBAC
- `Permission` - Permissões RBAC
- `Plan` - Planos de assinatura
- `Benefit` - Benefícios de planos
- `Subscription` - Assinaturas ativas
- `Job` - Jobs assíncronos
- `Log` - Logs de eventos
- `Notification` - Notificações
- `PlatformAdmin` - Admins da plataforma
- `AuditLog` - Audit trail
- `DeadLetterRecord` - Jobs falhados

**Migrations:** `packages/functions/src/database/migrations/`

**Seeds:**
- `seed.ts` - Seed principal (Plan Free)
- `seed-demo-accounts.ts` - Contas demo (manual)
- `grant-platform-admin.ts` - Conceder admin (manual)

## 🚀 Infrastructure (SST)

**Localização:** `infra/`

**Recursos Cloudflare:**

| Recurso | Arquivo | Tipo | Descrição |
|---------|---------|------|-----------|
| AppDB | `database.ts` | Hyperdrive | Connection pooling PostgreSQL |
| Auth | `auth.ts` | Worker + KV | OpenAuth issuer + credentials |
| AuthKV | `auth.ts` | KV | Sessions e credentials |
| App | `app.ts` | Worker | Dashboard (Nuxt Nitro) |
| Web | `web.ts` | Worker | Site público (Nuxt Nitro) |
| Emails | `emails.ts` | Worker | Email sender |
| Websockets | `websockets.ts` | Worker + DO | Real-time |
| JobQueue | `jobs.ts` | Queue | Jobs assíncronos |
| JobDLQ | `jobs.ts` | Queue | Dead letter queue |
| Cron | `cron.ts` | Cron | Tarefas agendadas |

**Secrets:** Gerenciados via `infra/secret.ts` (SST Secrets)

**DNS:** Configurado em `infra/dns.ts`
- `app.{domain}` - Dashboard
- `auth.{domain}` - Auth
- `websockets.{domain}` - WebSocket
- `{domain}` - Site público

## 📦 Workspace (Bun)

**Root:** `package.json`
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

**Packages:**
- `@nuxfire/app`
- `@nuxfire/auth-frontend`
- `@nuxfire/design-tokens`
- `@nuxfire/emails`
- `@nuxfire/functions`
- `@nuxfire/web`

## 🔧 Configuração

### Arquivo: `config.ts`
- Domínios (prod/dev)
- Email config
- Feature flags (stripe, paddle, oauth, websockets, jobs)
- Paths internos

### Arquivos: `.env.*`
- `.env.example` - Template
- `.env.stage` - Dev/stage
- `.env.production` - Produção

### Secrets (via SST):
- Database (host, port, name, user, password)
- OAuth (GitHub, Google)
- Payments (Stripe, Paddle)
- Email (Resend, Mailgun)
- Platform admin (MFA, encryption)
- User MFA (session, encryption)

## 🛠️ Ferramentas e Build

- **Runtime:** Bun
- **Framework:** Nuxt 4
- **IaC:** SST v4
- **ORM:** Drizzle
- **Auth:** OpenAuth.js
- **Deployment:** Cloudflare Workers
- **UI:** Nuxt UI (Tailwind CSS)
- **Content:** Nuxt Content v3
- **Validation:** Valibot
- **Email:** React Email
- **Payments:** Stripe + Paddle
- **Authorization:** nuxt-authorization (Bouncer-style)

## 📝 Documentação

- `README.md` - Overview geral
- `AGENTS.md` - Guia para LLMs/Agents
- `DESIGN_SYSTEM.md` - Design system
- `packages/functions/src/database/MIGRATIONS.md` - Guia de migrations
- `packages/web/content/docs/` - Documentação completa do produto
