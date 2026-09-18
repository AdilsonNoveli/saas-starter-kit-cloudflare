# Nuxt 4 no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento; o
`_docs/AGENTS.md` registra os incidentes que originaram várias regras abaixo.

## 1. Versões e apps

- `nuxt` `^4.5.2`; `vue` e `vue-router` estão em **`latest`** (não fixados);
  `typescript ^5`, `vue-tsc ^2.2.10`, `vitest ^5` (`apps/app/package.json`).
- Três apps Nuxt: `apps/app` (aplicação, Composition Root), `apps/web` (site +
  docs, Nuxt Content), `apps/login` (UI estática de login, `nuxt generate`).
  `apps/functions` **não** é Nuxt (Workers).
- Aliases: `~` = `app/` do app; **`~~` = raiz do app** (`apps/app`);
  `@nuxfire/<pacote>/…` entre pacotes. `#nuxfire/config` (o `config.ts` da raiz)
  só resolve em `infra/`/`scripts/`, **não** dentro do `nuxt.config.ts` (jiti não lê
  `paths`): ali, importe por caminho relativo.

## 2. `apps/app/nuxt.config.ts`

- `extends`: as layers ativas (`@nuxfire/layer-<nome>`), vindas de
  `activeLayerNames` (ver `$fireskill-specialist-nuxfire-layers`); antes disso
  chama `composeLayers()`.
- `modules`: `@nuxt/ui`, `@nuxt/eslint`, `@nuxthub/core`, `@nuxt/image`,
  `@nuxt/scripts`, `@nuxtjs/i18n`, `@vueuse/nuxt`, `nuxt-svgo`, `@nuxt/fonts`,
  `@pinia/nuxt`, `nuxt-authorization`.
- `css: ["~/assets/css/main.css"]` (ordem: `tailwindcss` → `@nuxt/ui` →
  `@nuxfire/tokens/theme.css`; ver `$fireskill-specialist-nuxt-ui`).
- `build.transpile: ["trpc-nuxt"]`. `typescript.shim: false`. `devtools` ligado.
- **Nitro**: preset `cloudflare-module`; `cloudflare.nodeCompat: true` (só
  silencia um aviso falso — o `nodejs_compat` real vem do SST);
  `experimental.asyncContext: true` (dá a `useEvent()` contexto por requisição;
  `useDB()` depende disso) e `experimental.tasks: true`.
- **NuxtHub** (`hub: { blob, kv, cache }`, self-hosted): usa `hubBlob()`,
  `hubKV()`, `hubCache()`; **só blob/KV/cache**, banco **não** é `hubDatabase()`.
  Com `hub:` ligado o `@nuxthub/core` força a saída do Nitro para **`dist`** (não
  `.output`).
- **i18n**: `@nuxtjs/i18n` `^10.6.0`, `restructureDir: "i18n"`, `strategy:
  "no_prefix"`, `defaultLocale: "en"`, locales `en`, `pt-br` (arquivo
  `pt-BR.json`, `language: "pt-BR"`), `es`. Arquivos por app **e por layer**;
  `bun run check:i18n` exige o mesmo conjunto de chaves entre idiomas.
- `svgo`: `componentPrefix: "icon"`, `autoImportPath: "~/assets/icons"` (SVG próprio
  vira componente `<Icon…>`); ícones de coleção usam `i-lucide-*`.
- `fonts`: `Montserrat` (Google) — a Geist vem do `theme.css`.

### `runtimeConfig`

- `public`: `authUrl`, `authClientID`, `websocketsEndpoint`, `paddleClientToken`,
  `paddleEnvironment` (default `"sandbox"`).
- Servidor apenas: `stripeSecretKey`, `stripeWebhookSecretKey`, `paddleApiKey`,
  `paddleWebhookSecret`, `paddleSandbox`, `wsTicketSecret`, `authAdminSecret`,
  `platformMfaSessionSecret` (≥32 chars), `platformAdminEncryptionKey`,
  `userMfaSessionSecret`, `userMfaEncryptionKey`.
