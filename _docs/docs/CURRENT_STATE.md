# Nuxfire — Estado Atual da Aplicação (Current State / As-Is)

> **Documento de Referência Técnica (As-Is)**  
> **Última verificação:** Setembro/2026  
> **Regra de ouro:** Baseado estritamente no código-fonte real. Sem suposições, sem planos futuros misturados.

---

## 1. Visão Geral da Arquitetura

O **Nuxfire** é um SaaS starter kit multi-tenant desenvolvido em monorepo com Bun workspaces, projetado especificamente para rodar **100% serverless na borda da Cloudflare**, orquestrado via **SST v4** (`sst.cloudflare.*`).

```
                              [ Cloudflare Global Edge ]
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
   [ auth.<domain> ]              [ app.<domain> ]               [ <domain> ]
   OpenAuth.js Worker             Main App Worker                Web Worker
   (AuthKV + Rate Limits)         (Nitro + Nuxt 4 + tRPC)        (Nuxt Content v3 + D1)
            │                             │                             │
            │ (Service Binding)           ├─► Hyperdrive ──► Postgres   └─► D1 Database
            └────────────────────────────►├─► Cloudflare KV (Cache/Limit)
                                          ├─► NuxtHub Blob (R2 Storage)
                                          ├─► Durable Objects (WebSockets)
                                          ├─► Cloudflare Queues (Jobs + DLQ)
                                          └─► Cloudflare Cron (Hourly)
```

---

## 2. Stack Tecnológica Real (Verificada no Código)

| Camada | Tecnologia Real | Observação Crítica |
|---|---|---|
| **Linguagem & Runtime** | TypeScript 5.x + Bun | `bunfig.toml` com `linker = "hoisted"` para compatibilidade Windows. |
| **Framework Fullstack** | Nuxt 4 (`^4.5.2`) + Vue 3 | Pacotes separados para App, Web e Auth-Frontend. |
| **Estilização & UI** | `@nuxt/ui` v4 (`^4.8.1`) + Tailwind CSS | Componentes baseados em Tailwind e tokens compartilhados. |
| **Design Tokens** | `@nuxfire/design-tokens` | Pacote interno compartilhado para paleta e temas. |
| **API & Comunicação** | tRPC v10 (`@trpc/server`, `@trpc/client`) | Total type-safety ponta a ponta entre front e server Nitro. |
| **Banco de Dados Principal** | PostgreSQL | Não usa SQLite nem D1 no app principal. |
| **Conexão de Banco** | Cloudflare Hyperdrive | Pooling e aceleração TCP na borda. `useDB()` cria cliente por requisição. |
| **ORM & Migrações** | Drizzle ORM (`drizzle-orm/postgres-js`) | Dialeto PostgreSQL estrito (`pgTable`). Migrações automáticas no deploy. |
| **Autenticação** | OpenAuth.js (`@openauthjs/openauth`) | Worker isolado. Credenciais e sessões vivem em Cloudflare KV (`AuthKV`). |
| **Autorização (RBAC)** | `nuxt-authorization` (Bouncer style) | Habilidades definidas via `defineAbility()` e checadas por strings. |
| **Platform Admin Console** | `platformAdminProcedure` | Autoridade separada do RBAC do time. Exige MFA TOTP elevado a cada 30 min. |
| **Armazenamento de Arquivos** | `@nuxthub/core` `hubBlob()` | Armazenamento de avatares e logos de times backed por Cloudflare R2. |
| **Pagamentos & Billing** | Stripe (`v17.5.0`) + Paddle Node SDK (`v2.4.0`) | Modelos híbridos com planos no banco e sincronização no catálogo Stripe. |
| **E-mails Transacionais** | React Email + Resend | Worker dedicado (`emails.ts`). Apenas Resend ativo em produção. |
| **Mensageria em Tempo Real** | Cloudflare Durable Objects | Classe `Websockets` para envio de notificações em tempo real. |
| **Background Jobs & Filas** | Cloudflare Queues + DLQ | Fila de execução assíncrona com fallback para Dead Letter Queue. |
| **Tarefas Agendadas** | Cloudflare Cron | Disparo de hora em hora (`0 * * * *`). |
| **Site Público & Docs** | Nuxt Content v3 (`^3.16.0`) | Docs com busca client-side e D1 backing queries em produção. |
| **Infraestrutura como Código** | SST v4 (`4.14.0`) | Todo o ambiente Cloudflare definido em TypeScript (`infra/*.ts`). |
| **Testes Unitários** | Vitest (`v5.0.0`) | 4 suites de testes de regras de negócio em `packages/app`. |

