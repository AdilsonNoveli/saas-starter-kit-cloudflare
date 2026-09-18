# Parecer Geral — Nuxfire + Fireskills
## Versão 2 — Verificação profunda, zero suposição

> Cada afirmação abaixo tem arquivo e linha de evidência.

---

## 1. CONFIRMADO: O projeto usa @nuxt/ui v4 — ZERO shadcn/ui

### Evidências diretas (arquivo + linha)

| Evidência | Arquivo | O que prova |
|---|---|---|
| `"@nuxt/ui": "^4.8.1"` | [`apps/app/package.json`](file:///c:/nuxfire/apps/app/package.json#L29) | Dependência real instalada |
| `modules: ["@nuxt/ui"]` | [`apps/app/nuxt.config.ts`](file:///c:/nuxfire/apps/app/nuxt.config.ts#L38) | Módulo carregado no Nuxt |
| `<UApp>` envolve toda a app | [`apps/app/app/app.vue`](file:///c:/nuxfire/apps/app/app/app.vue#L2) | Padrão correto do @nuxt/ui |
| `<UModal>`, `<UForm>`, `<UCard>`, `<UInput>`, `<UButton>`, `<UFormField>` | [`layers/teams/app/components/TeamCreateModal.vue`](file:///c:/nuxfire/layers/teams/app/components/TeamCreateModal.vue) | Componentes U* em uso real |
| `<UIcon name="i-lucide-users">` | [`layers/teams/app/pages/[[team]]/settings/members.vue`](file:///c:/nuxfire/layers/teams/app/pages/%5B%5Bteam%5D%5D/settings/members.vue#L56) | Ícones Lucide via @nuxt/icon |
| `<UTable>`, `<UTabs>`, `<USelect>`, `useToast()` | mesmo arquivo, múltiplas linhas | Componentes em uso real |
| `sharedUiConfig` com `card`, `avatar`, `dashboardSidebar`, `navigationMenu`, `tabs` | [`packages/tokens/index.ts`](file:///c:/nuxfire/packages/tokens/index.ts) | Overrides do @nuxt/ui via `app.config.ts` |
| `enterpriseTableUi` — `:ui` prop para `UTable` | [`packages/tokens/index.ts`](file:///c:/nuxfire/packages/tokens/index.ts#L224) | Customização de `UTable` usada em 3 locais |
| `@import "@nuxt/ui";` | `packages/tokens/theme.css` linha 56 (referenciado em DESIGN_SYSTEM.md) | CSS base vem do @nuxt/ui |
| **grep `shadcn` em todo `/apps/app` → 0 resultados** | Verificação programática | **shadcn/ui não existe no código da aplicação** |
| shadcn aparece APENAS em `fireskills/example/` (app de validação do Specsfy) e em benchmarks do Stripe | grep resultado | Contexto externo, não do Nuxfire |

### O que o @nuxt/ui v4 é (verificado via `.agents/skills/nuxt-ui/`)

- **Base**: Reka UI (fork acessível do Radix Vue) + Tailwind CSS + Tailwind Variants
- **125+ componentes** prefixados `U*` (UButton, UTable, UModal, etc.)
- **Temas** via `app.config.ts` → chave `ui:` (não via `components.json` como o shadcn)
- **Ícones** via `@nuxt/icon` (incluído automaticamente): formato `i-{collection}-{name}`
- **MCP Server** em `https://ui.nuxt.com/mcp` para consultar API de componentes
- **Cores semânticas**: `text-default`, `bg-elevated`, `border-muted` — NUNCA cores Tailwind brutas
- **Composables**: `useToast()`, `useOverlay()`, `defineShortcuts()` — todos em uso no Nuxfire

---

## 2. Estrutura dos Skills Oficiais — O modelo a seguir

### Modelo cloudflare (verificado em `_docs/base-skills/cloudflare/`)

```
cloudflare/                     ← raiz do plugin
├── README.md                   ← documentação do plugin completo
├── .agents/                    ← configuração de agentes
├── .claude-plugin/             ← integração Claude
├── .codex-plugin/              ← integração Codex
├── .cursor-plugin/             ← integração Cursor
├── mcp.json                    ← MCP server config
├── plugin.json                 ← manifesto do plugin
└── skills/                     ← cada skill é uma pasta
    ├── cloudflare/             ← skill principal (roteador de produtos)
    │   ├── SKILL.md            ← frontmatter + tabela de roteamento + princípios
    │   └── references/         ← docs por produto (README.md por pasta)
    ├── workers-best-practices/ ← skill focada
    │   ├── SKILL.md            ← frontmatter + anti-patterns + tabela de refs
    │   └── references/         ← configuration.md, runtime-patterns.md, platform-apis.md
    ├── durable-objects/        ← skill focada
    │   ├── SKILL.md            ← frontmatter + quando usar + padrões + código
    │   └── references/         ← rules.md, testing.md, workers.md
    └── ... (14 skills no total)
```

### Anatomia de um SKILL.md (padrão verificado)

```markdown
---
name: nome-da-skill
description: Uma linha clara de quando usar + o que cobre + o que NÃO cobre.
---

# Título

## Quando usar / O que fazer

Tabela ou lista de situações → produto/padrão recomendado + referência

## Regras principais / Anti-patterns

Lista direta sem introdução

## Validação

O que executar para confirmar que está correto

## Referências (opcional)

Links para arquivos em references/
```

### Modelo nuxt-ui (verificado em `.agents/skills/nuxt-ui/`)

```
nuxt-ui/
├── SKILL.md                    ← regras core + routing table + instalação
└── references/
    ├── components.md           ← índice de todos os 125+ componentes
    ├── guidelines/
    │   ├── design-system.md   ← cores semânticas, theming, variantes
    │   ├── component-selection.md ← quando usar Modal vs Slideover etc.
    │   ├── conventions.md     ← UApp, ícones, slots, composables, i18n
    │   └── forms.md           ← validação, Standard Schema, UForm
    ├── layouts/
    │   ├── dashboard.md
    │   ├── landing.md
    │   ├── docs.md
    │   ├── chat.md
    │   └── editor.md
    └── recipes/
        ├── data-tables.md
        ├── auth.md
        ├── overlays.md
        └── navigation.md
```

### Modelo stripe (verificado em `_docs/base-skills/stripe/`)

```
stripe/
└── skills/
    ├── stripe-best-practices/  ← roteador + regras críticas
    │   ├── SKILL.md
    │   └── references/
    │       ├── payments.md
    │       ├── billing.md
    │       ├── connect.md
    │       ├── tax.md
    │       └── security.md
    ├── stripe-directory/       ← discovery
    ├── stripe-docs/            ← acesso à documentação
    └── ... (9 skills no total)
```

---

## 3. Stack real verificada — Tabela completa

| Área | Tecnologia real | Arquivo de evidência |
|---|---|---|
| **UI Components** | `@nuxt/ui` v4.8.1 (Reka UI + Tailwind) | `apps/app/package.json:29` |
| **Ícones** | `@iconify-json/lucide` via `@nuxt/icon` | `apps/app/package.json:58` |
| **CSS Base** | Tailwind CSS (via @nuxt/ui, sem config separada) | `apps/app/nuxt.config.ts` |
| **Tokens** | `@nuxfire/tokens` (`packages/tokens/`) | `apps/app/package.json:17` |
| **Runtime Frontend** | Nuxt 4 + Vue 3 + TypeScript | `apps/app/package.json:43,52` |
| **State** | Pinia + `@pinia/nuxt` | `apps/app/package.json:33,47` |
| **API** | tRPC v10 via `trpc-nuxt` | `apps/app/package.json:36,49` |
| **Validação** | Zod v3 | `apps/app/package.json:54` |
| **Auth** | OpenAuth.js (`@openauthjs/openauth`) | `apps/app/package.json:32` |
| **Authorization** | `nuxt-authorization` | `apps/app/package.json:44` |
| **Database** | PostgreSQL via Cloudflare Hyperdrive | `infra/database.ts` |
| **ORM** | Drizzle ORM | `apps/app/package.json:40` |
| **Deploy** | SST 4.14.0 → Cloudflare Workers | `package.json:27` + `sst.config.ts` |
| **Blob** | NuxtHub R2 (`hubBlob()`) | `apps/app/nuxt.config.ts:56` |
| **KV/Cache** | NuxtHub KV/Cache (`hubKV()`, `hubCache()`) | `apps/app/nuxt.config.ts:57-58` |
| **WebSockets** | Cloudflare Durable Objects | `apps/functions/src/websockets.js` |
| **Jobs** | Cloudflare Queues + DLQ | `infra/jobs.ts` |
| **Cron** | Cloudflare Cron Triggers | `infra/cron.ts` |
| **Payments** | Stripe + Paddle (ambos ativos) | `config.ts:74,76` |
| **Email** | Resend (ativo) | `config.ts:83` |
| **i18n** | `@nuxtjs/i18n` (en, pt-BR, es) | `apps/app/nuxt.config.ts:142-161` |
| **SVG** | `nuxt-svgo` (prefix: `icon`) | `apps/app/nuxt.config.ts:92-95` |
| **Visualizações** | `@unovis/vue` | `apps/app/package.json:34-35` |
| **Testes** | Vitest | `apps/app/package.json:60` |
| **Datas** | `date-fns` v4 | `apps/app/package.json:39` |
| **Package Manager** | Bun + workspaces | `bunfig.toml` |
| **shadcn/ui** | ❌ **NÃO EXISTE** no código da aplicação | grep em todo `/apps` e `/layers` → 0 resultados |
| **React** | ❌ **NÃO EXISTE** nas apps Nuxt (só em `packages/emails` para React Email) | verificado |

---

## 4. Especialistas do Fireskills — O que fazer com cada um

### REMOVER (não têm base real neste projeto)

| Especialista Specsfy | Motivo da remoção |
|---|---|
| `specsfy-specialist-astro` | Nuxfire não usa Astro |
| `specsfy-specialist-nextjs` | Nuxfire não usa Next.js |
| `specsfy-specialist-laravel` | Nuxfire não usa PHP/Laravel |
| `specsfy-specialist-laravel-package-manager` | idem |
| `specsfy-specialist-react` | UI é Vue 3 / @nuxt/ui, não React (exceto react-email que não é UI de app) |
| `specsfy-specialist-react-ui-components` | Nuxfire usa @nuxt/ui, não shadcn/ReUI/React |
| `specsfy-specialist-reui` | Nuxfire não usa ReUI |
| `specsfy-specialist-shadcn-ui` | shadcn/ui não existe no projeto (verificado) |
| `specsfy-specialist-ansible` | Deploy via SST/Cloudflare, não Ansible |
| `specsfy-specialist-debian-server` | Nenhum servidor Linux gerenciado |
| `specsfy-specialist-docker` | Cloudflare Workers, não Docker |
| `specsfy-specialist-docker-swarm` | idem |
| `specsfy-specialist-deploy` | Deploy é `bun run deploy` → `sst deploy` |
| `specsfy-specialist-redis` | Nuxfire usa Cloudflare KV, não Redis |
| `specsfy-specialist-supabase` | Usa Postgres + Hyperdrive direto, não Supabase |

### MANTER (relevantes para a stack real)

| Especialista | Por quê manter |
|---|---|
| `specsfy-specialist-typescript` | TypeScript em todo o projeto |
| `specsfy-specialist-postgres` | PostgreSQL via Hyperdrive |
| `specsfy-specialist-tailwind-css` | Tailwind é a base do @nuxt/ui |
| `specsfy-specialist-debugging` | Agnóstico de stack |
| `specsfy-specialist-code-review` | Agnóstico de stack |
| `specsfy-specialist-software-architecture` | Agnóstico de stack |
| `specsfy-specialist-web-api-design` | Relevante para tRPC contracts |
| `specsfy-specialist-application-security` | Relevante para auth, webhooks, MFA |
| `specsfy-specialist-performance-engineering` | Workers performance, Web Vitals |
| `specsfy-specialist-data-modeling` | Schema Drizzle, relações |
| `specsfy-specialist-domain-modeling` | Arquitetura de layers |
| `specsfy-specialist-prototyping` | Agnóstico |
| `specsfy-specialist-technical-research` | Agnóstico |
| `specsfy-specialist-merge-conflict-resolution` | Agnóstico |
| `specsfy-specialist-gitflow` | Agnóstico |
| `specsfy-specialist-design-system` | Relevante — adaptar para @nuxt/ui tokens |
| `specsfy-specialist-ui-design` | Relevante — adaptar para Vue SFC |
| `specsfy-specialist-ux-design` | Relevante — adaptar para Nuxt |
| `specsfy-specialist-interface-experience` | Relevante — adaptar para @nuxt/ui |
| `specsfy-specialist-web-accessibility` | Relevante — Reka UI é acessível por base |
| `specsfy-specialist-observability` | Relevante — Cloudflare Workers Logs/Traces |
| `specsfy-specialist-versioning` | Agnóstico |
| `specsfy-specialist-delivery-engineering` | Adaptar para SST deploy |

### CRIAR DO ZERO (especialistas que não existem no Specsfy mas são críticos)

Seguindo o formato verificado dos skills oficiais (cloudflare, stripe, nuxt-ui):

| Especialista novo | Propósito | Baseado em |
|---|---|---|
| `fireskill-specialist-nuxt` | Nuxt 4: pages, layers, composables, plugins, middleware, SSR, Nitro | Docs Nuxt + `_docs/AGENTS.md` |
| `fireskill-specialist-nuxt-ui` | @nuxt/ui v4: 125+ componentes, temas, `app.config.ts`, tokens, composables | `.agents/skills/nuxt-ui/` (já existe!) |
| `fireskill-specialist-trpc` | tRPC v10: procedures, routers, context, `useTrpcClient()`, composition de layers | `apps/app/server/trpc/` |
| `fireskill-specialist-drizzle` | Drizzle ORM: schema, relations, migrations, query builder, ciclos de dependência | `apps/functions/src/database/` |
| `fireskill-specialist-cloudflare-workers` | Workers runtime: bindings, waitUntil, KV, R2, Queues, DOs, Cron, Hyperdrive | `_docs/base-skills/cloudflare/` (já existe!) |
| `fireskill-specialist-sst` | SST 4: infra como código, secrets, linking, stages, deploy Cloudflare | `infra/*.ts` + `_docs/AGENTS.md` |
| `fireskill-specialist-openauth` | OpenAuth.js: providers, KV sessions, callbacks, tokens, reset de identidade | `apps/functions/src/auth.ts` |
| `fireskill-specialist-nuxfire-layers` | Como criar, registrar e compor Nuxt Layers no Nuxfire: `config.ts`, `compose-layers.ts`, `router.ts`, `nuxt.config.ts` de layer | `_docs/AGENTS.md` + `scripts/compose-layers.ts` |
| `fireskill-specialist-nuxt-authorization` | RBAC: `defineAbility()`, `abilityProcedure`, `<Can>`, prefixos de layer, `PERMISSIONS.*` | `layers/teams/shared/utils/abilities.ts` |
| `fireskill-specialist-pinia` | Pinia no Nuxt: stores, SSR hydration, `storeToRefs`, lazy loading | `layers/*/app/composables/` |

---

## 5. Contratos internos da metodologia — o que corrigir

### No `Spec.md` (contrato central):

| Texto atual | Substituir por |
|---|---|
| `shadcn/ui fornece as primitives e ReUI fornece as composições` | `@nuxt/ui v4 fornece todos os componentes (UButton, UModal, UTable, etc.)` |
| `Em projeto React, toda interface deve ser composta por componentes React` | `Toda interface usa Vue Single-File Components (SFC) com @nuxt/ui` |
| `$specsfy-specialist-react-ui-components` (no fluxo de interface) | `$fireskill-specialist-nuxt-ui` |
| `Contrato de runtime Laravel` (seção inteira) | `Contrato de runtime Cloudflare Workers` |
| `Pest` como runner de testes em PHP | Remover — não existe PHP. Vitest é o runner. |
| `migrate:fresh`, `migrate:refresh`, etc. (Laravel) | Lista já correta, adicionar `drizzle-kit push --force` |
| `INTERFACE.md` cita `shadcn/ui` e `ReUI` | Substituir por `@nuxt/ui` e `enterpriseTableUi` |

### No `specsfy-07-implement/SKILL.md`:

| Texto atual | Substituir por |
|---|---|
| `$specsfy-specialist-react-ui-components` (obrigatório antes de JSX/TSX) | `$fireskill-specialist-nuxt-ui` (obrigatório antes de `.vue` com U-components) |
| `shadcn/ui` e `ReUI` no CRUD contract | `@nuxt/ui` com `UTable`, `UModal`, `UFormField` |
| `Em PHP, use Pest` | Remover — não existe PHP |

### Nos especialistas mantidos (interface/design):

Os quatro especialistas `design-system`, `ui-design`, `ux-design`, `interface-experience` citam internamente shadcn/ReUI/React. Precisam de adaptação para Vue SFC + @nuxt/ui — mas o SKILL.md raiz de cada um é agnóstico o suficiente. Apenas as `references/` internas precisam ser reescritas.

---

## 6. O que já existe e pode ser aproveitado DIRETAMENTE

| O que | Onde está | Como aproveitar |
|---|---|---|
| Skill completa @nuxt/ui | `.agents/skills/nuxt-ui/` | Copiar como `fireskill-specialist-nuxt-ui` (já é o formato correto) |
| Skill completa Cloudflare Workers | `_docs/base-skills/cloudflare/` | Extrair as skills `cloudflare`, `workers-best-practices`, `durable-objects`, `wrangler` como especialistas |
| Skill completa Stripe | `_docs/base-skills/stripe/` | Extrair `stripe-best-practices` como especialista |
| `_docs/AGENTS.md` (176 linhas) | `_docs/AGENTS.md` | É o STACK.md e DATABASE.md prontos — extrair e colocar em `.specsfy/` |
| `packages/tokens/index.ts` e `theme.css` | `packages/tokens/` | É o DESIGNSYSTEM.MD pronto — extrair para contexto do setup |

---

## 7. Resultado Final: O que muda no fireskills

### Estrutura proposta após transformação

```
fireskills/
├── SKILL.md                    ← fireskills overview (renomear, rebrand)
├── AGENTS.md                   ← governa o fireskills no contexto Nuxfire
├── README.md                   ← documentação do fireskills
├── skills/                     ← 18 skills core (renomeadas fireskill-*)
│   ├── fireskill-01-inbox/
│   ├── fireskill-02-backlog/
│   ├── fireskill-03-specify/
│   ├── fireskill-04-validate/
│   ├── fireskill-05-tasks/
│   ├── fireskill-06-tdd-bdd/
│   ├── fireskill-07-implement/     ← corrigir refs shadcn→@nuxt/ui, React→Vue
│   ├── fireskill-setup/            ← corrigir runtime Laravel→Workers
│   ├── fireskill-documentator/
│   ├── fireskill-update-spec/
│   ├── fireskill-progress/
│   ├── fireskill-interviewer/
│   ├── fireskill-mvp-milestone-interviewer/
│   ├── fireskill-roadmap-milestone-interviewer/
│   ├── fireskill-milestone-governor/
│   ├── fireskill-data-discovery/
│   ├── fireskill-aux-stack/
│   ├── fireskill-aux-rules/
│   └── fireskill-aux-database/
├── specialists/                 ← especialistas técnicos
│   ├── [23 mantidos, renomeados fireskill-specialist-*]
│   ├── fireskill-specialist-nuxt/          ← NOVO
│   ├── fireskill-specialist-nuxt-ui/       ← vem de .agents/skills/nuxt-ui/
│   ├── fireskill-specialist-trpc/          ← NOVO
│   ├── fireskill-specialist-drizzle/       ← NOVO
│   ├── fireskill-specialist-cloudflare-workers/ ← vem de base-skills/cloudflare/
│   ├── fireskill-specialist-sst/           ← NOVO
│   ├── fireskill-specialist-openauth/      ← NOVO
│   ├── fireskill-specialist-nuxfire-layers/ ← NOVO (único do monorepo)
│   ├── fireskill-specialist-nuxt-authorization/ ← NOVO
│   └── fireskill-specialist-pinia/         ← NOVO
└── [remover: cli/, brand/, example/, specsfy/, tests/, scripts/, .github/, .ebook/, .pdf/]
```

---

## 8. Evidência final: shadcn não existe no Nuxfire

> [!CAUTION]
> Verificação programática executada: `grep "shadcn" em todo /apps/app, /layers, /packages/tokens, /packages/emails, /packages/manifest` → **0 resultados**.
>
> shadcn aparece APENAS em:
> - `fireskills/example/` → app de validação interna do Specsfy (não é Nuxfire)
> - `fireskills/example/components.json` → config shadcn do app exemplo do Specsfy
> - `_docs/base-skills/stripe/benchmarks/` → projetos de benchmark do Stripe (não é Nuxfire)
> - `fireskills/specialists/catalog.json` → catálogo do Specsfy que vamos transformar

**O projeto Nuxfire usa exclusivamente `@nuxt/ui` v4 com Reka UI + Tailwind CSS.**
