---
name: fireskill-specialist-nuxfire-layers
description: Criar, registrar, ativar e compor Nuxt Layers no monorepo Nuxfire — `layers/<nome>`, `config.ts` (`layers.core`/`layers.features`), `layer.manifest.ts`, `scripts/compose-layers.ts`, arquivos gerados `.composition/`, exports do `package.json`, prefixos de habilidade/componente, i18n e testes por layer. Use ao criar uma layer, mover código para/de uma layer, ligar/desligar uma layer ou tocar `apps/app/nuxt.config.ts`; específico do Nuxfire (não é o guia genérico de Nuxt Layers).
---

# Nuxfire Layers

## Quando usar

- Acionar ao criar uma layer, decidir se algo vira layer ou fica no
  Composition Root, ligar/desligar layer em `config.ts`, mover páginas,
  componentes, router ou schema entre layers.
- Acionar ao depurar: layer que não carrega, componente com nome estranho,
  ability que colide, rota/menu de layer desligada ainda vivos, middleware global
  em ordem errada.
- Não acionar para o uso de `defineNuxtConfig`/páginas/composables em geral:
  `$fireskill-specialist-nuxt`. Para o conteúdo de uma parte da layer, use o
  especialista dela: `-trpc`, `-drizzle`, `-nuxt-authorization`, `-nuxt-ui`.
- Combinar com `$fireskill-specialist-software-architecture` e
  `$fireskill-specialist-domain-modeling` para decidir **onde** um domínio vive,
  e com `$fireskill-specialist-sst` (`flags` ≠ `layers`).

## Fluxo

1. Ler [references/nuxfire-layers.md](references/nuxfire-layers.md) (o mapa) e,
   para criar, [references/new-layer-recipe.md](references/new-layer-recipe.md).
2. Decidir **core** (sempre ligada) ou **feature** (desligável). Nada mais
   muda por essa escolha: o registro é o mesmo mecanismo.
3. Partir de `layers/kanban` como modelo e adaptar.
4. Registrar em `config.ts`; deixar o `compose-layers` regenerar os arquivos.
5. Validar ligada **e** desligada (seção abaixo).

## Regras principais

- O Composition Root (`apps/app`) não tem lógica de domínio; domínio vai para
  `layers/`.
- Registro de layer core = acrescentar o nome em `layers.core`. Sem import à mão
  em lugar nenhum.
- "Ativa" tem **uma** fonte: `activeLayerNames` (de `config.ts`). Nada decide
  ativação só pelo que existe no disco.
- `exports["."]` do `package.json` = `./nuxt.config.ts`; manifesto em
  `./manifest`; coringa com extensão (`"./shared/*": "./shared/*.ts"`).
- `nuxt.config.ts` da layer: `$meta.name` e `components: [{ path: "./components" }]`.
  **Sem `prefix`**; o nome do componente vem do arquivo (`Kanban*.vue`).
- `name` do manifesto é literal e igual ao nome da pasta (lido por regex).
- `server/trpc/router.ts` exporta `routers` (mapa) com `satisfies`; o gerador
  importa por esse nome fixo.
- Habilidades com prefixo da layer; procedures **sem** prefixo.
- Todo pacote importado pela layer é dependência explícita do seu `package.json`.
- Layer sem `app/` precisa de `srcDir: "app"`.
- Middleware global não se ordena entre layers; o que depende de ordem fica no
  Composition Root. Plugin de layer que depende de outro declara `dependsOn`.
- Schema: linha manual no barrel, por especificador de pacote; nunca relativo.
- Desligar uma layer não apaga tabelas.
- Sem infraestrutura por layer nesta versão (Durable Object, fila, cron): use o
  que já existe.
- i18n com os três idiomas e chaves idênticas (`bun run check:i18n`).
- Nunca editar `.composition/*`.

## Antipadrões

- Decidir "layer ligada" pelo disco (router chamável e link 404 quando desligada).
- `exports["."]` para `layer.manifest.ts`.
- `components.prefix` com arquivo já prefixado; `path: "./app/components"`.
- Habilidade sem prefixo; prefixar procedure tRPC.
- Mover middleware global para uma layer e quebrar o redirect pós-login.
- Depender de transitividade em vez de declarar a dependência.
- Import relativo de `layers/` em `apps/functions`.
- `requires` tratado como validação (é só documentação).
- Levar lógica de domínio de volta ao `apps/app`.
- Criar layer "por organização" sem domínio próprio: layer é unidade de domínio
  ativável, não pasta de conveniência.
- Assumir que `typecheck`/`nuxt prepare` provam que a layer carregou.

## Validação

- Subir o Nuxt: a linha `compose-layers: N active layer(s) […]` lista a layer;
  `.composition/layer-routers.ts` e `layer-navigation.ts` a incluem.
- Ligar/desligar em `config.ts`: páginas, procedure e item de menu somem e voltam
  **juntos**.
- `.nuxt/components.d.ts` com os nomes esperados; prova de que o `nuxt.config.ts`
  carrega: `prefix` absurdo temporário e diff.
- Rotas/layout/middleware cruzando layers: conferir no **build**
  (`dist/server/chunks/virtual/entry.mjs`).
- `bun run typecheck` (`apps/app`), `bunx vue-tsc --noEmit -p server/tsconfig.json`
  (servidor), `bun run test`, `bun run check:i18n`.
- Se `apps/functions` passa a importar da layer: `sst deploy` de teste ou esbuild
  por `handler:`.

## Skills relacionadas

- `$fireskill-specialist-nuxt` — Nuxt 4 em geral.
- `$fireskill-specialist-trpc`, `$fireskill-specialist-drizzle`,
  `$fireskill-specialist-nuxt-authorization`, `$fireskill-specialist-nuxt-ui` —
  cada parte interna da layer.
- `$fireskill-specialist-sst` — `flags` (recursos) vs `layers` (código).
- `$fireskill-specialist-software-architecture` e
  `$fireskill-specialist-domain-modeling` — fronteiras de domínio.
