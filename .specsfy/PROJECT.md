# Projeto

> Conferido contra o código em 2026-09-18; onde a documentação divergia, prevaleceu
> o código. Referências de arquivo são caminhos reais.

## História e motivação

O **Nuxfire** é um SaaS starter kit multi-tenant: um monorepo pronto para
produção que roda 100% na borda da Cloudflare (Workers), com deploy por SST 4 e
o nome de pacotes `@nuxfire/*`. Domínio de produção `nuxfire.com`.

Na evolução arquitetural, todo o domínio de
negócio saiu do app único e foi extraído para **Nuxt Layers** (`layers/`), em
fases; `apps/app` ficou como *Composition Root* (casca do app, composição do
tRPC, `nuxt.config.ts` e infraestrutura central) e não contém mais lógica de
domínio. Os pacotes antigos foram renomeados: `packages/app` → `apps/app`,
`packages/auth-frontend` → `apps/login`, `packages/design-tokens` →
`packages/tokens`. O histórico de migrações do banco foi consolidado em uma única
`0000_init.sql` em 2026-09-16.

## Finalidade

Entregar a base de um SaaS B2B multi-tenant com autenticação, equipes e
permissões, console de operação da plataforma, cobrança (Stripe e Paddle),
notificações em tempo real, jobs em fila, site público com documentação, e uma
camada de plugins de domínio (layers) que pode ser ligada e desligada por deploy.

## Pessoas e contexto de uso

- **Usuários finais** de cada empresa (tenant): entram por `app.<domínio>`,
  trabalham dentro de uma equipe (`/[team]/...`) com papel `Owner`, `Admin` ou
  `Member`.
- **Dono/operador da plataforma** (`PlatformAdmin`): usa `/admin`, com MFA e
  sessão elevada de 30 minutos.
- **Visitantes**: site público, blog e documentação em `<domínio>`.
- **Desenvolvedores**: usam o Nuxfire como base para novos produtos, criando
  layers em `layers/`.

## Capacidades principais

| Capacidade | Onde vive | Estado verificado |
|---|---|---|
| Identidade e sessão (OpenAuth: senha, código por e-mail, GitHub, Google; MFA TOTP opcional; rate limit de login) | `apps/functions/src/auth.ts`, `apps/login`, `apps/app/server/utils/auth.ts` | Operacional |
| Equipes, convites (expiram em 30 dias), assentos por plano, RBAC (`Owner`/`Admin`/`Member`), suspensão de equipe | `layers/teams` | Operacional |
| Console de plataforma: empresas (listar, detalhar, suspender, reativar), planos, fila/DLQ (com replay), auditoria, notificações globais | `layers/admin`, `layers/billing` (`admin/plans`), `layers/notifications` (`admin/notifications`) | Operacional; MFA + sessão elevada |
| Cobrança: planos em banco, checkout Stripe, checkout Paddle (overlay), webhooks com ledger de idempotência em KV | `layers/billing` (`server/api/webhooks/{stripe,paddle}.post.ts`) | Operacional |
| Notificações no app + tempo real por WebSocket (Durable Object) | `layers/notifications`, `apps/functions/src/websockets.js` | Operacional |
| Jobs em fila com DLQ, cron horário | `infra/jobs.ts`, `infra/cron.ts`, `apps/functions/src/{jobs-consumer,dlq-consumer,cron}.ts` | Operacional (o cron só grava linha em `Log`) |
| E-mail transacional (React Email + Resend; templates `Welcome`, `VerificationCode`, `Invitation`) | `packages/emails`, `apps/functions/src/emails.ts` | Só Resend ativo |
| Site público, blog, FAQ, docs e páginas legais (Nuxt Content v3; busca em docs **e** blog) | `apps/web` | Operacional |
| Kanban (feature layer, desligável em `config.ts`) | `layers/kanban` | Operacional |

## Limites

O que o sistema deliberadamente **não** faz ou **ainda** não tem (cada item foi
verificado ausente no código em 2026-09-18):

- Sem CI/CD: `.github/workflows/` não existe; o deploy é manual (`bun run deploy`).
- Sem assistente/IA: os recursos de IA foram removidos do starter kit.
- Sem assistente de onboarding após o primeiro login.
- Sem lista/baixa de faturas: a aba Billing só cita "invoices" no texto.
- Sem alteração de senha dentro do app: o botão leva ao fluxo "esqueci minha
  senha" no emissor (`account-settings/security.vue`).
- Sem códigos de recuperação de MFA; MFA travado exige edição direta no banco.
- Sem preferências de e-mail por usuário, feed RSS, Sentry/error tracking,
  analytics, impersonação de tenant, allowlist de IP para `/admin`, gráficos de
  MRR/ARR, backup agendado do banco.
- A página pública de preços é estática (não lê os `Plan` do banco).
- O gráfico do dashboard da equipe é ilustrativo (série gerada por *random
  walk*), não dado analítico real.
- i18n: `en`, `pt-BR` e `es` existem nos três apps e nas cinco layers, mas
  `apps/app` só tem a chave `welcome` extraída (o resto do app está em inglês
  fixo); `apps/web` já tem as strings extraídas.
- Testes: Vitest, 7 arquivos / 131 testes (billing, assentos de equipe e
  habilidades de RBAC); sem testes de rotas tRPC nem E2E.

## Contexto técnico

Nuxt 4 + Vue 3 + `@nuxt/ui` v4, tRPC v10, Drizzle + PostgreSQL (Hyperdrive),
OpenAuth.js, `nuxt-authorization`, Pinia, Cloudflare Workers via SST 4, Bun
workspaces (`apps/*`, `packages/*`, `layers/*`). Detalhes verificáveis:
`.specsfy/STACK.md` e `.specsfy/DATABASE.md`. Para trabalhar em cada área, carregue
o especialista correspondente em `fireskills/specialists/` (ver `AGENTS.md`).
