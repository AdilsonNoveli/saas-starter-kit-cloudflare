# Receitas Nuxt 4 no Nuxfire

Cada receita parte de um padrão já existente. Confirme o arquivo de referência;
se divergir, o código vence.

## Nova página de equipe

1. **Onde**: se é de um domínio, na **layer** dona
   (`layers/<x>/app/pages/[[team]]/<x>/…`); só páginas de casca ficam em
   `apps/app/app/pages/`. Modelo: `layers/kanban/app/pages/[[team]]/kanban/`.
2. O nome da rota começa com `team…` (pasta `[[team]]`) — é o que aciona o
   `1.teams.global.ts` (resolve a equipe pelo slug e redireciona para
   `/select-team` se inválida).
3. Layout: `definePageMeta({ layout: "dashboard" })`. Layouts e middleware nomeados
   de outra origem funcionam entre layers (registro único).
4. Dados: `useTrpcClient().<ns>.<proc>.useQuery(() => ({ … }))` com **getter**
   (reexecuta quando a equipe/rota muda). Equipe atual: `useCurrentTeam()`.
5. UI: `$fireskill-specialist-nuxt-ui`; textos por i18n nos três idiomas.
6. Item de menu: `navigation.sidebar` no `layer.manifest.ts` (`{team}` no `to`).
7. Confira que a página some junto com a layer desligada.

## Página pública (sem login)

- `definePageMeta({ auth: false })` — o `0.auth.global.ts` deixa passar (padrão da
  página de convite). Não redirecione com `definePageMeta({ redirect })`.

## Novo middleware

- **Global** (`*.global.ts`): só se **não** depende de ordem em relação a outra
  layer. Se depende (ex.: precisa rodar depois da autenticação), fica em
  `apps/app/app/middleware/` com prefixo numérico.
- **Nomeado**: pode viver na layer; `definePageMeta({ middleware: "nome" })` roda
  depois de todos os globais.
- Em SSR, para chamar a própria API use `useRequestFetch()`.

## Novo plugin

- Cliente-somente: sufixo `.client.ts`.
- Depende de outro plugin (de qualquer origem): `defineNuxtPlugin({ name, dependsOn: ["…"], setup })`.
- Não confie na ordem dos arquivos entre layers.

## Nova rota de servidor

1. `apps/app/server/api/<grupo>/<nome>.<método>.ts`, com `defineEventHandler`.
2. Autenticação: `await getUser(event)` (`server/utils/auth.ts`); recuse cedo se
   `!user.id`.
3. Segredo? `useRuntimeConfig(event)` (sem `public`); defina em `runtimeConfig`
   com `""`, entregue por `vars` em `infra/app.ts` como `NUXT_<NOME>` e falhe
   fechado se vazio.
4. Rota com risco de força bruta, webhook ou MFA: `server/utils/rate-limit.ts`.
5. Banco: `useDB()` (ver `$fireskill-specialist-cloudflare-workers`).
6. Erros: `createError({ status, message })`; log com campos extraídos.
7. Para algo que é chamada de app, prefira uma **procedure tRPC**
   (`$fireskill-specialist-trpc`); rota Nitro é para upload, webhooks, cookies e
   endpoints de sessão.

## Nova variável de ambiente / secret

1. `runtimeConfig` em `nuxt.config.ts` (`public` só se for para o browser).
2. `infra/secret.ts` + `.env.example` + `vars` em `infra/app.ts`
   (`$fireskill-specialist-sst`, receita "Adicionar um secret").
3. Nunca ler `process.env` direto em código de servidor Nuxt.

## Novo idioma/mensagem

- Chave em `en.json` **e** em `pt-BR.json` e `es.json`, da app ou da layer;
  `bun run check:i18n`.

## Verificação mínima antes de concluir

- `bun run typecheck` (`apps/app`) **e**
  `bunx vue-tsc --noEmit -p server/tsconfig.json` (servidor).
- `bun run test`, `bun run check:i18n`.
- Rodar a rota no SSR **e** navegando no cliente; logado, deslogado e com
  deep-link deslogado (deve voltar à página pedida depois do login).
- Mudou middleware, layout ou rota de layer? Provar no `nuxt build`.
- Mudou algo de runtime Worker? Testar em stage (`sst deploy`).
