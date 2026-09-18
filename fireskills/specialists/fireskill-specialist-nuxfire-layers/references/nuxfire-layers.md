# Layers do Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento (e o
`_docs/docs/AGENTS.md`, seção "Nuxt Layers architecture", é o registro dos incidentes).

## 1. Modelo

- Domínios de negócio ficam em `layers/<nome>/` (workspace `layers/*`), pacote
  `@nuxfire/layer-<nome>`. Existem hoje: **core** `teams`, `billing`,
  `notifications`, `admin`; **feature** `kanban` (`config.ts`).
- `apps/app` é o **Composition Root**: casca do app (dashboard, conta), a
  composição do tRPC, `nuxt.config.ts` e a infraestrutura central
  (`server/utils/{db,auth,audit-log,mfa-crypto,rate-limit,ws-ticket,user-mfa*}.ts`,
  `app/plugins/websockets.client.ts`, `app/composables/use-notification.ts`,
  `app/components/account/MfaSetupModal.vue`,
  `app/middleware/{0.auth,1.teams}.global.ts`). Não tem lógica de domínio.
- Outros pacotes: `apps/web` (site + docs), `apps/login` (UI de login estática),
  `apps/functions` (Workers), `packages/{emails,tokens,manifest}`.

## 2. Onde se registra uma layer (`config.ts`)

```ts
export const layers = {
  core: ["teams", "billing", "notifications", "admin"] as string[],
  features: { kanban: true } satisfies Record<string, boolean>,
};
```

- **core vs feature é só sobre poder ser desligada, nunca sobre ligação.** Os dois
  vão para o mesmo `activeLayerNames` (`apps/app/nuxt.config.ts`), que alimenta:
  `extends`, o tRPC gerado e a navegação gerada. Para uma layer core,
  **acrescentar o nome em `layers.core` é o registro inteiro**; nada de import à
  mão.
- `layers` decide quais layers Nuxt entram no app; `flags` decide quais
  **recursos Cloudflare** o SST cria. São separados de propósito.
- **"Ativo" tem uma única fonte: `activeLayerNames`.** Nunca decidir "está
  ligada" só pela presença de `layer.manifest.ts` no disco (bug real da Fase 2:
  com `kanban: false`, as páginas saíam mas o router seguia chamável e o menu
  mostrava link para rota inexistente). Qualquer coisa nova que precise saber
  quais layers estão ativas recebe `activeLayerNames` por parâmetro.
- `#nuxfire/config` **não resolve** dentro do `nuxt.config.ts` (jiti não lê
  `paths` do tsconfig): importe `config.ts` e `scripts/compose-layers.ts` por
  caminho relativo ali.

## 3. Composição gerada (`scripts/compose-layers.ts`)

Chamado por `apps/app/nuxt.config.ts` em todo `nuxt dev/build/generate/typecheck/prepare`;
`bun scripts/compose-layers.ts` só serve para inspecionar. Gera dois arquivos —
**nunca editar**:

1. `apps/app/server/trpc/routers/.composition/layer-routers.ts`: layer entra se
   tem `layer.manifest.ts` **e** `server/trpc/router.ts`. Importa
   `routers` de `@nuxfire/layer-<dir>/server/trpc/router`.
2. `apps/app/app/composables/.composition/layer-navigation.ts`: reexporta o
   manifesto de cada layer ativa (`@nuxfire/layer-<dir>/manifest`) para
   `useLayerNavigation()`.

O `name` do manifesto é lido por **regex** no texto (`name: "…"` literal); tem de
ser literal string e igual ao nome da pasta.

## 4. Anatomia de uma layer (referência: `layers/kanban`)

