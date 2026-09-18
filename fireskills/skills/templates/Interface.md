# Interface do projeto

<!-- markdownlint-disable MD013 -->

Este arquivo é a fonte canônica para construir e reaproveitar a interface.
Atualize-o antes e depois de cada tarefa que criar ou mudar uma tela Vue.
Leia `.specsfy/DESIGNSYSTEM.MD` antes de escolher a composição macro. Este arquivo
registra componentes, blocos e telas locais; as regras globais de SaaS vivem em
`.specsfy/DESIGNSYSTEM.MD`.

## Base observada

- Stack: {{STACK_LABEL}}
- Política: toda interface é composta por Vue Single-File Components com `@nuxt/ui` v4.
- Componentes: `@nuxt/ui` (`UButton`, `UModal`, `UTable`, `UForm` e demais).
- Tema: `packages/tokens` (`sharedUiConfig`, `theme.css`, `enterpriseTableUi`).

{{STACK_GUIDANCE}}

## Design system

| Item | Localização ou valor | Uso no projeto |
| --- | --- | --- |
| Tokens e tema | A mapear | Cores, tipografia, espaçamento, raio e tema |
| Configuração `@nuxt/ui` | `apps/app/app/app.config.ts` | `ui:` (spread de `sharedUiConfig`) |
| Ícones | A mapear | Coleção `lucide` (`i-lucide-*`) |
| PageHeader compartilhado | `.specsfy/DESIGNSYSTEM.MD` | Um componente reutilizável para lista, detalhe, criação e edição |
| Padrão de dashboard | `.specsfy/DESIGNSYSTEM.MD` | `PageHeader`, filtros, `KPI`, visualização principal e investigação detalhada |
| Padrão de linha | `.specsfy/DESIGNSYSTEM.MD` | `UTable` com `enterpriseTableUi` em largura total, coluna `ID`, detalhe clicável por linha e ações de editar e apagar |
| Padrão de formulário | `.specsfy/DESIGNSYSTEM.MD` | Seções, coluna de contexto e painel em duas colunas responsivas |
| Padrão de contexto | `.specsfy/DESIGNSYSTEM.MD` | `Breadcrumb` em todas as telas, com equipe, módulo e tela atual |
| Componentes compartilhados | A mapear | Componentes em `app/components/` do app ou da layer |
| Composições de domínio | A mapear | Componentes em `layers/<layer>/app/components/` |

## Blocos criados e reaproveitáveis

Registre todos os blocos criados no projeto, inclusive os internos de uma
feature. Um bloco é um componente Vue com responsabilidade própria, como
grade, formulário, filtro, cabeçalho, cartão, diálogo, painel lateral, estado
vazio, upload ou ação em lote.

| Bloco | Tipo | Arquivo | Origem | Finalidade e API pública | Estados e acessibilidade | Consumidores | Reaproveitar ou estender |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A mapear | Componente base, composição ou domínio | A mapear | `@nuxt/ui` ou próprio | Props, eventos e dados esperados | Foco, teclado, loading, vazio, erro e sucesso | Telas e outros blocos | Quando usar; qual bloco estender antes de criar outro |

## Telas e composição

| Tela ou rota | Arquivo | Componentes Vue usados | Dados e ações | Estados |
| --- | --- | --- | --- | --- |
| A mapear | A mapear | A mapear | A mapear | Carregando, vazio, erro e sucesso |

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
