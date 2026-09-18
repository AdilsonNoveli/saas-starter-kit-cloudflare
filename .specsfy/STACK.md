# Stack do sistema

Documente tecnologias estruturais e a evidência executável que confirma cada
uma. Preserve decisões humanas nas seções livres deste arquivo.

## Inventário detectado

<!-- specsfy:stack:start -->
| Camada | Tecnologia | Evidência |
| --- | --- | --- |
| Framework | Nuxt | `package.json` (workspaces) |
| Biblioteca | @nuxt/ui | `package.json` (workspaces) |
| API | tRPC (trpc-nuxt) | `package.json` (workspaces) |
| Persistência | Drizzle ORM | `package.json` (workspaces) |
| Estado | Pinia | `package.json` (workspaces) |
| Runtime | Cloudflare Workers (SST) | `sst.config.ts` |
| Biblioteca | React | `package.json` |
| Runtime | Node.js | `package.json` |
<!-- specsfy:stack:end -->

## Decisões e observações do projeto

Fonte: `_docs/docs/AGENTS.md` e `CURRENT_STATE.md`, **conferidas contra o código em
2026-09-18** (divergências em `fireskills/MIGRACAO-DOCS.md`). O detalhe técnico de
cada item está no especialista correspondente (`fireskills/specialists/`).

### Versões observadas

| Item | Versão | Evidência |
|---|---|---|
| Nuxt | `^4.5.2` | `apps/app/package.json` |
| `@nuxt/ui` | `^4.8.1` (instalada 4.11.0) | `apps/app/package.json`, `node_modules` |
| tRPC / `trpc-nuxt` | `^10.45.4` / `^0.10.22` | `apps/app/package.json` |
| Drizzle ORM / Kit / postgres.js | `^0.45.2` / `^0.31.10` / `^3.4.5` | `apps/functions/package.json` |
| SST | `4.14.0` | `package.json` |
| OpenAuth.js | `^0.3.6` (patch 0.3.9) | `apps/functions/package.json`, `patches/` |
| Stripe / Paddle Node SDK | `^17.5.0` / `^2.4.0` | `layers/billing/package.json` |
| Nuxt Content | `^3.16.0` | `apps/web/package.json` |
| Vitest | `^5.0.0` | `package.json` |
| Bun | 1.4.0 (local) | `bun --version`; `bunfig.toml` com `linker = "hoisted"` |

`vue` e `vue-router` estão em `latest` no `apps/app/package.json`.

### Decisões de stack (o que é e o que NÃO é)

- **Runtime**: Cloudflare Workers via SST, sem `wrangler.toml`, sem Docker, sem
  servidor Linux. Deploy por `bun run deploy -- --stage <stage>`; **não há CI/CD**.
- **Banco**: PostgreSQL por Cloudflare Hyperdrive, ORM Drizzle
  (`drizzle-orm/postgres-js`). Não é D1 (o D1 `DB` serve só ao `@nuxt/content` do
  `apps/web`), não é `hubDatabase()`, não é Prisma. **Não existe tabela de sessão**:
  sessões e credenciais ficam no KV `AuthKV`.
- **Autenticação**: OpenAuth.js em Worker próprio (`PasswordProvider` +
  `CodeProvider`, mais GitHub e Google quando há credenciais). Não é
  NextAuth/Lucia/Clerk.
- **Autorização**: `nuxt-authorization` (estilo Bouncer, `defineAbility`); não é
  CASL. A autoridade de plataforma (`platformAdminProcedure`) é um sistema
  separado do RBAC de equipe.
- **Armazenamento de arquivos**: `hubBlob()` do NuxtHub, que usa Cloudflare R2
  (API compatível com S3). KV/Cache: `hubKV()`/`hubCache()`.
- **E-mail**: React Email + Resend ativo; transportes Mailgun/SES/SparkPost/SMTP
  existem no fork do mailer (`packages/emails/mailer`) mas estão desligados em
  `config.ts` e comentados em `apps/functions/src/emails.ts`.
- **Pagamentos**: Stripe **e** Paddle, ambos ativos (`config.ts`).
- **React** só existe em `packages/emails` (React Email); a UI do produto é Vue.
- **Testes**: Vitest (7 arquivos, 131 testes); sem Playwright/Cypress.
- **Recursos de IA**: removidos do starter kit.
- **Layers**: `teams`, `billing`, `notifications`, `admin` (core) e `kanban`
  (feature), registradas em `config.ts`.
- **Workspaces**: `apps/*` (`app`, `web`, `login`, `functions`), `packages/*`
  (`emails`, `manifest`, `tokens`) e `layers/*`.