---

## 3. Inventário Detalhado por Módulo

### 3.1. Autenticação, Identidade e Sessões
- **Status:** ✅ **Completo e Operacional**
- **Arquivos:** `packages/functions/src/auth.ts`, `packages/auth-frontend/app/*`, `packages/app/server/utils/auth.ts`
- **O que existe hoje:**
  - Login por E-mail e Senha com hash `scrypt` (`ScryptHasher`).
  - Login Passwordless via Código OTP por E-mail (Magic Code) gerado e enviado por React Email.
  - **Social Login OAuth:** GitHub e Google implementados no OpenAuth e integrados com botões em `AuthSocialLogin.vue`.
  - Rate limiting baseado em IP e e-mail via Cloudflare KV protegendo rotas de credenciais contra força bruta.
  - Gerenciamento de tokens via cookies HTTP-only (`nuxfire-access-token`, `nuxfire-refresh-token`).
  - Endpoint de revogação remota de sessões (`/internal/identity/sign-out-others`).
  - Endpoint de expurgo total de identidade (`/internal/identity/delete`).
  - MFA / 2FA TOTP opcional para usuários comuns em `/account-settings/security`, com chaves AES-GCM e QR Code gerado 100% no navegador (`uqr`).
  - Fluxo de exclusão de conta permanente com expurgo em cascata e bloqueio para donos únicos de times ativos.

### 3.2. Espaços de Trabalho (Teams) & RBAC
- **Status:** ✅ **Completo e Operacional**
- **Arquivos:** `packages/app/server/trpc/routers/teams.ts`, `packages/app/server/trpc/routers/invites.ts`, `packages/app/shared/utils/abilities.ts`
- **O que existe hoje:**
  - Multi-tenancy por slug na URL (`/[team]/dashboard`, `/[team]/settings/*`).
  - Seletor de times (`TeamSwitcher.vue`) e página de seleção (`/select-team`).
  - Criação, edição e exclusão de times (com autorização estrita).
  - Upload de logotipo da equipe com armazenamento em Cloudflare R2 (NuxtHub Blob).
  - Convites por e-mail com token de 30 dias, reenvio, revogação, aceitação e recusa.
  - **Enforcement estrito de assentos (Seat Limits):** Bloqueio de novos convites e aceitações caso atinja `maxSeats` do plano.
  - Sistema de permissões RBAC com papéis de sistema (`Owner`, `Admin`, `Member`) e suporte a papéis por equipe.
  - Middleware de bloqueio global para times com status `SUSPENDED`.

### 3.3. Console do Platform Admin (`/admin`)
- **Status:** ✅ **Completo e Operacional**
- **Arquivos:** `packages/app/server/trpc/routers/admin/*`, `packages/app/app/layouts/admin.vue`, `packages/app/app/pages/admin/*`
- **O que existe hoje:**
  - Gated por `platformAdminProcedure` com validação de tabela `PlatformAdmin`, MFA ativo e sessão elevada (<30 min).
  - Modal de autenticação/desafio MFA integrado com backdrop em blur.
  - **Empresas (`/admin/companies`):** Busca global cross-tenant, listagem de membros, detalhe de uso e ações de **Suspender** e **Reativar** empresas.
  - **Planos (`/admin/plans`):** Criação, edição, arquivamento de planos e sincronização direta com a API do Stripe (criação automática de Products e Prices).
  - **Filas (`/admin/queue`):** Métricas de processamento da fila, visualização da Dead Letter Queue e **botão de Replay Dead Letter**.
  - **Auditoria (`/admin/audit-log`):** Trilha imutável de eventos administrativos (ator, ação, recurso, IP e metadata).
  - **Notificações Globais (`/admin/notifications`):** Disparo de notificações em tempo real para qualquer membro de qualquer empresa.

