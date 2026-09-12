# NuxFire — Arquitetura Enterprise-Grade baseada em Nuxt 4 Layers

Plano para transformar o NuxFire na arquitetura fullstack Nuxt mais robusta e modular do mercado, utilizando **Nuxt 4 Layers** como unidades autônomas de domínio de negócio (Kanban, Calendar, Billing, etc.), ativáveis ou desativáveis no deploy.

---

## Esclarecimento: NuxFire **já é** um monorepo

O [package.json](file:///c:/nuxfire/package.json) declara:

```json
"workspaces": ["packages/*"]
```

Isso é um **monorepo Bun** com 6 workspace packages. O que faltava era a **arquitetura de domínios plugáveis** dentro desse monorepo. No ecossistema oficial do Nuxt 4, o padrão nativo e robusto para criar essas fatias completas de aplicação (UI, rotas, regras de negócio e APIs) chama-se **Nuxt Layers**.

---

## Visão da Arquitetura Alvo (Nuxt Layers)

```text
nuxfire/                              ← Monorepo raiz (Bun workspaces)
│
├── packages/                         ← Aplicações & pacotes de infraestrutura fixa
│   ├── app/                          ← Composition Root (shell fino da aplicação)
│   ├── web/                          ← Site público de marketing/docs
│   ├── auth-frontend/                ← UI de autenticação estática
│   ├── functions/                    ← Workers (auth issuer, emails, jobs, WS)
│   ├── emails/                       ← Templates React Email
│   └── design-tokens/                ← Tokens visuais compartilhados
│
├── layers/                           ← Nuxt 4 Feature Layers (Domínios de Negócio)
│   ├── teams/                        ← @nuxfire/layer-teams
│   ├── billing/                      ← @nuxfire/layer-billing
│   ├── admin/                        ← @nuxfire/layer-admin
│   ├── notifications/                ← @nuxfire/layer-notifications
│   ├── kanban/                       ← @nuxfire/layer-kanban [NOVA LAYER *FUTURO]
│   ├── calendar/                     ← @nuxfire/layer-calendar [NOVA LAYER *FUTURO]
│   └── ...futuras layers
│
├── infra/                            ← SST infrastructure-as-code
├── config.ts                         ← Feature flags + layers ativas
└── sst.config.ts                     ← Auto-imports infra/*.ts
```

**Workspaces configurados** no `package.json` raiz:

```json
"workspaces": ["packages/*", "layers/*"]
```

> [!IMPORTANT]
> As camadas de negócio vivem em `layers/` (separadas de `packages/`) por alinhamento direto com a convenção nativa do Nuxt 4. Cada camada é simultaneamente:
> 1. Uma **Nuxt Layer** (estendida via `extends` no Nuxt 4).
> 2. Um **Workspace Package** Bun (com `package.json` próprio sob o namespace `@nuxfire/layer-*`).

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
│   │   └── router.ts                ← Exporta kanbanRouter
│   └── database/
│       └── schema.ts                 ← Exporta tabelas Drizzle desta Layer
│
├── shared/
│   ├── types/
│   │   └── index.ts                  ← Tipos compartilhados frontend ↔ backend
│   └── utils/
│       ├── permissions.ts            ← Constantes de permissão da Layer
│       └── abilities.ts              ← defineAbility() da Layer
│
├── layer.manifest.ts                 ← Manifesto declarativo da Layer
├── nuxt.config.ts                    ← Configuração da Nuxt Layer
├── package.json                      ← @nuxfire/layer-kanban, workspace:*
└── README.md
```

### `layer.manifest.ts` — O Manifesto da Camada

Cada layer declara formalmente sua identidade, requisitos e navegação:

```typescript
// layers/kanban/layer.manifest.ts
import { defineLayerManifest } from '@nuxfire/layer-types'

export default defineLayerManifest({
  // Identidade
  name: 'kanban',
  displayName: 'Kanban Board',
  description: 'Gestão visual de tarefas e projetos com drag-and-drop',
  version: '1.0.0',

  // Dependências de outras layers
  requires: ['teams'],

  // Infraestrutura em nuvem requerida
  infrastructure: {
    queues: false,
    kv: false,
    cron: false,
    durableObjects: false,
  },

  // Injeção de itens de navegação no sidebar
  navigation: {
    sidebar: [{
      label: 'Kanban',
      icon: 'i-lucide-kanban',
      to: '/{team}/kanban',
      order: 50,
    }],
  },

  // Permissões granulares adicionadas ao RBAC
  permissions: [
    'kanban:boards:view',
    'kanban:boards:create',
    'kanban:boards:update',
    'kanban:boards:delete',
    'kanban:cards:create',
    'kanban:cards:update',
    'kanban:cards:move',
    'kanban:cards:delete',
  ],
})
```

### `nuxt.config.ts` da Layer

```typescript
// layers/kanban/nuxt.config.ts
export default defineNuxtConfig({
  $meta: {
    name: 'kanban',  // Gera alias oficial de import #layers/kanban
  },
  components: [{
    path: './app/components',
    prefix: 'Kanban',  // Garante isolamento: <KanbanBoard /> evita conflitos globais
  }],
})
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
    "nuxt": "^4.0.0"
  }
}
```

---

## Composição: Como as Layers se Conectam

### 1. Ativação de Layers — `config.ts`

No arquivo raiz [config.ts](file:///c:/nuxfire/config.ts), adicionamos o controle declarativo de quais layers entram na compilação:

```typescript
// config.ts (adição)
export const layers = {
  // Core Layers — sempre ativas no SaaS
  teams: true,
  billing: true,
  admin: true,
  notifications: true,

  // Feature Layers opcionais — ativáveis por build/deploy
  kanban: true,
  calendar: false,
} satisfies Record<string, boolean>
```

### 2. Composition Root — `packages/app/nuxt.config.ts`

A aplicação principal atua como o **Composition Root**, estendendo dinamicamente as layers ativas:

```typescript
// packages/app/nuxt.config.ts (modificado)
import { layers } from '#nuxfire/config'

