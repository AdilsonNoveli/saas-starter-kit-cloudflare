# Arquitetura da Aplicação Movimenta Bairro

> **Última atualização:** Janeiro 2025  
> **Stack Principal:** Nuxt 4, Cloudflare Workers, PostgreSQL, tRPC, SST v3

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitetura de Infraestrutura](#arquitetura-de-infraestrutura)
- [Estrutura de Pacotes](#estrutura-de-pacotes)
- [Camadas da Aplicação](#camadas-da-aplicação)
- [Banco de Dados](#banco-de-dados)
- [Sistema de Filas](#sistema-de-filas)
- [Autenticação](#autenticação)
- [WebSockets](#websockets)
- [Sistema de Pagamentos](#sistema-de-pagamentos)
- [Fluxo de Deploy](#fluxo-de-deploy)
- [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## 🎯 Visão Geral

**Movimenta Bairro** é uma aplicação SaaS multi-tenant construída com arquitetura moderna de edge computing, rodando 100% em Cloudflare Workers com PostgreSQL como banco de dados principal.

### Características Principais

- ✅ **Multi-tenant** - Sistema de times/organizações
- ✅ **Edge-first** - Deploy em 300+ datacenters globalmente
- ✅ **Serverless** - Zero servidores para gerenciar
- ✅ **Type-safe** - TypeScript end-to-end com tRPC
- ✅ **Real-time** - WebSockets via Durable Objects
- ✅ **Background Jobs** - Processamento assíncrono com Cloudflare Queues
- ✅ **Multi-auth** - Email magic link, Google, GitHub
- ✅ **Payments** - Stripe e Paddle integrados

---

## 🛠 Stack Tecnológico

### Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Nuxt 4** | 4.5.2 | Framework Vue.js com SSR |
| **Vue 3** | Latest | UI Framework |
| **Nuxt UI** | 2.20.0 | Biblioteca de componentes |
| **TailwindCSS** | - | Estilização |
| **tRPC** | 10.45.4 | API type-safe |
| **Pinia** | 2.3.1 | State management |
| **VueUse** | 12.0.0 | Composables utilitários |

### Backend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Cloudflare Workers** | - | Runtime serverless |
| **Nitro** | - | Server engine do Nuxt |
| **Drizzle ORM** | 0.45.2 | Database ORM |
| **PostgreSQL** | - | Banco de dados principal |
| **Hyperdrive** | - | Connection pooling |

### Infraestrutura

| Serviço | Uso |
|---------|-----|
| **SST v3** | Infrastructure as Code |
| **Cloudflare Workers** | Compute |
| **Cloudflare Hyperdrive** | Database connection pooling |
| **Cloudflare Queues** | Async job processing |
| **Cloudflare Durable Objects** | WebSockets e state |
| **Cloudflare KV** | Key-value storage |
| **Cloudflare R2** | Object storage (uploads) |

### Autenticação & Pagamentos

| Serviço | Propósito |
|---------|-----------|
| **OpenAuth** | Sistema de autenticação |
| **Stripe** | Processamento de pagamentos |
| **Paddle** | Processamento de pagamentos alternativo |

### DevOps

| Ferramenta | Uso |
|------------|-----|
| **Bun** | Package manager & runtime |
| **GitHub Actions** | CI/CD |
| **Wrangler** | Deploy para Cloudflare |
| **ESLint** | Linting |
| **Prettier** | Formatação de código |

---

## 🏗 Arquitetura de Infraestrutura

### Visão Geral da Infraestrutura

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │   Auth App   │  │  Main App    │          │
│  │   (Static)   │  │  (Workers)   │  │  (Workers)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  WebSockets  │  │    Emails    │  │     Jobs     │          │
│  │   (Durable   │  │  (Workers)   │  │  (Consumer)  │          │
│  │   Objects)   │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  KV Storage  │  │  R2 Storage  │  │    Queues    │          │
│  │              │  │   (Blobs)    │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   HYPERDRIVE     │
                  │  (Connection     │
                  │   Pooling)       │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   PostgreSQL     │
                  │   (Database)     │
                  └──────────────────┘
```

### Componentes de Infraestrutura

#### 1. **App Worker** (`packages/app`)
- Aplicação principal Nuxt 4
- Server-side rendering (SSR)
- API tRPC
- Gestão de times, membros, billing
- Processamento de webhooks (Stripe/Paddle)

#### 2. **Auth Worker** (`packages/functions/src/auth.ts`)
- Autenticação via OpenAuth
- Magic links por email
- OAuth (Google, GitHub)
- Gestão de sessões

#### 3. **WebSockets Worker** (`packages/functions/src/websockets.js`)
- Real-time communication
- Durable Objects para state management
- Pub/Sub para broadcast

#### 4. **Emails Worker** (`packages/functions/src/emails.ts`)
- Envio de emails transacionais
- Templates React Email
- Suporte múltiplos provedores (Resend, SES, SMTP)

#### 5. **Jobs Consumer** (`packages/functions/src/jobs-consumer.ts`)
- Processa jobs assíncronos da fila
- Batch processing (10 jobs / 5 segundos)
- Retry automático com DLQ

#### 6. **Web (Landing)** (`packages/web`)
- Site estático/marketing
- Documentação
- Blog
- SEO otimizado

---

## 📦 Estrutura de Pacotes

```
movimenta-bairro/
├── packages/
│   ├── app/                    # Aplicação principal (Nuxt 4)
│   │   ├── app/
│   │   │   ├── components/    # Componentes Vue
│   │   │   ├── composables/   # Composables reutilizáveis
│   │   │   ├── layouts/       # Layouts de página
│   │   │   ├── middleware/    # Middleware de rota
│   │   │   ├── pages/         # Páginas (file-based routing)
│   │   │   ├── plugins/       # Plugins Nuxt
│   │   │   └── utils/         # Funções utilitárias
│   │   ├── server/
│   │   │   ├── api/           # API routes Nitro
│   │   │   ├── trpc/          # tRPC routers
│   │   │   ├── tasks/         # Scheduled tasks
│   │   │   └── utils/         # Server utilities
│   │   └── shared/
│   │       └── utils/         # Código compartilhado
│   │
│   ├── auth-frontend/         # App de autenticação (Nuxt)
│   │   ├── app/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   │       ├── login.vue
│   │   │       ├── signup.vue
│   │   │       └── forgot-password.vue
│   │   └── nuxt.config.ts
│   │
│   ├── web/                   # Landing page (Nuxt + Content)
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── layouts/
│   │   ├── content/           # Markdown content
│   │   │   ├── docs/
│   │   │   ├── blog/
│   │   │   └── faqs/
│   │   └── nuxt.config.ts
│   │
│   ├── emails/                # Email templates (React Email)
│   │   ├── emails/
│   │   │   ├── Welcome.tsx
│   │   │   ├── Invitation.tsx
│   │   │   └── VerificationCode.tsx
│   │   └── index.ts
│   │
│   └── functions/             # Cloudflare Workers
│       └── src/
│           ├── auth.ts        # Authentication worker
│           ├── emails.ts      # Email sender worker
│           ├── websockets.js  # WebSocket handler
│           ├── jobs-consumer.ts # Queue consumer
│           ├── cron.ts        # Scheduled jobs
│           └── database/
│               └── schema.ts  # Database schema
│
├── infra/                     # Infrastructure as Code (SST)
│   ├── app.ts                 # Main app deployment
│   ├── auth.ts                # Auth service config
│   ├── database.ts            # Hyperdrive setup
│   ├── dns.ts                 # Domain configuration
│   ├── emails.ts              # Email worker deployment
│   ├── jobs.ts                # Queue setup
│   ├── websockets.ts          # WebSocket config
│   ├── cron.ts                # Cron jobs
│   ├── secret.ts              # Secrets management
│   └── utils/
│       ├── builder.ts         # Build utilities
│       ├── nuxt.ts            # Nuxt deployment helper
│       └── semaphore.ts       # Concurrency control
│
├── _docs/                     # Documentação do projeto
│   ├── arquitecture.md        # Este arquivo
│   ├── guia-rapido.md         # Quick start
│   ├── planning/              # Documentos de planejamento
│   └── dev-ai/                # Notas de desenvolvimento
│
├── config.ts                  # Configuração global
├── sst.config.ts              # SST configuration
└── package.json               # Monorepo root
```

---

## 🔄 Camadas da Aplicação

### 1. Camada de Apresentação (Frontend)

**Componentes:**
- Vue 3 components
- Nuxt layouts
- Composables para lógica reutilizável
- State management com Pinia

**Padrões:**
```
app/
├── components/
│   ├── account/          # Gestão de conta
│   ├── team/            # Gestão de times
│   ├── notifications/   # Sistema de notificações
│   ├── pricing/         # Componentes de pricing
│   └── layout/          # Componentes de layout
├── composables/
│   ├── use-ability.ts       # Controle de permissões
│   ├── use-teams-store.ts   # State de times
│   └── use-trpc-client.ts   # Cliente tRPC
└── pages/
    ├── [[team]]/            # Rotas com contexto de time
    │   ├── dashboard.vue
    │   ├── async-jobs.vue
    │   └── settings/
    ├── account-settings.vue
    └── select-team.vue
```

### 2. Camada de API (tRPC)

**Routers:**

```typescript
// server/trpc/routers/index.ts
export const appRouter = router({
  teams,        // Gestão de times
  account,      // Conta do usuário
  stripe,       // Pagamentos Stripe
  billing,      // Assinaturas e billing
  invites,      // Convites para times
  asyncJobs,    // Jobs assíncronos
  notifications,// Notificações
  public: pub,  // APIs públicas
});
```

**Exemplo de Router:**
```typescript
// server/trpc/routers/teams.ts
export default router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.query.teams.findMany({
        where: eq(teamMemberships.userId, ctx.user.id),
      });
    }),
  
  create: protectedProcedure
    .input(createTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await db.insert(teams).values({
        name: input.name,
        slug: input.slug,
        planId: "free",
      }).returning();
      
      // Criar membership
      await db.insert(teamMemberships).values({
        teamId: team[0].id,
        userId: ctx.user.id,
        roleId: "owner",
      });
      
      return team[0];
    }),
});
```

### 3. Camada de Dados (Drizzle ORM)

**Schema Principal:**
```typescript
// packages/functions/src/database/schema.ts
users             // Usuários
teams             // Times/Organizações
teamMemberships   // Relacionamento usuário-time
teamInvites       // Convites pendentes
roles             // Roles e permissões
subscriptions     // Assinaturas ativas
jobs              // Jobs assíncronos
logs              // Logs de sistema
notifications     // Notificações de usuário
sessions          // Sessões de autenticação
```

---

## 🗄 Banco de Dados

### Diagrama de Entidades

```
┌──────────────┐
│    Users     │
└──────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│ TeamMemberships  │
└──────────────────┘
       │
       │ N:1
       ▼
┌──────────────┐      1:N      ┌──────────────┐
│    Teams     │───────────────▶│     Jobs     │
└──────────────┘                └──────────────┘
       │                               │
       │ 1:N                          │ 1:N
       ▼                               ▼
┌──────────────┐                ┌──────────────┐
│Subscriptions │                │     Logs     │
└──────────────┘                └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│    Roles     │
└──────────────┘
```

### Tabelas Principais

#### **users**
```typescript
{
  id: string (UUID)
  name: string
  email: string (unique)
  image: string
}
```

#### **teams**
```typescript
{
  id: string (CUID)
  name: string
  slug: string
  description: string
  logo: string
  planId: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### **teamMemberships**
```typescript
{
  id: string (CUID)
  teamId: string (FK)
  userId: string (FK)
  roleId: string (FK)
  createdAt: timestamp
  updatedAt: timestamp
  
  // Unique constraint: (teamId, userId)
}
```

#### **jobs**
```typescript
{
  id: string (CUID)
  teamId: string (FK)
  message: string
  status: 'pending' | 'completed' | 'failed'
  createdAt: timestamp
  completedAt: timestamp
}
```

#### **subscriptions**
```typescript
{
  id: string (CUID)
  teamId: string (FK)
  provider: 'stripe' | 'paddle'
  subscriptionId: string
  customerId: string
  status: string
  planId: string
  currentPeriodEnd: timestamp
  cancelAtPeriodEnd: boolean
  metadata: jsonb
}
```

### Conexão com Banco

```typescript
// Via Hyperdrive (connection pooling)
const database = new sst.cloudflare.Hyperdrive("AppDB", {
  origin: {
    scheme: "postgres",
    host: secret.DatabaseHost.value,
    port: secret.DatabasePort.value,
    database: secret.DatabaseName.value,
    user: secret.DatabaseUser.value,
    password: secret.DatabasePassword.value,
  },
});

// No código
const sql = postgres(env.AppDB.connectionString);
const db = drizzle(sql, { schema });
```

---

## ⚡ Sistema de Filas

### Arquitetura

```
┌─────────────┐
│   App       │
│   Worker    │
└─────────────┘
      │
      │ send(job)
      ▼
┌─────────────┐
│ JobQueue    │
│ (Cloudflare │
│  Queues)    │
└─────────────┘
      │
      │ batch (10 jobs / 5s)
      ▼
┌─────────────┐
│    Jobs     │
│  Consumer   │
│   Worker    │
└─────────────┘
      │
      │ update status
      ▼
┌─────────────┐
│  Database   │
└─────────────┘
```

### Configuração

```typescript
// infra/jobs.ts
export const jobsQueue = new sst.cloudflare.Queue("JobQueue", {
  maxConcurrency: 5,
  dlq: {
    queue: jobsDeadLetterQueue.queueName,
    retry: 3,
    retryDelay: "120 seconds",
  },
});

jobsQueue.subscribe({
  handler: "packages/functions/src/jobs-consumer.ts",
  batch: {
    size: 10,
    window: "5 seconds",
  },
});
```

### Fluxo de Uso

**1. Criar Job:**
```typescript
// server/trpc/routers/async-jobs.ts
const job = await db.insert(jobs).values({
  teamId: team.id,
  message: input.message,
  status: "pending",
}).returning();

await jobsQueue.send(job);
```

**2. Processar Job:**
```typescript
// packages/functions/src/jobs-consumer.ts
export default {
  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      const job = message.body;
      try {
        // Processar job
        await processJob(job);
        
        // Marcar como completo
        await db.update(jobs)
          .set({ status: "completed" })
          .where(eq(jobs.id, job.id));
        
        message.ack();
      } catch (err) {
        await db.update(jobs)
          .set({ status: "failed" })
          .where(eq(jobs.id, job.id));
        
        message.retry(); // Retry com backoff
      }
    }
  }
};
```

### Dead Letter Queue (DLQ)

Jobs que falharam após 3 tentativas vão para `JobDLQ` para auditoria e replay manual.

---

## 🔐 Autenticação

### Arquitetura OpenAuth

```
┌─────────────┐
│   Client    │
└─────────────┘
      │
      │ 1. Iniciar login
      ▼
┌─────────────┐
│  Auth App   │
│  (Worker)   │
└─────────────┘
      │
      │ 2. Enviar código
      ▼
┌─────────────┐
│   Emails    │
│   Worker    │
└─────────────┘
      │
      │ 3. Usuário recebe email
      ▼
┌─────────────┐
│   Email     │
│  Provider   │
└─────────────┘
      │
      │ 4. Clicar link/inserir código
      ▼
┌─────────────┐
│  Auth App   │
│  Callback   │
└─────────────┘
      │
      │ 5. Criar sessão
      ▼
┌─────────────┐
│     KV      │
│  (Sessions) │
└─────────────┘
```

### Métodos de Autenticação

1. **Magic Link (Email)**
   - Código de 6 dígitos
   - Válido por 10 minutos
   - Sem senha necessária

2. **OAuth Google**
   - Google Sign-In
   - Scope: email, profile

3. **OAuth GitHub**
   - GitHub OAuth App
   - Scope: user:email

### Subjects (Contexto de Autenticação)

```typescript
// packages/functions/src/subjects.ts
export const subjects = createSubjects({
  user: object({
    id: string(),
    name: string(),
    email: string(),
  }),
  
  session: object({
    id: string(),
    userId: string(),
    expiresAt: number(),
  }),
});
```

### Middleware de Autenticação

```typescript
// packages/app/app/middleware/0.auth.global.ts
export default defineNuxtRouteMiddleware(async () => {
  const { user } = await useAuth();
  
  // Rotas públicas
  const publicRoutes = ['/login', '/signup'];
  if (publicRoutes.includes(to.path)) {
    return;
  }
  
  // Requerer autenticação
  if (!user) {
    return navigateTo('/login');
  }
});
```

---

## 🔌 WebSockets

### Arquitetura

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└─────────────┘
      │
      │ WebSocket connection
      ▼
┌─────────────┐
│ WebSockets  │
│   Worker    │
└─────────────┘
      │
      │ Route to room
      ▼
┌─────────────┐
│  Durable    │
│   Object    │
│  (Room)     │
└─────────────┘
```

### Uso

**1. Conectar no Client:**
```typescript
// packages/app/app/plugins/websockets.client.ts
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const ws = ref<WebSocket | null>(null);
  
  const connect = () => {
    ws.value = new WebSocket(
      config.public.websocketsEndpoint + '/ws'
    );
    
    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle message
    };
  };
  
  return {
    provide: {
      ws: {
        connect,
        send: (data: any) => ws.value?.send(JSON.stringify(data)),
      },
    },
  };
});
```

**2. Publicar Mensagem no Server:**
```typescript
// server/trpc/context.ts
const sendWebsocketsEvent = async (topic: string, data: any) => {
  if (!event.context.cloudflare?.env?.Websockets) return;
  
  await event.context.cloudflare.env.Websockets.publish(
    topic,
    data
  );
};
```

**3. Durable Object (Room):**
```typescript
// packages/functions/src/websockets.js
export class Room extends DurableObject {
  async fetch(request) {
    return crossws.handleRequest(request, this);
  }
  
  async broadcast(message) {
    for (const client of this.clients) {
      client.send(message);
    }
  }
}
```

---

## 💳 Sistema de Pagamentos

### Providers Suportados

1. **Stripe**
   - Subscription management
   - Webhook handling
   - Customer portal

2. **Paddle**
   - Subscription management
   - Webhook handling
   - Sandbox mode

### Fluxo de Assinatura

```
┌─────────────┐
│   Client    │
└─────────────┘
      │
      │ 1. Selecionar plano
      ▼
┌─────────────┐
│   tRPC      │
│   Router    │
└─────────────┘
      │
      │ 2. Criar checkout
      ▼
┌─────────────┐
│ Stripe/     │
│ Paddle API  │
└─────────────┘
      │
      │ 3. Redirecionar
      ▼
┌─────────────┐
│  Checkout   │
│    Page     │
└─────────────┘
      │
      │ 4. Webhook
      ▼
┌─────────────┐
│   Server    │
│  Webhook    │
│  Handler    │
└─────────────┘
      │
      │ 5. Atualizar DB
      ▼
┌─────────────┐
│  Database   │
└─────────────┘
```

### Webhook Handlers

**Stripe:**
```typescript
// server/api/webhooks/stripe.post.ts
export default defineEventHandler(async (event) => {
  const sig = getHeader(event, 'stripe-signature');
  const payload = await readRawBody(event);
  
  const stripeEvent = stripe.webhooks.constructEvent(
    payload,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(stripeEvent.data.object);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(stripeEvent.data.object);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(stripeEvent.data.object);
      break;
  }
  
  return { received: true };
});
```

### Plans

```typescript
// server/utils/plans.ts
export const plans = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['Feature 1', 'Feature 2'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    features: ['All features'],
  },
};
```

---

## 🚀 Fluxo de Deploy

### 1. Build

```bash
# Build all packages
bun run build

# Packages individuais
cd packages/app && bun run build
cd packages/web && bun run build
cd packages/auth-frontend && bun run build
```

### 2. Deploy via SST

```bash
# Development
sst dev

# Deploy para staging
sst deploy --stage staging

# Deploy para produção
sst deploy --stage production
```

### 3. GitHub Actions (CI/CD)

```yaml
# .github/workflows/deploy.yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: sst deploy --stage production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 4. Estrutura de Deploy

```
Production:
- app.movimentabairro.org       → Main App
- auth.movimentabairro.org      → Auth App
- movimentabairro.org           → Marketing Site

Development:
- app.dev.movimentabairro.org   → Main App
- auth.dev.movimentabairro.org  → Auth App
- dev.movimentabairro.org       → Marketing Site
```

---

## 🔧 Variáveis de Ambiente

### Estrutura de Secrets

```typescript
// infra/secret.ts
export const secret = {
  // Database
  DatabaseHost: new sst.Secret("DatabaseHost"),
  DatabasePort: new sst.Secret("DatabasePort"),
  DatabaseName: new sst.Secret("DatabaseName"),
  DatabaseUser: new sst.Secret("DatabaseUser"),
  DatabasePassword: new sst.Secret("DatabasePassword"),
  
  // OAuth
  GoogleClientId: new sst.Secret("GoogleClientId"),
  GoogleClientSecret: new sst.Secret("GoogleClientSecret"),
  GitHubClientId: new sst.Secret("GitHubClientId"),
  GitHubClientSecret: new sst.Secret("GitHubClientSecret"),
  
  // Payments
  StripeSecretKey: new sst.Secret("StripeSecretKey"),
  StripeWebhookSecretKey: new sst.Secret("StripeWebhookSecretKey"),
  PaddleApiKey: new sst.Secret("PaddleApiKey"),
  PaddleWebhookSecret: new sst.Secret("PaddleWebhookSecret"),
  
  // Email Providers
  ResendApiKey: new sst.Secret("ResendApiKey"),
};
```

### Configuração Local

```bash
# .env.local (não commitar!)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=movimenta_bairro
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET_KEY=whsec_...
```

### Setar Secrets em Produção

```bash
# Via CLI do SST
sst secret set DatabaseHost "your-host"
sst secret set DatabasePassword "your-password"
sst secret set StripeSecretKey "sk_live_..."

# Listar secrets
sst secret list

# Remover secret
sst secret remove SecretName
```

---

## 📊 Monitoramento e Logs

### Cloudflare Dashboard

- **Workers Analytics** - Métricas de execução
- **Queues Dashboard** - Status das filas
- **R2 Analytics** - Storage usage
- **Logpush** - Logs para external services

### Logs de Aplicação

```typescript
// Structured logging
console.log(JSON.stringify({
  level: 'info',
  message: 'Job processed',
  jobId: job.id,
  duration: Date.now() - startTime,
}));
```

### Error Tracking

```typescript
// Context em erros
try {
  await processJob(job);
} catch (err) {
  console.error(JSON.stringify({
    level: 'error',
    message: 'Job failed',
    jobId: job.id,
    error: err.message,
    stack: err.stack,
  }));
  throw err;
}
```

---

## 🔄 Sistema de Permissões (CASL)

### Definição de Abilities

```typescript
// shared/utils/abilities.ts
export function defineAbilitiesFor(user: User, team: Team) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);
  
  const membership = team.memberships.find(m => m.userId === user.id);
  const role = membership?.role;
  
  if (role === 'owner') {
    can('manage', 'all');
  }
  
  if (role === 'admin') {
    can('manage', 'Team');
    can('manage', 'Member');
    cannot('delete', 'Team');
  }
  
  if (role === 'member') {
    can('read', 'Team');
    can('read', 'Member');
  }
  
  return build();
}
```

### Uso em Componentes

```vue
<template>
  <UButton 
    v-if="can('delete', 'Team')"
    @click="deleteTeam"
  >
    Delete Team
  </UButton>
</template>

<script setup lang="ts">
const { can } = useAbility();
</script>
```

---

## 🧪 Testes

### Estrutura de Testes

```
packages/app/
├── __tests__/
│   ├── unit/
│   │   ├── utils/
│   │   └── composables/
│   └── e2e/
│       ├── auth.spec.ts
│       └── teams.spec.ts
```

### Comandos

```bash
# Unit tests
bun test

# E2E tests
bun test:e2e

# Coverage
bun test:coverage
```

---

## 📈 Performance

### Edge Computing Benefits

- ⚡ **Latência < 50ms** - Deploy em 300+ cidades
- 🚀 **Cold start < 10ms** - Workers iniciam instantaneamente
- 📊 **Auto-scaling** - Escala automaticamente
- 💰 **Cost-effective** - Pay-per-use

### Otimizações

1. **Database Connection Pooling** via Hyperdrive
2. **Static Asset Caching** via Cloudflare CDN
3. **Image Optimization** via Nuxt Image
4. **Code Splitting** automático pelo Nuxt
5. **SSR Caching** quando apropriado

---

## 🔒 Segurança

### Práticas Implementadas

- ✅ **HTTPS Only** - TLS 1.3
- ✅ **CORS** configurado
- ✅ **Rate Limiting** via Cloudflare
- ✅ **SQL Injection Protection** via Drizzle ORM
- ✅ **XSS Protection** via sanitização
- ✅ **CSRF Protection** via tokens
- ✅ **Secure Headers** configurados
- ✅ **Secrets Management** via SST Secrets

### Headers de Segurança

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      },
    },
  },
});
```

---

## 🎓 Recursos Adicionais

### Documentação Externa

- [Nuxt 4 Documentation](https://nuxt.com)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [SST v3 Docs](https://sst.dev)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM](https://orm.drizzle.team)

### Repositórios Relacionados

- [SST Ion](https://github.com/sst/ion)
- [Nuxt](https://github.com/nuxt/nuxt)
- [tRPC](https://github.com/trpc/trpc)

---

## 📝 Changelog de Arquitetura

### 2025-01-XX
- ✅ Upgrade para Nuxt 4.5.2
- ✅ Documentação completa de arquitetura
- ✅ Sistema de filas documentado
- ✅ WebSockets via Durable Objects

### 2024-12-XX
- ✅ Setup inicial com SST v3
- ✅ Implementação de autenticação
- ✅ Sistema multi-tenant
- ✅ Integração Stripe/Paddle

---

## 🤝 Contribuindo

### Workflow de Desenvolvimento

1. **Clone o repo**
   ```bash
   git clone https://github.com/pedped-app/movimenta-bairro.git
   ```

2. **Instalar dependências**
   ```bash
   bun install
   ```

3. **Setup secrets locais**
   ```bash
   cp .env.example .env.local
   # Editar .env.local com suas credenciais
   ```

4. **Iniciar dev server**
   ```bash
   sst dev
   ```

5. **Fazer alterações**
   - Criar branch feature
   - Fazer commits descritivos
   - Abrir Pull Request

### Code Style

- ✅ **TypeScript strict mode**
- ✅ **ESLint** para linting
- ✅ **Prettier** para formatação
- ✅ **Conventional Commits**

---

## 📞 Suporte

Para dúvidas sobre arquitetura:
- 📧 Email: contato@movimentabairro.org
- 💬 GitHub Issues: [movimenta-bairro/issues](https://github.com/pedped-app/movimenta-bairro/issues)

---

**Mantido por:** Equipe Movimenta Bairro  
**Última revisão:** Janeiro 2025