### 3.4. Faturamento & Assinaturas (Billing)
- **Status:** ✅ **Operacional** *(com limitações conhecidas)*
- **Arquivos:** `packages/app/server/trpc/routers/billing.ts`, `packages/app/server/trpc/routers/stripe.ts`, `packages/app/server/api/webhooks/*`
- **O que existe hoje:**
  - Suporte a múltiplos provedores: **Stripe** e **Paddle**.
  - Planos dinâmicos definidos no Postgres (`Plan`, `Benefit`, `BenefitOnPlan`).
  - Checkout Stripe com reutilização de `stripeCustomerId` no time.
  - Checkout Paddle via overlay client-side (`@paddle/paddle-js`).
  - Webhooks de ciclo de vida de assinatura (criação, renovação, cancelamento, falha de pagamento).
  - Ledger de eventos em Cloudflare KV com TTL para garantir idempotência contra reenvios de webhooks.
  - Redirecionamento para Portais de Clientes (Stripe Billing Portal / Paddle Portal) para troca de cartões e cancelamento.

### 3.5. Filas, Background Jobs & WebSockets
- **Status:** ✅ **Completo e Operacional**
- **Arquivos:** `infra/jobs.ts`, `infra/websockets.ts`, `infra/cron.ts`, `packages/functions/src/websockets.js`
- **O que existe hoje:**
  - WebSocket Server rodando em Cloudflare Durable Objects com autenticação via ticket HMAC de curta duração.
  - Notificações do sino no dashboard atualizadas instantaneamente sem recarregar tela.
  - Fila de background (`JobQueue`) com limite de concorrência, retentativas e Dead Letter Queue (`JobDLQ`).
  - Cron horário no Cloudflare Cron registrando batimentos na tabela `Log`.

### 3.6. Site Público, Conteúdo & Documentação
- **Status:** ✅ **Operacional**
- **Arquivos:** `packages/web/content/**`, `packages/web/app/components/search/Search.vue`, `infra/web.ts`
- **O que existe hoje:**
  - Nuxt Content v3 com 4 coleções: `docs`, `blog`, `faqs`, `legal`.
  - Banco Cloudflare D1 provisionado e conectado ao Worker público para consultas do `@nuxt/content`.
  - **Busca Full-Text na documentação** via `useSearchCollection("docs")` e `UCommandPalette` (atalho `Ctrl+K`).
  - Prerender crawler configurado com script de indexação estática de rotas de documentação.
  - Landing page completa baseada em componentes Nuxt UI.

---

## 4. O que Está Parcialmente Implementado ou Estático

1. **Internacionalização (i18n):** Módulo `@nuxtjs/i18n` presente no build, mas apenas uma string (`welcome`) traduzida em `i18n.config.ts`. O restante da aplicação está em inglês hardcoded.
2. **Provedores de E-mail Secundários:** Apenas **Resend** está ativo. Códigos de transporte para Mailgun, AWS SES, SparkPost e SMTP existem comentados em `packages/functions/src/emails.ts`.
3. **Templates de E-mail:** 3 templates React Email (`Welcome`, `VerificationCode`, `Invitation`). Não há outros fluxos ou editor visual.
4. **Métricas do Dashboard:** O gráfico em `TeamDashboardChart.client.vue` exibe dados mockados ilustrativos por falta de agregação analítica no banco.
5. **Busca no Site Público:** A busca funciona exclusivamente para a documentação, não indexando o blog.

---

## 5. O que NÃO Existe Hoje (Lacunas Reais)

* ❌ **Fluxo de Onboarding / Wizard:** Não há passo a passo guiado após o primeiro login.
* ❌ **Download / Emissão Nativa de Invoices em PDF:** Não há geração de PDFs na aplicação; depende 100% dos portais externos da Stripe/Paddle.
* ❌ **Troca de Plano In-App com Proration:** Upgrade/downgrade exige passar por um novo checkout.
* ❌ **Pipelines de CI/CD:** Sem arquivos em `.github/workflows/`. O deploy é executado manualmente via CLI (`bun run deploy`).
* ❌ **Suporte a Múltiplos Bancos de Dados:** Exclusivo para PostgreSQL (não há adaptadores para MySQL, SQLite no app principal ou MongoDB).
* ❌ **Ferramentas de Analytics / Telemetria:** Sem integração ativa com PostHog, Google Analytics, Plausible ou Umami.
* ❌ **Recursos de IA:** Intencionalmente removidos do starter kit.
* ❌ **Page Builder Visual:** A landing page é código estático Vue.
* ❌ **Testes E2E:** Apenas testes unitários com Vitest (14 testes); sem Playwright ou Cypress.