const activeLayers = [
  // Core Layers (sempre presentes)
  '@nuxfire/layer-teams',
  '@nuxfire/layer-billing',
  '@nuxfire/layer-admin',
  '@nuxfire/layer-notifications',
  
  // Feature Layers (inclusão condicional no build-time)
  layers.kanban && '@nuxfire/layer-kanban',
  layers.calendar && '@nuxfire/layer-calendar',
].filter(Boolean) as string[]

export default defineNuxtConfig({
  extends: activeLayers,
  // ... restante da configuração Nuxt/Nitro atual
})
```

> [!NOTE]
> Quando uma layer tem seu valor como `false`, ela é **completamente descartada pelo bundler**. As páginas, componentes Vue e rotas Nitro dessa layer não entram no artefato final do Cloudflare Worker.

### 3. Composição de tRPC Routers entre Layers

Cada layer exporta seu roteador tRPC. O arquivo [packages/app/server/trpc/routers/index.ts](file:///c:/nuxfire/packages/app/server/trpc/routers/index.ts) atua como o ponto de fusão com total segurança de tipos:

```typescript
// packages/app/server/trpc/routers/index.ts
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { router } from '../trpc'

// Core routers
import account from './account'
import pub from './public'

// Routers importados das Nuxt Layers via alias oficial #layers/[name]
import { teamsRouter } from '#layers/teams/server/trpc/router'
import { billingRouter } from '#layers/billing/server/trpc/router'
import { adminRouter } from '#layers/admin/server/trpc/router'
import { notificationsRouter } from '#layers/notifications/server/trpc/router'

// Feature layer routers condicionalmente compostos
import { featureRouters } from './.composition/feature-routers'

export const appRouter = router({
  // Base
  account,
  public: pub,

  // Core Layers
  teams: teamsRouter,
  billing: billingRouter,
  admin: adminRouter,
  notifications: notificationsRouter,

  // Feature Layers ativas
  ...featureRouters,
})

