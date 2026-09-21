# Projeto

## História e motivação

Descreva a origem do projeto, o problema que motivou sua criação e os marcos de evolução.

## Finalidade

Explique o que o sistema realiza e o valor central que entrega.

## Pessoas e contexto de uso

Registre as personas, as permissões e os ambientes em que interagem com o produto.

## Capacidades principais

Base fornecida pelo starter kit Nuxfire (Nuxt 4 + Cloudflare Workers + SST). Acrescente aqui as capacidades do seu produto.

| Capacidade | Onde vive |
|---|---|
| Identidade e sessão: OpenAuth (senha, código por e-mail, GitHub, Google), MFA TOTP opcional, rate limit de login | `apps/functions/src/auth.ts`, `apps/login`, `apps/app/server/utils/auth.ts` |
| Equipes, convites (expiram em 30 dias), assentos por plano, RBAC `Owner`/`Admin`/`Member`, suspensão de equipe | `layers/teams` |
| Console de plataforma (`/admin`, MFA + sessão elevada de 30 minutos): empresas, planos, fila/DLQ com replay, auditoria, notificações globais | `layers/admin`, `layers/billing`, `layers/notifications` |
| Cobrança: planos em banco, checkout Stripe e Paddle, webhooks com ledger de idempotência em KV | `layers/billing` |
| Notificações no app e em tempo real (WebSocket/Durable Object) | `layers/notifications`, `apps/functions/src/websockets.js` |
| Jobs em fila com DLQ e cron horário (o cron só grava uma linha em `Log`) | `infra/jobs.ts`, `infra/cron.ts`, `apps/functions/src/` |
| E-mail transacional (React Email; só o Resend está ativo) | `packages/emails`, `apps/functions/src/emails.ts` |
| Site público, blog, docs e páginas legais (Nuxt Content v3) | `apps/web` |
| Kanban (feature layer desligável em `config.ts`) | `layers/kanban` |

## Limites

O que o starter não faz ou ainda não tem (ausência verificada no código):

- Sem CI/CD: `.github/workflows/` não existe; o deploy é manual.
- Sem lista nem download de faturas: a aba Billing só cita "invoices" no texto.
- Sem troca de senha dentro do app: o botão leva ao fluxo "esqueci minha senha" do emissor.
- Sem códigos de recuperação de MFA; MFA travado exige edição direta no banco.
- Sem feed RSS, error tracking (Sentry etc.), impersonação de tenant, allowlist de IP em `/admin` nem gráficos de MRR/ARR.
- Analytics: a página de documentação é "coming soon".
- A página de preços do site (`LandingPricing.vue`) é estática; não lê os `Plan` do banco.
- O gráfico do dashboard da equipe é ilustrativo (random walk), não dado real.
- i18n: `apps/app` só extraiu a chave `welcome`; o resto da interface está em inglês fixo.

## Contexto técnico

Detalhes verificáveis em `.fireskills/STACK.md` e `.fireskills/DATABASE.md`. Para cada área, carregue o especialista correspondente em `fireskills/specialists/` (ver `AGENTS.md`).