- Todos são sobrescritos por variável `NUXT_<CAMEL_EM_MAIÚSCULAS>` /
  `NUXT_PUBLIC_…`, definidas em `infra/app.ts` (`vars`). Valor vazio de segredo
  faz a rota correspondente **falhar fechada**. Só o que é público leva
  `NUXT_PUBLIC_`.

## 3. Estrutura do Composition Root (`apps/app`)

| Caminho | Conteúdo real |
|---|---|
| `app/app.vue` | `<UApp>` + `NuxtLoadingIndicator` + `NuxtLayout` + `NuxtPage` + `<ConfirmDialog />` |
| `app/layouts/` | `dashboard.vue` (sidebar de equipe), `page.vue`; o layout `admin` vem de `layers/admin` |
| `app/pages/` | `[[team]]/dashboard.vue`, `account-settings*` , `[...path].vue` (catch-all) |
| `app/middleware/` | `0.auth.global.ts`, `1.teams.global.ts` |
| `app/plugins/` | `authorization-resolver.ts`, `websockets.client.ts` |
| `app/composables/` | `use-trpc-client.ts`, `use-notification.ts`, `use-dashboard.ts`, `useLayerNavigation.ts` |
| `app/utils/` | `auth.ts` (`useSession`), `date.ts`, `plan-tier.ts`, `team-status.ts`, `title-case.ts` |
| `app/components/` | `ConfirmDialog.vue`, `account/`, `avatar/`, `background/`, `layout/`, `loader/`, `notifications/`, `settings/`, `team-dashboard/` |
| `server/api/` | `auth/*`, `mfa/*`, `trpc/[trpc].ts`, `upload/profile-picture.ts`, `profile-pictures.get.ts` |
| `server/middleware/` | `csp.ts` |
| `server/plugins/` | `authorization-resolver.ts`, `database-binding.ts` |
| `server/utils/` | `audit-log`, `auth`, `db`, `mfa-crypto`, `rate-limit`, `user-mfa-session`, `user-mfa`, `ws-ticket` |
| `server/trpc/` | ver `$fireskill-specialist-trpc` |

Regra: **domínio vai para layer**; o Composition Root guarda só casca, composição
do tRPC, `nuxt.config.ts` e a infraestrutura central.

## 4. Sessão, middleware e roteamento (com os incidentes)

- **`useSession()`** (`app/utils/auth.ts`): `useState("nuxfire-session")`,
  `refresh()` e `clear()`.
- **`0.auth.global.ts`**: ignora `/api`; rota opta por sair com
  `definePageMeta({ auth: false })` (ex.: página de convite); consulta
  `/api/auth/session`; sem sessão, guarda `redirect` e vai ao emissor
  (`client.authorize(callback, "code")` + `navigateTo(url, { external: true })`).
  **No SSR use `useRequestFetch()`**, não `$fetch`/`useFetch` puro: o despacho
  interno genérico do Nitro não leva os cookies da requisição e travou
  indefinidamente todas as páginas.
- **`1.teams.global.ts`** fica no Composition Root **de propósito**: middleware
  global não se ordena entre layers (layers primeiro, Composition Root por
  último); dentro de uma layer ele rodava antes da autenticação e o retorno pós-login
  virava `/select-team`. Só chega a rotas cujo nome começa com `team`.
- **`[...path].vue`** (catch-all, atende `/`): redireciona com
  **middleware imperativo** (`definePageMeta({ middleware: [() => navigateTo("/dashboard")] })`),
  **não** com `definePageMeta({ redirect })`, que corria contra o redirect externo
  do middleware de auth e travava o SSR de `/`.
- Rotas do `apps/login` (`/login/**`, `/signup/**`, `/forgot-password/**`) têm
  `routeRules: { ssr: false }` porque são pré-renderizadas **e** dirigidas por
  query string; não remova.