| Caminho | Papel |
|---|---|
| `package.json` | `name`, `exports`, dependências **explícitas** |
| `nuxt.config.ts` | `$meta.name` + `components: [{ path: "./components" }]` |
| `layer.manifest.ts` | `defineLayerManifest({ name, displayName, description, version, requires, navigation, permissions })` (`@nuxfire/manifest`) |
| `app/` | `components/`, `composables/`, `pages/`, `layouts/`, `middleware/`, `plugins/`, `utils/` |
| `server/trpc/router.ts` | exporta `routers` (mapa) |
| `server/database/schema.ts` | tabelas da layer |
| `server/utils/` | utilitários do servidor (auto-importados app-wide, ver §6) |
| `shared/utils/abilities.ts`, `permissions.ts` | habilidades e constantes de permissão |
| `i18n/locales/{en,es,pt-BR}.json` | mensagens da layer |
| `vitest.config.ts`, `vitest.setup.ts` | testes (`shared/**` e `server/**`) |

`exports` do `package.json` (padrão de `kanban`/`teams`):

```json
".": "./nuxt.config.ts",
"./manifest": "./layer.manifest.ts",
"./server/trpc/router": "./server/trpc/router.ts",
"./server/database/schema": "./server/database/schema.ts",
"./shared/*": "./shared/*.ts"
```

- **`exports["."]` deve apontar para `nuxt.config.ts`, não para o manifesto.**
  Apontando para o manifesto, `extends` carregava o manifesto como config do
  Nuxt: nada errava, mas nenhum `nuxt.config.ts` de layer valia (o
  `components.prefix` era inerte). O manifesto vive no subcaminho `./manifest`.
- O coringa precisa da extensão no alvo: `"./shared/*": "./shared/*.ts"`
  (`"./shared/*"` sem extensão resolve para nada em `moduleResolution: bundler`).
- Declare **todo pacote que o código da layer importa diretamente** no
  `package.json` da layer (`drizzle-orm`, `zod`, `@trpc/server`, `@nuxt/ui`,
  `@nuxfire/functions: workspace:*`, `@nuxfire/layer-teams: workspace:*`…). Nunca
  dependa de transitividade (o layout do Bun não é estável).
- Layer **sem** `app/` faz o Nuxt 4 cair para a raiz da layer e incluir todo o
  `server/` no programa TypeScript do cliente: declare `srcDir: "app"` no
  `nuxt.config.ts` enquanto a pasta não existir (e remova quando existir).

## 5. Nomes que colidem (regras que valem para toda layer)

- **Habilidades** (`defineAbility`) levam o **prefixo da layer**:
  `kanbanListBoards`, `teamsDeleteTeam`. `nuxt-authorization` usa o auto-import
  de `shared/utils/` do Nuxt, que é um espaço de nomes único e por nome de
  export; dois exports iguais colidem em silêncio. O prefixo segue a **layer**,
  não a string de permissão. **Chaves de procedure tRPC não são prefixadas**
  (`teams.listMembersAndInvites` é API pública).
- Habilidades da layer se importam por `@nuxfire/layer-<nome>/shared/utils/abilities`
  (`#shared` aponta para `shared/` do app, nunca de layer).
- **Componentes**: o nome registrado vem do **diretório + arquivo**, e o
  prefixo de diretório **de-duplica** contra arquivo que já começa igual
  (`notifications/NotificationsSlideover.vue` → `<NotificationsSlideover>`), mas a
  opção `components.prefix` **não** de-duplica (`prefix: "Kanban"` + `KanbanBoard.vue`
  → `<KanbanKanbanBoard>`). Por isso **nenhuma layer define `prefix`**; só
  `path: "./components"`. Preserve o subcaminho quando o nome registrado depende
  dele (`admin/plans/CreateEditModal.vue` → `<AdminPlansCreateEditModal>`);
  achate só para desfazer repetição. **Confira em `.nuxt/components.d.ts`** antes
  e depois de mover.
- `path` em `components` resolve contra o **`srcDir`** (`layers/<x>/app`), não
  contra `rootDir`: `./components`, nunca `./app/components`.
- **Middleware global não ordena entre layers**: o Nuxt ordena por nome só dentro
  de uma layer e concatena as layers com o Composition Root **por último**. Por
  isso `1.teams.global.ts` fica em `apps/app`, depois de `0.auth.global.ts`.
  Middleware **nomeado** (`definePageMeta({ middleware: "invite" })`) sempre roda
  depois de todos os globais e pode viver na layer.
