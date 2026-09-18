# Design system de interface

`DESIGNSYSTEM.MD` é o documento do projeto consumidor que guarda as regras
macro de interface. Ele orienta cada tela nova junto das regras do domínio,
permissões, estados e telas relacionadas.

## Onde fica

Depois de `specsfy install`, o template fica disponível em
`.specsfy/templates/DESIGNSYSTEM.MD`. Ao executar o setup, o Specsfy cria
`DESIGNSYSTEM.MD` na raiz somente se ele ainda não existir. O arquivo é humano,
pertence ao projeto e passa a ser mantido pela skill especialista, não pelo lock
do CLI.

Instale a skill quando for criar ou revisar uma interface:

```bash
specsfy skills install specsfy-specialist-design-system
```

Se a entrega já usa a coordenação completa de interface, instale:

```bash
specsfy skills install specsfy-specialist-interface-experience
```

O catálogo resolve o especialista de design system junto das dependências de UX
e UI.

## Como funciona

Antes de projetar uma tela, o agente lê `DESIGNSYSTEM.MD`. Se você não informar
uma direção visual, os defaults do arquivo são aplicados e registrados como
direção padrão da entrega. Se você pedir algo diferente, a alteração entra em
`Exceções da entrega` com alcance definido. Uma exceção de tela não muda o
produto inteiro.

`INTERFACE.md` continua registrando componentes, blocos, telas, props, eventos,
estados e consumidores locais. Ele aponta para o design system e não repete as
regras macro.

## Defaults para CRUD

| Tela | Composição padrão |
| --- | --- |
| Lista | `PageHeader` compartilhado + resumo útil + `DataGrid` em largura total |
| Detalhe | `PageHeader` compartilhado + `DetailLists` |
| Criar | `PageHeader` compartilhado + seções de formulário em duas colunas responsivas |
| Editar | `PageHeader` compartilhado + seções de formulário em duas colunas responsivas |

O `PageHeader` é um componente único, configurado por props ou configuração
para título, descrição, breadcrumb e ações. Lista, detalhe, criação e edição
reutilizam essa mesma implementação; não duplicam sua marcação.

A lista sempre mostra o `ID` em uma coluna visível do `DataGrid`. Cada linha
inteira é o link para o detalhe, com suporte a mouse e teclado. Os botões
`Editar` e `Apagar` ficam na própria linha como ações independentes e não
disparam a navegação do detalhe. A permissão e a confirmação da ação destrutiva
também fazem parte do contrato.

Formulários usam labels visíveis acima dos campos. Quando um campo falha, ele
fica com estado visual vermelho e mostra a mensagem abaixo do campo. O foco vai
para o primeiro erro, os outros valores permanecem preenchidos e o resumo de
erros oferece links quando há várias falhas.

Toda tela também exibe um `Breadcrumb` no shell global. A trilha mantém o nome
da equipe ativa visível entre o contexto inicial e o módulo, seguida do título da
tela atual. Em Laravel, o padrão deve reaproveitar o `Breadcrumb` ou
`Breadcrumbs` que já existir no layout, suas rotas e sua tipagem, sem criar uma
segunda implementação.

As linhas do `DataGrid` abrem o detalhe inteiro por clique ou teclado. Botões,
checkboxes e menus da linha permanecem ações independentes, acima do link de
detalhe.

Criar e editar são divididos em seções. Cada seção tem contexto à esquerda e
um painel de campos à direita; os campos relacionados usam duas colunas em telas
largas e uma coluna no mobile. Campos longos, uploads e erros podem ocupar toda
a largura.

## Defaults para dashboards e blocos

Dashboards começam com `PageHeader`, período ou escopo, filtros, indicadores
`KPI` contextualizados, uma visualização principal e uma lista ou `DataGrid`
para investigação. Use primitives do `shadcn/ui` para controles fundamentais e
blocos gratuitos do ReUI para composições comuns de CRUD e dashboard quando
forem compatíveis com a stack. Registre origem, estados, acessibilidade e
consumidores em `INTERFACE.md`.

## Cenários a cobrir

Uma entrega de interface registra o recorte aplicável dos cenários do template:

- lista com registros e lista vazia;
- detalhe com status, ações e relações relevantes;
- criação e edição válidas;
- criação ou edição com erro de campo;
- ausência de permissão;
- falha de carregamento;
- alteração não salva;
- ação destrutiva e seu resultado.

Para cada cenário, descreva pré-condição, ação, resposta, estado visual, foco,
mensagem e próximo passo. A personalidade do produto vem dos dados, da
linguagem, dos tokens, do ritmo e da hierarquia, não de uma decoração genérica.

## Revisão visual durante o desenvolvimento

Toda tarefa que altera interface passa por uma revisão visual durante o
desenvolvimento, mesmo sem pedido específico. Confira bordas, espaçamentos,
margens, padding e tipografia, incluindo família, peso, tamanho, altura de
linha, espaçamento entre letras, hierarquia e quebra de texto. Confira também
alinhamento, largura, overflow, foco, zoom e conteúdo curto ou longo nos
viewports e estados aplicáveis.

Registre no item `VISUAL` da tarefa o método usado, os viewports, os estados,
os ajustes feitos e o resultado. Quando a tarefa não tem interface, registre
`Não aplicável` e o motivo concreto.

## Quando não usar

Não use `DESIGNSYSTEM.MD` para listar props ou arquivos de um componente. Não
use `INTERFACE.md` como substituto das regras macro. Não crie uma tela CRUD sem
consultar a fonte, sem tratar estados ou sem registrar uma exceção ao default.

## Conferência

Antes de concluir uma tela, confira:

- `DESIGNSYSTEM.MD` existe e foi lido.
- A tela exibe `Breadcrumb` com equipe, módulo e tela atual; em Laravel, o
  componente existente foi reaproveitado.
- A composição corresponde à superfície CRUD.
- Loading, vazio, erro, sucesso, permissão e não salvo foram cobertos quando
  aplicáveis.
- A direção padrão ou a exceção tem alcance registrado.
- `INTERFACE.md` recebeu os componentes e telas locais.