- Sidebar: `useLayerNavigation()` lê os manifestos gerados; o `{team}` do `to` é
  substituído por quem chama (`layouts/dashboard.vue`).

## 5. Servidor (Nitro) em Workers

- `server/plugins/database-binding.ts`: captura o binding `AppDB` a cada
  requisição e fecha o cliente em `afterResponse`/`error` via
  `context.waitUntil(...)` (ver `$fireskill-specialist-cloudflare-workers`).
- `server/plugins/authorization-resolver.ts`: injeta o usuário do servidor para o
  `nuxt-authorization`.
- **O `server/` de cada layer é escaneado pelo Nitro**: `server/utils/*.ts` viram
  auto-import (e podem usar `useDB()`); routers tRPC **não** dependem disso.
- `server/middleware/csp.ts` envia `Content-Security-Policy-Report-Only`
  (ainda **não** aplica): `script-src 'self' https://cdn.paddle.com`,
  `frame-src https://*.paddle.com`, etc. Ao integrar novo script/iframe de
  terceiro, ajuste a política; quando a observação em produção estiver limpa, o
  passo seguinte é trocar o nome do header para `Content-Security-Policy`.
- Upload: `hubBlob().handleUpload(event, { formKey: "files", ensure: { types: ["image/jpeg","image/png"], maxSize: "2MB" }, put: { prefix, addRandomSuffix: true } })`.
- Logs: nunca `console.error(erroCru)` em código de Worker (`message`/`stack` não
  são enumeráveis e saem como `{}`); extraia os campos.
- Rate limit de webhooks e MFA: `server/utils/rate-limit.ts` (`hubKV()`).

## 6. Cliente

- tRPC: `useTrpcClient()` (ver `$fireskill-specialist-trpc`); estado
  compartilhado: Pinia (`$fireskill-specialist-pinia`); toast/confirmação:
  `useNotification()` (`success`/`error`/`info`/`confirm`).
- `websockets.client.ts`: plugin `parallel`, `.client` **obrigatório** (código que
  rodasse no servidor derrubou o SSR de todos os visitantes); obtém um **ticket**
  curto em `/api/auth/ws-ticket` e o envia no `Sec-WebSocket-Protocol`; a API
  `$ws` (`subscribe`/`unsubscribe`/`on`/`off`) é a base para plugins de layer, que
  usam `dependsOn: ["websockets"]`.
- Atalhos: `defineShortcuts` em `useDashboard()` (`createSharedComposable`).
- Ícones: `i-lucide-*`; UI: `$fireskill-specialist-nuxt-ui`.

## 7. Build e verificação

- `bun run build` (em `apps/app`) executa antes `clean:build-cache`, que apaga
  `.nuxt`, `.output` e **`.data`**: o `nuxi cleanup` não limpa `.data`, e um
  rename de locale (`pt-BR` → `pt-br`) já subiu com bundle de mensagens velho,
  caindo em inglês em silêncio. Não remova esse passo.
- `postinstall: nuxt prepare`.
- **`nuxt typecheck` não checa o servidor.** Rode também
  `bunx vue-tsc --noEmit -p server/tsconfig.json` em `apps/app`.
- `nuxt prepare` **não** prova ordem de middleware, mapa de layouts ou rotas
  fundidas de layers: prove no `nuxt build` (`dist/server/chunks/virtual/entry.mjs`).
- Testes: Vitest (`bun run test` na raiz; `apps/app` está em `test.projects`, hoje
  sem suítes próprias).
- Dev: `bun run app` na raiz (`sst shell -- bun scripts/dev.ts app`) injeta os
  secrets/URLs do stage; `nuxt dev` puro em `apps/app` não tem os bindings.

## 8. Não existe / não assuma

- `hubDatabase()`, Prisma, SSR de páginas de login, Redux/Vuex.
- Suítes de teste de componentes e de rotas do `apps/app`.
- Middleware global dentro de layer com dependência de ordem.
- Enforcement de CSP (hoje só relatório).
