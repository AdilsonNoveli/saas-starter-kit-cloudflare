# Interface do projeto

<!-- markdownlint-disable MD013 -->

Este arquivo é a fonte canônica para construir e reaproveitar a interface.
Atualize-o antes e depois de cada tarefa que criar ou mudar uma tela Vue.
Leia `.fireskills/DESIGNSYSTEM.MD` antes de escolher a composição macro. Este arquivo
registra componentes, blocos e telas locais; as regras globais de SaaS vivem em
`.fireskills/DESIGNSYSTEM.MD`.

## Base observada

- Stack: Nuxt
- Política: toda interface é composta por Vue Single-File Components com `@nuxt/ui` v4.
- Componentes: `@nuxt/ui` (`UButton`, `UModal`, `UTable`, `UForm` e demais).
- Tema: `packages/tokens` (`sharedUiConfig`, `theme.css`, `enterpriseTableUi`).

No Nuxfire (Nuxt 4) o Composition Root é `apps/app` e o domínio vive em `layers/`; carregue os especialistas de `fireskills/specialists/` (`fireskill-specialist-nuxt`, `-nuxt-ui`, `-nuxfire-layers`, `-drizzle`) conforme a área.

## Design system

| Item | Localização ou valor | Uso no projeto |
| --- | --- | --- |
| Tokens e tema | `packages/tokens` (`theme.css`, `index.ts`) | Cores, tipografia, espaçamento, raio e tema |
| Configuração `@nuxt/ui` | `apps/app/app/app.config.ts` | `ui:` (spread de `sharedUiConfig`) |
| Ícones | `@iconify-json/lucide` (apps/app/package.json) | Coleção `lucide` (`i-lucide-*`) |
| PageHeader compartilhado | `.fireskills/DESIGNSYSTEM.MD` | Um componente reutilizável para lista, detalhe, criação e edição |
| Padrão de dashboard | `.fireskills/DESIGNSYSTEM.MD` | `PageHeader`, filtros, `KPI`, visualização principal e investigação detalhada |
| Padrão de linha | `.fireskills/DESIGNSYSTEM.MD` | `UTable` com `enterpriseTableUi` em largura total, coluna `ID`, detalhe clicável por linha e ações de editar e apagar |
| Padrão de formulário | `.fireskills/DESIGNSYSTEM.MD` | Seções, coluna de contexto e painel em duas colunas responsivas |
| Padrão de contexto | `.fireskills/DESIGNSYSTEM.MD` | `Breadcrumb` em todas as telas, com equipe, módulo e tela atual |
| Componentes compartilhados | A mapear | Componentes em `app/components/` do app ou da layer |
| Composições de domínio | A mapear | Componentes em `layers/<layer>/app/components/` |

## Blocos criados e reaproveitáveis

Registre todos os blocos criados no projeto, inclusive os internos de uma
feature. Um bloco é um componente Vue com responsabilidade própria, como
grade, formulário, filtro, cabeçalho, cartão, diálogo, painel lateral, estado
vazio, upload ou ação em lote.