export type AppRouter = typeof appRouter
export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>
```

### 4. Composição de Banco de Dados (Drizzle ORM)

Cada layer define seus modelos de dados em seu próprio diretório `server/database/schema.ts`. O Drizzle Kit escaneia automaticamente todas as layers:

```typescript
// packages/functions/drizzle.config.ts (modificado)
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    // Tabelas core de sistema (users, teams, roles, etc.)
    './src/database/schema/core.ts',
    // Tabelas de todas as layers registradas
    '../../layers/*/server/database/schema.ts',
  ],
  out: './drizzle/migrations',
})
```

> [!IMPORTANT]
> **Uma única cadeia linear de migrações:** As layers declaram suas tabelas de forma modular, mas o comando `drizzle-kit generate` é executado de forma centralizada em `packages/functions`. Isso gera migrações SQL unificadas e atômicas, evitando inconsistências de Foreign Key no deploy.

### 5. Navegação Dinâmica via Layers

O menu lateral do dashboard descobre as páginas de cada layer ativa lendo os manifestos:

```typescript
// packages/app/app/composables/useLayerNavigation.ts
export function useLayerNavigation() {
  const layerEntries = useState<NavigationEntry[]>('layer-nav', () => [])
  
  return computed(() =>
    layerEntries.value.slice().sort((a, b) => a.order - b.order)
  )
}
```

---

## Fases de Implementação

### Fase 1: Fundação & Camada de Tipos (estimativa: 2–3 semanas)

> [!CAUTION]
> A implementação de testes automatizados é **bloqueante**. O projeto atual tem zero testes; extrair código para layers sem uma rede de segurança criaria riscos severos de regressão.

#### 1.1 Infraestrutura de Testes com Vitest
- Configurar Vitest workspace na raiz cobrindo `packages/app` e `layers/*`.
- Cobrir os procedimentos tRPC críticos antes de iniciar extrações.

#### 1.2 Pacote `@nuxfire/layer-types`
- Criar pacote em `packages/layer-types/` exportando `defineLayerManifest` e interfaces de tipagem para manifestos de layers.

#### 1.3 Registro de Workspaces no `package.json`
- Atualizar workspaces para `["packages/*", "layers/*"]`.

#### 1.4 Script Gerador de Composição
- Criar `scripts/compose-layers.ts` para reconciliar routers tRPC e manifestos no momento do `nuxt prepare` / `nuxt build`.

---

### Fase 2: Layer Piloto — `@nuxfire/layer-kanban` (estimativa: 1–2 semanas)

Criar a layer do Kanban **do zero** como prova de conceito arquitetural. Isso valida a mecânica completa de Nuxt Layers sem risco de quebrar o código existente do SaaS.

* **Database:** Tabelas `KanbanBoard`, `KanbanColumn`, `KanbanCard` em `layers/kanban/server/database/schema.ts`.
* **tRPC:** Endpoints de criação/leitura/movimentação de cards em `layers/kanban/server/trpc/router.ts`.
* **Páginas & UI:** Visualização de quadro e drag-and-drop em `layers/kanban/app/pages/[[team]]/kanban/`.
* **Ativação:** Testar a alternância `kanban: true` e `kanban: false` em `config.ts` para comprovar a exclusão em tempo de compilação.

---

### Fase 3: Extração Incremental das Core Layers (estimativa: 4–6 semanas)

Extrair o código atual de `packages/app` para layers dedicadas, na ordem de menor para maior dependência:

1. **`layers/notifications/`**: Baixíssimo acoplamento.
2. **`layers/admin/`**: Console administrativo da plataforma, já isolado por design.
3. **`layers/billing/`**: Assinaturas, Stripe/Paddle e planos.
4. **`layers/teams/`**: Multi-tenancy, RBAC e convites (base estrutural de tudo).

---

### Fase 4: Novas Feature Layers de Negócio

Com a arquitetura consolidada, novos domínios são criados diretamente como layers:

| Layer | Escopo funcional | Dependências |
|---|---|---|
| `@nuxfire/layer-kanban` | Quadros, colunas, cartões, tags, drag-and-drop | `teams` |
| `@nuxfire/layer-calendar` | Agendamentos, eventos por equipe, recorrência | `teams` |
| `@nuxfire/layer-docs` | Base de conhecimento/documentação interna | `teams` |
| `@nuxfire/layer-chat` | Mensageria instantânea via Durable Objects | `teams`, `notifications` |

---

## Decisões Técnicas Alinhadas

1. **Terminologia:** Adotado oficialmente o padrão **Nuxt Layers** em toda a arquitetura.
2. **Diretório:** Criada a pasta de primeiro nível `layers/` na raiz do monorepo.
3. **Naming Convention:** Pacotes nomeados como `@nuxfire/layer-*` (ex: `@nuxfire/layer-kanban`).
4. **Módulo Piloto:** Kanban definido como o primeiro caso prático para validar a infraestrutura de Nuxt Layers.
