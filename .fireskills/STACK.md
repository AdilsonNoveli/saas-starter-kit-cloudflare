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

O detalhe técnico de cada item está no especialista correspondente (`fireskills/specialists/`). Aqui ficam só as decisões que o código não deixa óbvias.

- **Runtime**: Cloudflare Workers via SST, sem `wrangler.toml`, sem Docker, sem servidor Linux.
- **Banco**: PostgreSQL por Hyperdrive com Drizzle (ver `.fireskills/DATABASE.md`). Não é `hubDatabase()` nem Prisma.
- **Autenticação**: OpenAuth.js em Worker próprio (`PasswordProvider` + `CodeProvider`, mais GitHub e Google quando há credenciais). Não é NextAuth/Lucia/Clerk.
- **Autorização**: `nuxt-authorization` (estilo Bouncer, `defineAbility`); não é CASL.
- **KV e cache**: `hubKV()`/`hubCache()` do NuxtHub.
- **E-mail**: React Email; Resend ativo. Mailgun, SES, SparkPost e SMTP existem no fork do mailer (`packages/emails/mailer`), desligados em `config.ts` e comentados em `apps/functions/src/emails.ts`.
- **React** só existe em `packages/emails`; a UI do produto é Vue.
- **Testes**: Vitest; sem Playwright nem Cypress.
