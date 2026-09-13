# NuxFire — Arquitetura Enterprise-Grade baseada em Nuxt 4 Layers

> **Status:** Plano auditado e validado em 2026-09-13. Ver [Registro de Decisões](#registro-de-decisões-da-auditoria) para o que mudou em relação à primeira versão e por quê.

Plano para transformar o NuxFire na arquitetura fullstack Nuxt mais robusta e modular do mercado, utilizando **Nuxt 4 Layers** como unidades autônomas de domínio de negócio (Kanban, Calendar, Billing, etc.), ativáveis ou desativáveis no deploy.

---

## Registro de Decisões da Auditoria

A primeira versão deste documento foi confrontada com o código real (schema Drizzle, `useDB()`, `context.ts`, `config.ts`/`flags`, `infra/*.ts`, o módulo `nuxt-authorization`, o router de admin já existente). Três decisões foram tomadas para fechar os gaps encontrados:

1. **Infraestrutura por layer (Durable Objects, Queues, Cron) fica fora da v1.** Layers novas usam apenas o que já existe (Postgres via Hyperdrive, KV, R2). O campo `infrastructure` do manifesto original não tinha nenhum código lendo ele em `infra/*.ts` — era decorativo. Provisionamento condicional de recursos Cloudflare continua sendo feito do jeito que já funciona hoje: pelas `flags` de `config.ts`, direto nos arquivos `infra/*.ts`. Quando uma layer realmente precisar de infra própria (ex: `layer-chat` com Durable Object), isso é tratado como projeto à parte, não como parte deste plano.
2. **Schema Drizzle: barrel file agregador condicional.** `packages/functions/src/database/schema.ts` deixa de ser um arquivo só com todas as tabelas — passa a reexportar (`export *`) o schema de cada layer, condicionado pelas mesmas flags que controlam o build. Isso mantém `useDB()` funcionando sem mudança (continua importando um módulo `schema` único), enquanto cada layer é dona do arquivo-fonte das suas tabelas.
3. **Ordem de extração da Fase 3: `teams` primeiro.** `teams` é dependência transversal de billing, notifications e admin — extraí-lo por último obrigaria as outras layers a apontar temporariamente para `packages/app` e depois serem re-cabeadas. Dentro da nova ordem, `admin` continua saindo por último: seu próprio router ([admin/index.ts](file:///c:/nuxfire/packages/app/server/trpc/routers/admin/index.ts)) já importa `plans`, `queue`, `notifications` e `auditLog` como sub-routers — ou seja, admin é estruturalmente uma camada de agregação/consumo de outros domínios, não uma folha. Extraí-lo cedo forçaria reescrever seus imports duas vezes.

Outros ajustes menores incorporados ao plano abaixo: convenção de nomenclatura para *abilities* (evita colisão de auto-import entre layers), separação clara entre `core` (sempre ativo) e `features` (toggleable) em `config.ts`, e documentação explícita dos dois limites aceitos: dado órfão quando uma layer é desativada em produção, e contexto tRPC (`createContext()`) permanecendo centralizado.

---

## Esclarecimento: NuxFire **já é** um monorepo

O [package.json](file:///c:/nuxfire/package.json) declara:

```json
"workspaces": ["packages/*"]
```

Isso é um **monorepo Bun** com 6 workspace packages. O que falta é a **arquitetura de domínios plugáveis** dentro desse monorepo. No ecossistema oficial do Nuxt 4, o padrão nativo para criar essas fatias completas de aplicação (UI, rotas, regras de negócio) chama-se **Nuxt Layers**.

> [!IMPORTANT]
> **Layers cuidam do frontend (Nuxt `extends`); o backend usa import explícito entre workspace packages.** Isso é uma decisão consciente, não uma limitação escondida: o merge automático de `server/` do Nitro entre layers existe, mas compor tipos de tRPC (routers, contexto) e o client único do Drizzle funciona melhor com import explícito — é o mesmo padrão que [admin/index.ts](file:///c:/nuxfire/packages/app/server/trpc/routers/admin/index.ts) já usa hoje, só que entre pacotes em vez de arquivos vizinhos.

---

## Visão da Arquitetura Alvo (Nuxt Layers)

```text
nuxfire/                              ← Monorepo raiz (Bun workspaces)
│
├── packages/                         ← Aplicações & pacotes de infraestrutura fixa
│   ├── app/                          ← Composition Root (shell fino da aplicação)
│   ├── web/                          ← Site público de marketing/docs
│   ├── auth-frontend/                ← UI de autenticação estática
│   ├── functions/                    ← Workers (auth issuer, emails, jobs, WS) + schema agregador
│   ├── emails/                       ← Templates React Email
│   └── design-tokens/                ← Tokens visuais compartilhados
│
├── layers/                           ← Nuxt 4 Feature Layers (Domínios de Negócio)
│   ├── teams/                        ← @nuxfire/layer-teams        [core — sempre ativa]
│   ├── billing/                      ← @nuxfire/layer-billing      [core — sempre ativa]
│   ├── notifications/                ← @nuxfire/layer-notifications [core — sempre ativa]
│   ├── admin/                        ← @nuxfire/layer-admin        [core — sempre ativa]
│   ├── kanban/                       ← @nuxfire/layer-kanban       [feature — opcional]
│   ├── calendar/                     ← @nuxfire/layer-calendar     [feature — opcional]
│   └── ...futuras layers
│
├── infra/                            ← SST infrastructure-as-code (inalterado por este plano)
├── config.ts                         ← core (fixo) + features (toggleable) + flags de infra
└── sst.config.ts                     ← Auto-imports infra/*.ts
```

**Workspaces configurados** no `package.json` raiz:

```json
"workspaces": ["packages/*", "layers/*"]
```

---

## O Contrato de uma Nuxt Layer

Cada feature layer segue uma **estrutura padronizada**, funcionando como uma mini-aplicação autônoma:

```text
layers/kanban/                        ← @nuxfire/layer-kanban
│
├── app/                              ← Frontend (convenção nativa Nuxt 4 app/)
│   ├── components/
│   │   └── Kanban*.vue               ← Prefixo obrigatório = nome da Layer
│   ├── composables/
│   │   └── useKanban.ts
│   ├── pages/
│   │   └── [[team]]/
│   │       └── kanban/
│   │           ├── index.vue
│   │           └── [boardId].vue
│   └── middleware/
│       └── kanban-feature-gate.ts    ← Runtime guard (plano/tier do tenant)
│
├── server/
│   ├── trpc/
│   │   └── router.ts                 ← Exporta kanbanRouter
│   └── database/
│       └── schema.ts                 ← Exporta tabelas Drizzle desta Layer
│
├── shared/
│   ├── types/
│   │   └── index.ts                  ← Tipos compartilhados frontend ↔ backend
│   └── utils/
│       ├── permissions.ts            ← Constantes de permissão da Layer
│       └── abilities.ts              ← defineAbility() da Layer (nomes prefixados — ver convenções)
│
├── layer.manifest.ts                 ← Manifesto declarativo da Layer
├── nuxt.config.ts                    ← Configuração da Nuxt Layer
├── package.json                      ← @nuxfire/layer-kanban, workspace:*
└── README.md
```

### `layer.manifest.ts` — O Manifesto da Camada

```typescript
// layers/kanban/layer.manifest.ts
import { defineLayerManifest } from "@nuxfire/layer-types";

export default defineLayerManifest({
  // Identidade
  name: "kanban",
  displayName: "Kanban Board",
  description: "Gestão visual de tarefas e projetos com drag-and-drop",
  version: "1.0.0",

  // Dependências de outras layers — só documentacional na v1 (não há
  // validação automática de ordem de `extends`; ver Fase 1.4).
  requires: ["teams"],

  // Injeção de itens de navegação no sidebar
  navigation: {
    sidebar: [
      {
        label: "Kanban",
        icon: "i-lucide-kanban",
        to: "/{team}/kanban",
        order: 50,
      },
    ],
  },

  // Permissões granulares adicionadas ao RBAC
  permissions: [
    "kanban:boards:view",
    "kanban:boards:create",
    "kanban:boards:update",
    "kanban:boards:delete",
    "kanban:cards:create",
    "kanban:cards:update",
    "kanban:cards:move",
    "kanban:cards:delete",
  ],
});
```

> [!NOTE]
> A v1 do manifesto **não tem campo `infrastructure`**. Recursos Cloudflare continuam sendo provisionados só por `flags` em `config.ts`, lidos diretamente por `infra/*.ts` — o mecanismo que já existe e funciona hoje (confirmado em `infra/jobs.ts`, `infra/websockets.ts`, `infra/secret.ts`). Uma layer que precisar de infra própria é um projeto à parte que estende esse mecanismo depois de o padrão de layers estar validado em produção.

### `nuxt.config.ts` da Layer

```typescript
// layers/kanban/nuxt.config.ts
export default defineNuxtConfig({
  $meta: {
    name: "kanban", // Gera alias oficial de import #layers/kanban
  },
  components: [
    {
      path: "./app/components",
      prefix: "Kanban", // Garante isolamento: <KanbanBoard /> evita conflitos globais
    },
  ],
});
```

### `package.json` da Layer

```json
{
  "name": "@nuxfire/layer-kanban",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./layer.manifest.ts",
    "./server/trpc/router": "./server/trpc/router.ts",
    "./server/database/schema": "./server/database/schema.ts",
    "./shared/*": "./shared/*"
  },
  "dependencies": {
    "@nuxfire/layer-teams": "workspace:*"
  },
  "devDependencies": {
    "nuxt": "^4.5.2"
  }
}
```

---

## Composição: Como as Layers se Conectam

### 1. `config.ts` — `core` fixo vs. `features` toggleable

O objeto `layers` original misturava domínios "sempre ativos" com domínios opcionais no mesmo tipo boolean, o que é enganoso — o tipo abaixo separa os dois:

```typescript
// config.ts (adição)
export const layers = {
  // Core Layers — sempre ativas no SaaS, não são toggleable.
  // Existem aqui só para nomear os pacotes que o Composition Root sempre estende.
  core: ["teams", "billing", "notifications", "admin"],

  // Feature Layers opcionais — ativáveis por build/deploy
  features: {
    kanban: true,
    calendar: false,
  } satisfies Record<string, boolean>,
};
```

### 2. Composition Root — `packages/app/nuxt.config.ts`

```typescript
// packages/app/nuxt.config.ts (modificado)
import { layers } from "#nuxfire/config";

const activeLayers = [
  ...layers.core.map((name) => `@nuxfire/layer-${name}`),
  ...Object.entries(layers.features)
    .filter(([, enabled]) => enabled)
    .map(([name]) => `@nuxfire/layer-${name}`),
];

export default defineNuxtConfig({
  extends: activeLayers,
  // ... restante da configuração Nuxt/Nitro atual
});
```

> [!NOTE]
> Quando uma feature layer tem seu valor como `false`, ela é **completamente descartada pelo bundler**. Páginas, componentes Vue e rotas Nitro dessa layer não entram no artefato final do Cloudflare Worker.

### 3. Composição de tRPC Routers entre Layers

```typescript
// packages/app/server/trpc/routers/index.ts
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { router } from "../trpc";

import account from "./account";
import pub from "./public";

// Routers importados das layers via export explícito do package.json — não
// via merge automático de server/ do Nitro (ver nota de decisão acima).
import { teamsRouter } from "@nuxfire/layer-teams/server/trpc/router";
import { billingRouter } from "@nuxfire/layer-billing/server/trpc/router";
import { notificationsRouter } from "@nuxfire/layer-notifications/server/trpc/router";
import { adminRouter } from "@nuxfire/layer-admin/server/trpc/router";

import { featureRouters } from "./.composition/feature-routers";

export const appRouter = router({
  account,
  public: pub,
  teams: teamsRouter,
  billing: billingRouter,
  notifications: notificationsRouter,
  admin: adminRouter,
  ...featureRouters,
});

export type AppRouter = typeof appRouter;
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
```

### 4. Composição de Banco de Dados (Drizzle ORM)

Cada layer define seus modelos de dados em `server/database/schema.ts`. O ponto novo em relação à primeira versão do plano: **`packages/functions/src/database/schema.ts` vira um barrel file condicional**, para que o `schema` único que `useDB()` importa continue existindo de fato:

```typescript
// packages/functions/src/database/schema.ts (novo formato)
import { layers } from "#nuxfire/config";

export * from "./core-schema"; // User, Team, Role, Permission, Plan, Log, etc.

// Cada linha abaixo só existe fisicamente se a layer estiver ativa — mas
// como isto é código estático (não dinâmico), o import é sempre presente e
// o *gate* real acontece nas flags que também controlam o `extends` do Nuxt
// e o `schema` do drizzle-kit abaixo. Tabelas de uma feature layer desativada
// continuam existindo no client tipado; o que muda é se a UI/rotas que as
// usam entram no bundle.
export * from "../../../layers/teams/server/database/schema";
export * from "../../../layers/billing/server/database/schema";
export * from "../../../layers/notifications/server/database/schema";
export * from "../../../layers/admin/server/database/schema";
export * from "../../../layers/kanban/server/database/schema";
```

`packages/app/server/utils/db.ts` **não muda uma linha** — continua fazendo `import * as schema from "@nuxfire/functions/schema"`.

```typescript
// packages/functions/drizzle.config.ts (modificado)
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/database/core-schema.ts",
    "../../layers/*/server/database/schema.ts",
  ],
  out: "./src/database/migrations", // inalterado
  dbCredentials: {
    /* inalterado */
  },
});
```

> [!IMPORTANT]
> **Uma única cadeia linear de migrações**, gerada de forma centralizada em `packages/functions`, exatamente como no plano original — isso não muda.
>
> **Dado órfão ao desativar uma layer em produção:** desligar `features.kanban = false` depois de a layer já ter tabelas populadas **não gera DROP automático** — é comportamento intencional (segurança de dado), não um bug a corrigir. "Desativar" significa "sai da UI e do bundle", não "apaga dado". Uma limpeza de tabelas de uma layer descontinuada é uma migration manual, decidida caso a caso.

### 5. RBAC — Convenção de Nomenclatura de Abilities

`nuxt-authorization` não faz scan próprio: ele se apoia no auto-import nativo do Nuxt 4 para `shared/utils/`, que atravessa layers automaticamente (confirmado no módulo — só registra `addImportsDir` para os próprios helpers). Isso significa que **duas layers exportando uma função `defineAbility` com o mesmo nome colidem silenciosamente** no auto-import global. Regra obrigatória:

```typescript
// layers/kanban/shared/utils/abilities.ts
export const kanbanListBoards = defineAbility(/* ... */);
export const kanbanCreateBoard = defineAbility(/* ... */);
export const kanbanDeleteCard = defineAbility(/* ... */);
```

Todo nome de ability é prefixado pelo nome da layer, sem exceção — mesma disciplina que já existe para as strings de permissão (`kanban:boards:view`) e para o prefixo de componente Vue (`Kanban*.vue`).

### 6. Limite aceito: contexto tRPC continua centralizado

`packages/app/server/trpc/context.ts` mantém uma lista fixa de campos (`session`, `sendEmail`, `sendWebsocketsEvent`, `jobsQueue`, etc.). Layers **não adicionam campos ao contexto** — se uma procedure de layer precisa de algo, ela chama os utils compartilhados diretamente (`useDB()`, `getUser()`, etc.), do jeito que o código já faz hoje. Isso é uma decisão de escopo, não um problema a resolver: manter o contexto centralizado evita que cada layer precise editar um arquivo do Composition Root, mas também significa que "zero toque na base" não é literal para o backend — é "zero toque no roteamento e nos schemas", não no `context.ts`.

### 7. Composição é automática, não um script manual

`scripts/compose-layers.ts` exporta `composeLayers()`, chamada no topo de `packages/app/nuxt.config.ts`, antes de `defineNuxtConfig(...)`. Isso roda em **todo** `nuxt dev`/`build`/`generate`/`typecheck`/`prepare` — não existe passo manual para lembrar de rodar, e não há como `.composition/feature-routers.ts` ficar dessincronizado do que existe em `layers/`. Verificado apagando o arquivo gerado e confirmando que `nuxt prepare` (o mesmo comando que já roda em `postinstall`) o recria sozinho, sem qualquer intervenção manual.

### 8. Navegação Dinâmica via Layers

```typescript
// packages/app/app/composables/useLayerNavigation.ts
export function useLayerNavigation() {
  const layerEntries = useState<NavigationEntry[]>("layer-nav", () => []);

  return computed(() =>
    layerEntries.value.slice().sort((a, b) => a.order - b.order),
  );
}
```

---

## Fases de Implementação

### Fase 1: Fundação & Camada de Tipos (2–3 semanas)

> [!CAUTION]
> Testes automatizados são bloqueantes, mas com escopo limitado: **cobrir só o que vai ser extraído nesta fase** (procedures/abilities de `teams`), não o app inteiro. Hoje existem ~14 testes Vitest cobrindo billing/team-seats — não é necessário expandir cobertura de domínios que não vão mover ainda.

1.1 **Infraestrutura de Testes com Vitest** — workspace na raiz cobrindo `packages/app` e `layers/*`; cobrir os procedures/abilities de `teams` antes de extrair.
1.2 **Pacote `@nuxfire/layer-types`** em `packages/layer-types/`, exportando `defineLayerManifest` (sem o campo `infrastructure`, conforme decisão acima).
1.3 **Registro de Workspaces**: `["packages/*", "layers/*"]` no `package.json` raiz.
1.4 **Barrel file de schema**: criar `packages/functions/src/database/core-schema.ts` (conteúdo atual de `schema.ts` minus tabelas de domínio) e transformar `schema.ts` no agregador condicional descrito acima. Atualizar `drizzle.config.ts` para escanear o glob de layers.
1.5 **Script Gerador de Composição**: `scripts/compose-layers.ts` para reconciliar routers tRPC e manifestos no `nuxt prepare`/`nuxt build`.

---

### Fase 2: Layer Piloto — `@nuxfire/layer-kanban` (1–2 semanas)

Criada do zero, sem infra própria (usa só Postgres/KV/R2 já provisionados):

- **Database:** `KanbanBoard`, `KanbanColumn`, `KanbanCard` em `layers/kanban/server/database/schema.ts`.
- **tRPC:** endpoints de criação/leitura/movimentação de cards em `layers/kanban/server/trpc/router.ts`.
- **Páginas & UI:** quadro e drag-and-drop em `layers/kanban/app/pages/[[team]]/kanban/`.
- **Ativação:** testar `features.kanban = true/false` em `config.ts`, comprovando exclusão em tempo de compilação e verificando (manualmente) que as tabelas do Kanban continuam existindo no banco mesmo com a layer desativada — validação direta da decisão sobre dado órfão.

---

### Fase 3: Extração Incremental das Core Layers (4–6 semanas)

Ordem corrigida, base primeiro:

1. **`layers/teams/`** — multi-tenancy, RBAC, convites. Extraído primeiro porque é dependência transversal de todo o resto.
2. **`layers/billing/`** — assinaturas, Stripe/Paddle, planos. Depende só de `teams`.
3. **`layers/notifications/`** — depende de `teams` e da infra de websockets (que não muda).
4. **`layers/admin/`** — extraído por último: seu próprio [admin/index.ts](file:///c:/nuxfire/packages/app/server/trpc/routers/admin/index.ts) já importa sub-routers de `plans` (billing), `notifications` e `queue` — é estruturalmente uma camada de agregação, não uma folha. Extraí-lo antes das outras três forçaria reescrever seus imports duas vezes.

---

### Fase 4: Novas Feature Layers de Negócio

| Layer | Escopo funcional | Dependências | Infra própria? |
|---|---|---|---|
| `@nuxfire/layer-kanban` | Quadros, colunas, cartões, tags, drag-and-drop | `teams` | Não |
| `@nuxfire/layer-calendar` | Agendamentos, eventos por equipe, recorrência | `teams` | Não |
| `@nuxfire/layer-docs` | Base de conhecimento/documentação interna | `teams` | Não |
| `@nuxfire/layer-chat` | Mensageria instantânea via Durable Objects | `teams`, `notifications` | **Sim — fora do escopo deste plano**, ver decisão 1 |

---

## Decisões Técnicas Alinhadas

1. **Terminologia:** Nuxt Layers para frontend; workspace packages com import explícito para backend (tRPC, schema, abilities).
2. **Diretório:** pasta de primeiro nível `layers/` na raiz do monorepo.
3. **Naming Convention:** pacotes `@nuxfire/layer-*`; componentes `<LayerName>*.vue`; permissões `layername:recurso:ação`; **abilities `layerNameAcaoRecurso` (novo, evita colisão de auto-import)**.
4. **Módulo Piloto:** Kanban, sem infra própria.
5. **Schema Drizzle:** barrel file condicional em `packages/functions/src/database/schema.ts` — cada layer é dona do arquivo-fonte, o client runtime continua único.
6. **Infra Cloudflare por layer:** fora do escopo da v1; mecanismo existente de `flags` em `config.ts` continua sendo a única via de provisionamento condicional.
7. **Ordem de extração:** `teams` → `billing` → `notifications` → `admin`.
