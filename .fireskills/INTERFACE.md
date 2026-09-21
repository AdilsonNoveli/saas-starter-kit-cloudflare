# Interface do projeto

<!-- markdownlint-disable MD013 -->

Fonte canônica para construir e reaproveitar a interface. Atualize-o antes e depois de cada tarefa que criar ou mudar uma tela Vue. Tokens, tema e regras de customização: `.fireskills/DESIGNSYSTEM.MD`.

## Base observada

- Toda interface é composta por Vue Single-File Components com `@nuxt/ui` v4.
- Ícones Lucide (`i-lucide-*`).
- Componentes compartilhados em `apps/app/app/components/`; composições de domínio em `layers/<layer>/app/components/`. Rotas por arquivo em `apps/app/app/pages/` e `layers/*/app/pages/`.

## Blocos criados e reaproveitáveis

Registre todo bloco criado, inclusive os internos de uma feature: componente Vue com responsabilidade própria, como grade, formulário, filtro, cabeçalho, cartão, diálogo, painel lateral, estado vazio, upload ou ação em lote. Os blocos que o starter já traz estão nos diretórios acima; leia-os antes de criar um equivalente.

| Bloco | Tipo | Arquivo | Origem | Finalidade e API pública | Estados e acessibilidade | Consumidores | Reaproveitar ou estender |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ConfirmDialog` | Composição de domínio (app) | `apps/app/app/components/ConfirmDialog.vue` | próprio, sobre `@nuxt/ui` | Diálogo de confirmação singleton, montado uma vez em `app.vue`. Nunca é importado por uma página: chame `useNotification().confirm({ title, ... })`. | A mapear | `apps/app/app/app.vue` | Usar `useNotification().confirm` em vez de criar outro diálogo |

## Telas e composição

Registre cada tela criada ou alterada.

| Tela ou rota | Arquivo | Componentes Vue usados | Dados e ações | Estados |
| --- | --- | --- | --- | --- |

## Regras de composição

1. Páginas e rotas coordenam dados e compõem componentes; não concentram a grade, formulário, filtros, overlays ou cartões reutilizáveis.
2. Antes de criar um componente, consulte esta tabela e os diretórios de componentes; reaproveite o existente quando ele atender à mesma intenção.
3. Todo componente `@nuxt/ui` reaproveitado ou criado entra na tabela com seu arquivo, origem, explicação, API, estados e consumidores reais.
4. Ao criar um bloco, registre-o nesta tabela na mesma tarefa. Ao alterar ou remover um bloco, atualize seus consumidores e a orientação de reuso.

<!-- markdownlint-enable MD013 -->
