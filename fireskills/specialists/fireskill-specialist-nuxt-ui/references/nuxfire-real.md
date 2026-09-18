# @nuxt/ui no Nuxfire — o que existe de fato no código

Cada afirmação abaixo tem o arquivo de evidência. Se o código mudar, o código
vence este documento: releia o arquivo antes de agir.

## 1. Instalação e cadeia de CSS

| Fato | Evidência |
|---|---|
| Dependência `@nuxt/ui` `^4.8.1` (instalada: 4.11.0) | `apps/app/package.json`, `node_modules/@nuxt/ui/package.json` |
| Módulo carregado em `modules: ["@nuxt/ui", ...]` | `apps/app/nuxt.config.ts` |
| `<UApp>` envolve tudo, com `ConfirmDialog` montado uma vez dentro dele | `apps/app/app/app.vue` |
| Ordem obrigatória no CSS: `tailwindcss` → `@nuxt/ui` → `@nuxfire/tokens/theme.css` | `apps/app/app/assets/css/main.css` |
| Ícones: `i-lucide-*` (coleção `lucide`); SVG próprio via `nuxt-svgo` com prefixo `icon`, lidos de `~/assets/icons` | `apps/app/nuxt.config.ts` (`svgo`) |
| Fontes via `@nuxt/fonts` (Montserrat/Google no `nuxt.config`; Geist declarada em `theme.css`) | `apps/app/nuxt.config.ts`, `packages/tokens/theme.css` |
| Temas gerados por componente (slots, variantes) em `apps/app/.nuxt/ui/<componente>.ts` | pasta gerada pelo `nuxt prepare`/`dev` |

`theme.css` vem **depois** de `@import "@nuxt/ui"` de propósito: os overrides
precisam vencer os defaults do Nuxt UI. Inverter a ordem desfaz o tema.

## 2. Onde o tema mora (fonte única: `packages/tokens`)

- **`packages/tokens/index.ts` → `sharedUiConfig`**: fragmento do `app.config.ts`,
  espalhado em `ui: { ...sharedUiConfig }` (`apps/app/app/app.config.ts`).
  Chaves atuais: `icons`, `colors`, `button`, `card`, `avatar`,
  `dashboardSidebar`, `navigationMenu`, `tabs`.
- **Cores semânticas**: `primary: "flame"`, `secondary: "fire"`,
  `success: "green"`, `info: "blue"`, `warning: "amber"`, `error: "red"`,
  `neutral: "night"`. As paletas `flame`, `fire` e `night` são definidas em
  `theme.css` (`@theme static`).
- **`packages/tokens/theme.css`**: paletas, `--font-sans`/`--font-mono`,
  `--ui-radius: 0.1875rem` e o mapeamento `--ui-bg*`, `--ui-border*`,
  `--ui-text*` para claro (`:root`) e escuro (`.dark`).
- **`@source "./index.ts";` em `theme.css`** é obrigatório: o pacote chega ao app
  por symlink de `node_modules`, que o Tailwind não escaneia. Sem essa linha,
  uma classe que só existe em `index.ts` vai para o DOM sem regra de CSS.
- **Não redeclare token** no `main.css` de um app: token definido em
  `theme.css` vale para todos os apps (`app`, `web`, `login`).

### Regra de tailwind-variants que já causou bug aqui

Classes de **variante** são aplicadas depois das classes de **slot**. Um
`slots.root` global é descartado silenciosamente quando a variante ativa
define a mesma propriedade (foi o caso do `bg-elevated` no `UCard`). Por isso
o override do card em `sharedUiConfig.card` está na **variante**, não em
`slots`. Ao customizar um componente globalmente, mexa na variante que ele
realmente usa e confirme no DOM renderizado que a classe chegou.

## 3. Tabelas: `enterpriseTableUi`

- Exportado por `@nuxfire/tokens` e passado como `:ui` (prop de instância vence
  qualquer config global). Não foi dobrado em `sharedUiConfig.table` de
  propósito.
- Três call sites: `layers/admin/app/components/admin/AdminDataTable.vue`
  (estende com `EDGE_GUTTER` e `cursor-pointer` quando a linha navega),
  `apps/app/app/components/team-dashboard/TeamDashboardActivity.vue` e
  `layers/admin/app/pages/admin/index.vue`.
