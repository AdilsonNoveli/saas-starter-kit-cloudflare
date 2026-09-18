# Receita: criar uma layer nova

Ponto de partida: copie `layers/kanban` (feature enxuta com página, router,
schema, habilidades, i18n e testes) e adapte. Confirme cada passo no código; se
divergir, o código vence.

## Passos

1. **Pasta e pacote** — `layers/<nome>/` com `package.json`
   (`"name": "@nuxfire/layer-<nome>"`, `"private": true`, `"type": "module"`,
   `exports` como em `nuxfire-layers.md` §4, dependências explícitas). Dependa de
   `@nuxfire/functions: workspace:*`, `@nuxfire/manifest: workspace:*` e, se o
   domínio é por tenant, `@nuxfire/layer-teams: workspace:*`.
2. **`nuxt.config.ts`** — só `$meta: { name: "<nome>" }` e
   `components: [{ path: "./components" }]` (sem `prefix`). Sem pasta `app/` ainda?
   Acrescente `srcDir: "app"`.
3. **`layer.manifest.ts`** — `defineLayerManifest` com `name` **literal e igual à
   pasta**, `requires`, `navigation.sidebar` (omita se não há item de menu) e
   `permissions` (`<layer>:<recurso>:<ação>`).
4. **Permissões e habilidades** — `shared/utils/permissions.ts` e
   `shared/utils/abilities.ts` com **todo export prefixado por `<nome>`**; teste em
   `abilities.test.ts`. Ver `$fireskill-specialist-nuxt-authorization`.
5. **Schema** (se houver tabelas) — `server/database/schema.ts`; linha no barrel
   `apps/functions/src/database/schema.ts` por **especificador de pacote**;
   `@nuxfire/layer-<nome>: workspace:*` em `apps/functions/package.json`;
   `bun install`. Ver `$fireskill-specialist-drizzle`.
6. **tRPC** (se houver API) — `server/trpc/router.ts` exportando
   `routers = { <chave>: <router> } satisfies Record<string, AnyRouter>`. Ver
   `$fireskill-specialist-trpc`.
7. **Front** — `app/pages/[[team]]/<nome>/…`, componentes nomeados
   `<Nome>*.vue` (o nome do arquivo já traz o prefixo), composable com a fatia do
   cliente tRPC. Componentes de UI: `$fireskill-specialist-nuxt-ui`.
8. **i18n** — `i18n/locales/{en,es,pt-BR}.json` com o **mesmo** conjunto de chaves
   (uma chave-raiz `<nome>`).
9. **Testes** — `vitest.config.ts` e `vitest.setup.ts` (copiar de `kanban`);
   nada a registrar no agregador.
10. **Ativar** — `config.ts`: `layers.core` (sempre ligada) ou `layers.features`
    (`<nome>: true`, desligável).
11. `bun install` para o Bun criar o link de workspace.

## Verificação (não confie só em "typecheck passou")

- Suba o Nuxt uma vez: as linhas de `compose-layers: N active layer(s) […]` devem
  listar a layer, e `.composition/layer-routers.ts` e `layer-navigation.ts`
  devem tê-la.
- Desligue a layer (`false`) e confirme que **somem** as páginas, a procedure
  tRPC e o item de menu **juntos**. Ligue de novo.
- `.nuxt/components.d.ts`: os nomes registrados são os esperados (sem
  `<FooFooBar>`). Para provar que o `nuxt.config.ts` da layer carrega, ponha um
  `prefix` absurdo temporariamente e veja o diff; depois remova.
- Rota, layout e middleware por nome funcionam a partir de outra origem: prove
  no **build** (`dist/server/chunks/virtual/entry.mjs`), não no `nuxt prepare`.
- `bun run typecheck` em `apps/app` **e**
  `bunx vue-tsc --noEmit -p server/tsconfig.json` em `apps/app` (o `nuxt
  typecheck` não cobre o servidor).
- `bun run test` (Vitest) e `bun run check:i18n`.
- Se mexeu em algo que `apps/functions` importa de `layers/`: um `sst deploy`
  em stage de teste, ou `bunx esbuild <handler> --bundle --platform=node` para
  cada `handler:` de `infra/*.ts`.

## Erros comuns

| Sintoma | Causa |
|---|---|
| `nuxt.config.ts` da layer parece ignorado | `exports["."]` aponta para o manifesto |
| Componentes da layer somem | `path: "./app/components"` (deve ser `./components`) |
| `<KanbanKanbanBoard>` | `components.prefix` definido, com arquivo já prefixado |
| Ability "não existe"/colide | Nome sem prefixo da layer |
| Layer desligada mas rota/menu vivos | Algo decidiu "ativo" só pelo disco |
| `Could not resolve …/layers/…` no deploy | Caminho relativo no barrel do schema |
| Redirect estranho pós-login | Middleware global movido de `apps/app` para a layer |
| `bun install` reclama de ciclo | Não reclama: `teams` ⇄ `billing` já são ciclo de workspace |
