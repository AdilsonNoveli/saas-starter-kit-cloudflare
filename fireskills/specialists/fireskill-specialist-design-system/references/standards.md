# Padrões para design systems de aplicações SaaS

<!-- markdownlint-disable MD013 -->

## Fonte macro

Leia `DESIGNSYSTEM.MD` antes de propor tokens, shell, componentes globais ou
composições de CRUD. Se o arquivo não existir, use
`.specsfy/templates/DESIGNSYSTEM.MD` e registre somente o contexto confirmado.

## Superfícies comuns

| Superfície | Composição mínima |
| --- | --- |
| lista de CRUD | `PageHeader` compartilhado + resumo útil + `DataGrid` em largura total, com `ID` e ações por linha |
| detalhe | `PageHeader` + `DetailLists` + status e próxima ação |
| criar e editar | `PageHeader` + seções com contexto e campos em duas colunas |
| dashboard | período ou escopo + filtros + `KPI` + tendência ou distribuição + detalhe |
| toda tela | `Breadcrumb` com equipe, módulo e tela atual |

Em Laravel, reutilize o `Breadcrumb` ou `Breadcrumbs` já presente no layout.

Todas as telas CRUD reutilizam o mesmo `PageHeader`, configurado por props ou
configuração, sem duplicar markup. A linha da listagem é link para o detalhe e
mantém editar e apagar como ações independentes. Durante o desenvolvimento,
confira bordas, espaçamentos, margens, padding e tipografia, mesmo sem pedido
específico, e registre o resultado no item `VISUAL`.

## Contratos de estado

Toda superfície deve declarar, quando aplicável, `loading`, vazio, erro,
sucesso, sem permissão, conteúdo parcial e alteração não salva. O erro de campo
fica associado ao controle, aparece abaixo dele e preserva a entrada. Erros
múltiplos ganham um resumo inicial com links para os campos.

## Formulários responsivos

Separe os grupos de informação em seções. A coluna de contexto explica o grupo
e o painel à direita contém os campos. Use duas colunas nos breakpoints largos,
uma coluna no mobile e largura total para texto longo, upload e mensagens.

## Fontes oficiais

- [Material Design 3](https://m3.material.io/)
- [Carbon Design System](https://carbondesignsystem.com/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)

<!-- markdownlint-enable MD013 -->