- Nova tabela: `<UTable :data :columns :ui="enterpriseTableUi" />`. Precisa de
  variação? Espalhe o objeto e concatene só a chave alterada (o padrão de
  `AdminDataTable.vue`: `{ ...enterpriseTableUi, td: enterpriseTableUi.td + " …" }`)
  em vez de copiar as classes.

## 4. Padrões de tela em uso

**Layout de dashboard** — `apps/app/app/layouts/dashboard.vue`:
`UDashboardGroup` > `UDashboardSidebar` (`collapsible`, `resizable`) com
`UNavigationMenu` (`orientation="vertical"`, `tooltip`, `popover`) no corpo e no
rodapé, e `<slot />` para as páginas. Cada página usa `UDashboardPanel` +
`UDashboardNavbar` (com `UDashboardSidebarCollapse` no slot `#leading`). O
layout de admin fica em `layers/admin/app/layouts/admin.vue`.
Navegação do rodapé usa o **mesmo** `UNavigationMenu` do corpo — um botão
escrito à mão já divergiu dos tokens de `navigationMenu` uma vez.

**Modal com formulário** — `layers/teams/app/components/TeamCreateModal.vue`:
`UModal v-model:open` com `#content` contendo `UForm` > `UCard`
(`#header`/`#footer`), `UFormField name=…` + `UInput`, schema `zod` em
`:schema`, `reactive` em `:state`, `:validate-on="['input']"`, `useToast()`
(legado; a regra do projeto é `useNotification()`) e `useTrpcClient()` para a mutação.

**Confirmação** — não monte `UModal` de confirmação por página. Use
`useNotification().confirm({ title, description, color })` e aguarde o
booleano; o `ConfirmDialog` único vive em `app.vue`
(`apps/app/app/components/ConfirmDialog.vue`,
`apps/app/app/composables/use-notification.ts`).

**Atalhos** — `defineShortcuts` em `apps/app/app/composables/use-dashboard.ts`.

## 5. Uso real (contagem de `<U*>` em `layers/` e `apps/app/app/`)

`UButton` 67 · `UIcon` 38 · `UFormField` 25 · `UPageCard` 19 · `UInput` 19 ·
`UCard` 13 · `UModal` 12 · `UDashboardPanel/Navbar/SidebarCollapse` 12 cada ·
`UForm` 8 · `USelect` 7 · `UDropdownMenu` 6 · `UAvatar` 6 · `UBadge` 5 ·
`UNavigationMenu` 4 · `UTable` 3 · demais ≤ 2 (`USelectMenu`, `USwitch`,
`UTextarea`, `UAlert`, `USlideover`, `UTabs`, `UPagination`, `UChip`,
`UTooltip`, `USeparator`, `UDashboardToolbar`, `UDashboardSidebar`,
`UDashboardGroup`).

Antes de introduzir um componente fora dessa lista, procure se algum
equivalente já resolve e siga o uso existente.

## 6. O que NÃO está em uso hoje (não assuma que existe)

- `useOverlay()`: 0 usos em `layers/` e `apps/app/app/`. Existe no Nuxt UI e
  pode ser adotado, mas confirmação já tem solução própria (ver §4).
- `locale` em `<UApp>` e locales do `@nuxt/ui/locale`: 0 usos. O i18n do
  projeto é `@nuxtjs/i18n` (en, pt-BR, es); ligar os dois é decisão nova, não
  convenção existente.
- Servidor MCP `https://ui.nuxt.com/mcp`: não está configurado em nenhum
  arquivo do repositório.
- Dependências das receitas de **chat** (Vercel AI SDK, `@comark/*`) e de
  **editor** (TipTap): não estão em nenhum `package.json` do projeto.
  `references/layouts/chat.md` e `editor.md` descrevem capacidades do Nuxt UI,
  não do Nuxfire — adicionar a dependência exige decisão explícita.
- Classes de paleta bruta (`text-gray-500`, `bg-red-600`…) em `.vue` de
  `layers/` e `apps/app/app/`: 0 ocorrências. Manter assim.