- **Plugins** têm primitivo de ordem: quem depende de plugin de outra origem
  declara `defineNuxtPlugin({ dependsOn: ["websockets"] })`. Confiar na ordem de
  arquivos deixa de valer quando o arquivo muda de layer. Plugin de WebSocket é
  `.client.ts`; não remova o sufixo.
- **Páginas e layouts se fundem entre layers.** `/{team}/settings` tem um pai em
  `layers/teams` e filhos vindos de três layers. Uma página de layer pode nomear
  `layout`/`middleware` de outra origem (`layout: "dashboard"` do Composition Root;
  `layout: "admin"` de `layers/admin`). Prove no **build** (`dist/server/chunks/virtual/entry.mjs`),
  não só no `nuxt prepare`.

## 6. Backend em layers

- O `server/` de cada layer **é escaneado pelo Nitro**: `server/utils/*.ts`
  viram auto-import do app e podem usar auto-imports como `useDB()`
  (`layers/teams/server/utils/`). **Routers tRPC não** dependem disso: são
  importados como módulos pelo arquivo gerado e importam explicitamente
  `~~/server/trpc/trpc` e `~~/server/utils/db`.
- Schema: linha **escrita à mão** no barrel
  `apps/functions/src/database/schema.ts`, **por especificador de pacote**, e a
  dependência `@nuxfire/layer-<nome>: workspace:*` em `apps/functions/package.json`.
  Ver `$fireskill-specialist-drizzle` (ciclos e o incidente de deploy).
- Layer que só depende de outra, dependa pelo especificador de pacote e declare
  `requires: [...]` no manifesto. **`requires` é documental**: nada valida a
  ordem do `extends`.
- Infra por layer (Durable Object, fila, cron) **fora do escopo**: layers usam o
  que já existe (Postgres/Hyperdrive, KV, R2). O manifesto não tem campo
  `infrastructure` porque nada o leria.
- Desativar uma layer de feature **não apaga tabelas** nem tira o tipo do cliente
  Drizzle: "desativado" = fora da UI.

## 7. Navegação, permissões e i18n

- **Navegação**: `navigation.sidebar` no manifesto, com `label`, `icon`
  (`i-lucide-…`), `to` (`{team}` vira o slug do tenant) e `order`. Layer sem
  entrada de menu **omite** `navigation` (`teams`).
- **Permissões**: strings `layer:recurso:ação` em `permissions` do manifesto; as
  constantes espelham em `shared/utils/permissions.ts`. Linhas reais vivem em
  `Permission` no banco (ex.: `ensureKanbanPermissions`). Ver
  `$fireskill-specialist-nuxt-authorization`.
- **i18n**: três arquivos por layer (`en`, `pt-BR`, `es`); `en.json` é a fonte da
  verdade e as outras têm de ter **exatamente o mesmo conjunto de chaves**.
  `bun run check:i18n` falha em chave faltando ou sobrando. O app usa
  `@nuxtjs/i18n` com `restructureDir: "i18n"`, `strategy: "no_prefix"`,
  locales `en`, `pt-br`, `es`.
- **Testes**: um `vitest.config.ts` + `vitest.setup.ts` na layer basta; o
  agregador (`vitest.config.mts`, `test.projects: ["apps/app", "layers/*"]`)
  descobre sozinho. `defineAbility` é auto-import do Nuxt: o `vitest.setup.ts`
  o coloca em `globalThis`.

## 8. O que NÃO existe

- Validação automática de `requires`/ordem do `extends`.
- Campo de infraestrutura no manifesto.
- Testes de router tRPC ou de componentes de layer (a cobertura é billing,
  assentos de equipe e habilidades).
- `packages/app`: o nome antigo do Composition Root (READMEs de layers antigos
  ainda o citam; hoje é `apps/app`).