| Bloco | Tipo | Arquivo | Origem | Finalidade e API pública | Estados e acessibilidade | Consumidores | Reaproveitar ou estender |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ConfirmDialog` | Composição de domínio (app) | `apps/app/app/components/ConfirmDialog.vue` | próprio, sobre `@nuxt/ui` | Singleton confirmation dialog, mounted once in `app.vue`. Never imported directly by a page — call `useNotification().confirm({ title, ... }… | A mapear | `apps/app/app/app.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `AccountUserDropdown` | Composição de domínio (app) | `apps/app/app/components/account/AccountUserDropdown.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/components/settings/SettingsPanel.vue`, `apps/app/app/pages/[[team]]/dashboard.vue` (+9) | Ler o arquivo antes de criar outro bloco equivalente |
| `MfaSetupModal` | Composição de domínio (app) | `apps/app/app/components/account/MfaSetupModal.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | Nenhum consumidor direto por tag | Ler o arquivo antes de criar outro bloco equivalente |
| `AvatarUploader` | Composição de domínio (app) | `apps/app/app/components/avatar/AvatarUploader.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/pages/account-settings/index.vue`, `layers/teams/app/pages/[[team]]/settings/index.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `BackgroundDots` | Composição de domínio (app) | `apps/app/app/components/background/BackgroundDots.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/layouts/page.vue`, `apps/web/app/layouts/docs.vue` (+1) | Ler o arquivo antes de criar outro bloco equivalente |
| `LayoutContentPage` | Composição de domínio (app) | `apps/app/app/components/layout/LayoutContentPage.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/web/app/pages/blog/[...slug].vue`, `apps/web/app/pages/license.vue` (+2) | Ler o arquivo antes de criar outro bloco equivalente |
| `LayoutSection` | Composição de domínio (app) | `apps/app/app/components/layout/LayoutSection.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/components/layout/LayoutContentPage.vue`, `apps/app/app/error.vue` (+3) | Ler o arquivo antes de criar outro bloco equivalente |
| `LoaderSpin` | Composição de domínio (app) | `apps/app/app/components/loader/LoaderSpin.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/pages/[...path].vue`, `layers/admin/app/pages/admin/companies/[id].vue` (+1) | Ler o arquivo antes de criar outro bloco equivalente |
| `SettingsPanel` | Composição de domínio (app) | `apps/app/app/components/settings/SettingsPanel.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/pages/account-settings.vue`, `layers/teams/app/pages/[[team]]/settings.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamDashboardActivity` | Composição de domínio (app) | `apps/app/app/components/team-dashboard/TeamDashboardActivity.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/pages/[[team]]/dashboard.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamDashboardChart` | Composição de domínio (app) | `apps/app/app/components/team-dashboard/TeamDashboardChart.client.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/pages/[[team]]/dashboard.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamDashboardChart` | Composição de domínio (app) | `apps/app/app/components/team-dashboard/TeamDashboardChart.server.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/pages/[[team]]/dashboard.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamDashboardStats` | Composição de domínio (app) | `apps/app/app/components/team-dashboard/TeamDashboardStats.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/pages/[[team]]/dashboard.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `AdminDataTable` | Composição de domínio (layer admin) | `layers/admin/app/components/admin/AdminDataTable.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/admin/app/pages/admin/audit-log.vue`, `layers/admin/app/pages/admin/companies/index.vue` (+2) | Ler o arquivo antes de criar outro bloco equivalente |
| `ReactivateModal` | Composição de domínio (layer admin) | `layers/admin/app/components/admin/companies/ReactivateModal.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | Nenhum consumidor direto por tag | Ler o arquivo antes de criar outro bloco equivalente |
| `SuspendModal` | Composição de domínio (layer admin) | `layers/admin/app/components/admin/companies/SuspendModal.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | Nenhum consumidor direto por tag | Ler o arquivo antes de criar outro bloco equivalente |
| `ReplayModal` | Composição de domínio (layer admin) | `layers/admin/app/components/admin/queue/ReplayModal.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | Nenhum consumidor direto por tag | Ler o arquivo antes de criar outro bloco equivalente |
| `CreateEditModal` | Composição de domínio (layer billing) | `layers/billing/app/components/admin/plans/CreateEditModal.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | Nenhum consumidor direto por tag | Ler o arquivo antes de criar outro bloco equivalente |
| `BillingComparisonTable` | Composição de domínio (layer billing) | `layers/billing/app/components/billing/BillingComparisonTable.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/billing/app/pages/[[team]]/settings/billing.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `BillingPeriodToggle` | Composição de domínio (layer billing) | `layers/billing/app/components/billing/BillingPeriodToggle.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/billing/app/pages/[[team]]/settings/billing.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `BillingPortalActions` | Composição de domínio (layer billing) | `layers/billing/app/components/billing/BillingPortalActions.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/billing/app/pages/[[team]]/settings/billing.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `BillingTrialBanner` | Composição de domínio (layer billing) | `layers/billing/app/components/billing/BillingTrialBanner.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/billing/app/pages/[[team]]/settings/billing.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `PricingCard` | Composição de domínio (layer billing) | `layers/billing/app/components/pricing/PricingCard.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/billing/app/components/admin/plans/CreateEditModal.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `KanbanBoard` | Composição de domínio (layer kanban) | `layers/kanban/app/components/KanbanBoard.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/kanban/app/pages/[[team]]/kanban/[boardId].vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `KanbanBoardCreateModal` | Composição de domínio (layer kanban) | `layers/kanban/app/components/KanbanBoardCreateModal.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/kanban/app/pages/[[team]]/kanban/index.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `KanbanCard` | Composição de domínio (layer kanban) | `layers/kanban/app/components/KanbanCard.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/kanban/app/components/KanbanColumn.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `KanbanColumn` | Composição de domínio (layer kanban) | `layers/kanban/app/components/KanbanColumn.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/kanban/app/components/KanbanBoard.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `KanbanColumnHeader` | Composição de domínio (layer kanban) | `layers/kanban/app/components/KanbanColumnHeader.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/kanban/app/components/KanbanColumn.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `NotificationsSlideover` | Composição de domínio (layer notifications) | `layers/notifications/app/components/NotificationsSlideover.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/layouts/dashboard.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamCreateModal` | Composição de domínio (layer teams) | `layers/teams/app/components/TeamCreateModal.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/teams/app/components/TeamSwitcher.vue`, `layers/teams/app/components/TeamSwitcherDropdown.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamInvitesListItem` | Composição de domínio (layer teams) | `layers/teams/app/components/TeamInvitesListItem.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/teams/app/pages/[[team]]/settings/members.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamMembersListItem` | Composição de domínio (layer teams) | `layers/teams/app/components/TeamMembersListItem.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/teams/app/pages/[[team]]/settings/members.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamSwitcher` | Composição de domínio (layer teams) | `layers/teams/app/components/TeamSwitcher.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `layers/teams/app/pages/select-team.vue` | Ler o arquivo antes de criar outro bloco equivalente |
| `TeamSwitcherDropdown` | Composição de domínio (layer teams) | `layers/teams/app/components/TeamSwitcherDropdown.vue` | próprio, sobre `@nuxt/ui` | A mapear | A mapear | `apps/app/app/layouts/dashboard.vue` | Ler o arquivo antes de criar outro bloco equivalente |

## Telas e composição

| Tela ou rota | Arquivo | Componentes Vue usados | Dados e ações | Estados |
| --- | --- | --- | --- | --- |
| `/[...path]` | `apps/app/app/pages/[...path].vue` | A mapear | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/dashboard` | `apps/app/app/pages/[[team]]/dashboard.vue` | UButton, UChip, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, UIcon, UTooltip | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/account-settings` | `apps/app/app/pages/account-settings.vue` | A mapear | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/account-settings/appearance` | `apps/app/app/pages/account-settings/appearance.vue` | UIcon, UPageCard | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/account-settings` | `apps/app/app/pages/account-settings/index.vue` | UButton, UForm, UFormField, UInput, UPageCard, USeparator | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/account-settings/security` | `apps/app/app/pages/account-settings/security.vue` | UButton, UCard, UFormField, UIcon, UInput, UModal, UPageCard | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/admin/audit-log` | `layers/admin/app/pages/admin/audit-log.vue` | UButton, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/admin/companies/[id]` | `layers/admin/app/pages/admin/companies/[id].vue` | UAvatar, UBadge, UButton, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, UPageCard | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/admin/companies` | `layers/admin/app/pages/admin/companies/index.vue` | UButton, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, USelect | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/admin` | `layers/admin/app/pages/admin/index.vue` | UButton, UCard, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, UPageCard, UTable | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/admin/queue` | `layers/admin/app/pages/admin/queue/index.vue` | UButton, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, UPageCard | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/settings/billing` | `layers/billing/app/pages/[[team]]/settings/billing.vue` | UButton | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/admin/plans` | `layers/billing/app/pages/admin/plans/index.vue` | UButton, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, USwitch | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/kanban/[boardId]` | `layers/kanban/app/pages/[[team]]/kanban/[boardId].vue` | UButton, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, UIcon | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/kanban` | `layers/kanban/app/pages/[[team]]/kanban/index.vue` | UButton, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, UDropdownMenu, UIcon | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/settings/notifications` | `layers/notifications/app/pages/[[team]]/settings/notifications.vue` | A mapear | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/account-settings/notifications` | `layers/notifications/app/pages/account-settings/notifications.vue` | UPageCard, USwitch | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/admin/notifications` | `layers/notifications/app/pages/admin/notifications.vue` | UAlert, UButton, UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse, UForm, UFormField, UInput… | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/settings` | `layers/teams/app/pages/[[team]]/settings.vue` | A mapear | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/settings` | `layers/teams/app/pages/[[team]]/settings/index.vue` | UButton, UForm, UFormField, UInput, UPageCard, USeparator | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/settings/members` | `layers/teams/app/pages/[[team]]/settings/members.vue` | UButton, UCard, UForm, UFormField, UIcon, UInput, USelect, UTabs | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/:team?/settings/security` | `layers/teams/app/pages/[[team]]/settings/security.vue` | UButton, UCard, UIcon, UModal | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/invite/[[id]]` | `layers/teams/app/pages/invite/[[id]].vue` | UAlert, UAvatar, UButton, UCard, UModal | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |
| `/select-team` | `layers/teams/app/pages/select-team.vue` | UDashboardNavbar, UDashboardPanel, UDashboardSidebarCollapse | A mapear | Carregando, vazio, erro e sucesso: a mapear por tela |

## Regras de composição

1. Páginas e rotas coordenam dados e compõem componentes; não concentram a
   grade, formulário, filtros, overlays ou cartões reutilizáveis.
2. Antes de criar um componente, consulte esta tabela e reaproveite o item
   existente quando ele atender à mesma intenção.
3. Todo componente `@nuxt/ui` reaproveitado ou criado entra na tabela com seu
   arquivo, origem, explicação, API, estados e consumidores reais.
4. Use o tema do projeto (`packages/tokens`) e cores semânticas; não use cores
  de paleta bruta.
5. Para dashboards, registre a pergunta operacional, escopo, filtros,
   indicadores, visualizações, tabela de investigação e estados. Prefira
   componentes `@nuxt/ui` e blocos existentes antes de criar uma nova
   composição.
6. Em CRUD, reutilize o mesmo `PageHeader` nas telas de lista, detalhe,
   criação e edição. Registre uma única implementação, suas props, variações e
   consumidores; não duplique markup de cabeçalho por página.
7. Linhas de `UTable` com detalhe usam link acessível em toda a área; a
   listagem ocupa a largura disponível, exibe a coluna `ID` e oferece ações de
   editar e apagar. Ações internas usam `TableRowAction` ou equivalente e não
   propagam a navegação.
8. Formulários de criar e editar usam seções com coluna de contexto e painel
   em duas colunas nos breakpoints largos, refluindo para uma no mobile.
9. Toda tela renderiza `Breadcrumb` com o nome da equipe ativa, o módulo e o
   título atual. Reaproveite o breadcrumb do layout existente (ou `UBreadcrumb`) e
   registre o componente real em vez de criar outro.
10. Ao criar um bloco, registre-o nesta tabela na mesma tarefa. Ao alterar ou
  remover um bloco, atualize seus consumidores e a orientação de reuso.

<!-- markdownlint-enable MD013 -->
