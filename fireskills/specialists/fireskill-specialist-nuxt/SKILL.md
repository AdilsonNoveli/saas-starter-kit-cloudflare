---
name: fireskill-specialist-nuxt
description: Construir e revisar o app Nuxt 4 do Nuxfire — páginas, layouts, middleware (global e nomeado), plugins, composables, rotas de servidor Nitro, `runtimeConfig`, i18n, SSR e as particularidades de rodar Nitro em Cloudflare Workers (`cloudflare-module`, NuxtHub, `asyncContext`). Use ao tocar `apps/app`, `apps/login`, `apps/web` ou `apps/app/nuxt.config.ts`, ou ao depurar SSR, hidratação, redirecionamento e ordem de middleware; componentes de UI são do `$fireskill-specialist-nuxt-ui` e o mecanismo de layers é do `$fireskill-specialist-nuxfire-layers`.
---

# Nuxt 4 (Nuxfire)

## Quando usar

- Acionar ao criar/alterar página, layout, middleware, plugin, composable, rota
  `server/api`, plugin Nitro, `runtimeConfig` ou configuração de módulo.
- Acionar ao depurar SSR que trava, hidratação divergente, redirect em loop, ordem
  de middleware, variável de ambiente que não chega ao Worker ou build que sobe
  com cache velho.
- Não acionar para componentes `U*`/tema (`$fireskill-specialist-nuxt-ui`), para
  criar/ligar layer (`$fireskill-specialist-nuxfire-layers`), para procedures
  (`$fireskill-specialist-trpc`) nem para stores (`$fireskill-specialist-pinia`).
- Combinar com `$fireskill-specialist-cloudflare-workers` (Nitro em Workers),
  `$fireskill-specialist-openauth` (sessão/login),
  `$fireskill-specialist-web-accessibility` e
  `$fireskill-specialist-performance-engineering`.

## Fluxo

1. Ler [references/nuxfire-nuxt.md](references/nuxfire-nuxt.md); para uma tarefa
   comum, [references/recipes.md](references/recipes.md).
2. Decidir **onde** o código mora: domínio → layer; casca/infraestrutura central →
   `apps/app`.
3. Achar uma página/middleware/plugin parecido e seguir o padrão.
4. Implementar pensando nos **dois** ambientes: SSR (Worker) e cliente.
5. Validar logado, deslogado e em deep-link (seção abaixo).

## Regras principais

- `~~` é a raiz do app; `#nuxfire/config` **não** resolve no `nuxt.config.ts`
  (use caminho relativo).
- Lógica de domínio vai para `layers/`; o Composition Root fica com casca,
  composição do tRPC, `nuxt.config.ts` e infraestrutura central.
- Segredo entra por `runtimeConfig` **sem** `public` e por `NUXT_<NOME>`;
  só o público leva `NUXT_PUBLIC_`; segredo vazio → a rota **falha fechada**.
  Nunca ler `process.env` em código de servidor Nuxt.
- Em SSR, chamada à própria API usa `useRequestFetch()`; `$fetch`/`useFetch` puros
  não levam cookies e já travaram todas as páginas.
- Middleware global não se ordena entre layers; o que depende de ordem
  (`0.auth`, `1.teams`) fica em `apps/app/app/middleware/`. Middleware nomeado pode
  ficar em layer.
- Redirecionar de uma rota-catch-all/`/` com **middleware imperativo**, não com
  `definePageMeta({ redirect })`.
- Página pública: `definePageMeta({ auth: false })`.
- Plugin só de cliente leva `.client.ts`; plugin que depende de outro declara
  `dependsOn`.
- `apps/login`: rotas de login/cadastro/recuperação mantêm `ssr: false`.
- Nitro em Workers: preset `cloudflare-module`, `asyncContext` ligado, saída em
  `dist` por causa do `hub:`; não cachear objeto de I/O em módulo.
- Rota de servidor autentica com `getUser(event)`; rate limit em rotas sensíveis;
  erro via `createError`; nunca logar `Error` cru.
- Dados de tela: `useTrpcClient().….useQuery(() => ({…}))` com getter; toast e
  confirmação: `useNotification()`.
- i18n com os três idiomas e chaves idênticas (`bun run check:i18n`).
- CSP hoje é **Report-Only** (`server/middleware/csp.ts`): nova integração de
  terceiro (script, iframe, conexão) atualiza a política.
- `vue` e `vue-router` estão em `latest`: ao depurar comportamento estranho após
  `bun install`, confira a versão resolvida.

## Antipadrões

- `useFetch`/`$fetch` para `/api/...` em middleware SSR.
- `definePageMeta({ redirect })` em `/` ou em catch-all.
- Mover `1.teams.global.ts`/`0.auth.global.ts` para uma layer.
- `localStorage`/`window` em setup/`state()` executado no servidor.
- Plugin de WebSocket sem `.client`.
- Segredo sob `NUXT_PUBLIC_` ou lido de `process.env`.
- Remover `ssr: false` das rotas de login "para corrigir" hidratação.
- Remover `clean:build-cache` do build (o `.data` velho já publicou locale
  antigo).
- Confiar em `nuxt typecheck` para o servidor, ou em `nuxt prepare` para provar
  ordem de middleware.
- Cliente de banco/objeto de I/O em variável de módulo.
- Chamar `hubDatabase()`: o banco é Postgres via Hyperdrive.
- Endpoint Nitro para o que deveria ser procedure tRPC tipada.
- Trocar `Content-Security-Policy-Report-Only` por enforcing sem observar tráfego.

## Validação

- `bun run typecheck` em `apps/app` **e**
  `bunx vue-tsc --noEmit -p server/tsconfig.json` (servidor).
- `bun run test` (Vitest) e `bun run check:i18n` na raiz.
- Página nova: SSR e navegação no cliente, temas claro/escuro, deslogado (deve ir
  ao login e **voltar** à página pedida), logado sem acesso à equipe (`/select-team`).
- Mudou middleware/layout/rotas de layer: verificar no `nuxt build`
  (`dist/server/chunks/virtual/entry.mjs`).
- Sem aviso de hidratação no console; sem `localStorage is not defined` no log do
  servidor.
- Variável nova: chega ao Worker (stage real) e a rota falha fechada quando vazia.
- Mudança de runtime Worker: `sst deploy` num stage de teste.

## Skills relacionadas

- `$fireskill-specialist-nuxt-ui` — componentes, tema, formulários, tabelas.
- `$fireskill-specialist-nuxfire-layers` — layers e composição.
- `$fireskill-specialist-trpc` — API tipada.
- `$fireskill-specialist-pinia` — estado compartilhado.
- `$fireskill-specialist-openauth` — sessão, login, cookies.
- `$fireskill-specialist-cloudflare-workers` — runtime e bindings.
- `$fireskill-specialist-sst` — variáveis, secrets e deploy.
- `$fireskill-specialist-typescript` — tipos.
