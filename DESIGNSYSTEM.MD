# Design system do produto

<!-- markdownlint-disable MD013 -->

Este documento é a fonte normativa das escolhas macro de interface do projeto.
Ele orienta a composição de todas as telas antes do registro de componentes em
`INTERFACE.md`. Uma tela nova deve consultar este arquivo, as regras do domínio,
as permissões e as telas relacionadas.

## Classificação

| Campo | Valor |
| --- | --- |
| Escopo | Produto inteiro |
| Status | Ativo |
| Versão | 1.0.0 |
| Atualizado em | 2026-09-18 |
| Responsável | A preencher |

## Política de direção

- Quando a pessoa não informa direção visual, os defaults deste documento ficam
  ativos para a entrega.
- Uma direção explícita pode substituir um default. Registre a alteração em
  `Exceções da entrega`, informe o alcance e não transforme uma exceção local em
  regra do produto sem confirmação.
- Regras de negócio, permissões, estados e linguagem do produto orientam a
  interface junto dos tokens. A aparência nunca deve esconder a ação principal,
  o estado do dado ou o caminho de recuperação.
- `INTERFACE.md` registra componentes, blocos, telas e composição local. Ele não
  duplica as escolhas macro deste arquivo.

## Revisão visual obrigatória

A revisão visual acontece durante o desenvolvimento de toda interface, mesmo
sem pedido da pessoa. Em cada tarefa, compare a tela renderizada ou
inspecionada com este sistema e com `INTERFACE.md`.

- Conferir bordas, espaçamentos, margens e padding entre shell, regiões,
  componentes, campos, ações e estados.
- Conferir tipografia: família, peso, tamanho, altura de linha, espaçamento de
  letras, hierarquia e quebra de texto.
- Conferir alinhamento, largura, overflow, foco, zoom, conteúdo curto e
  conteúdo longo nos viewports suportados.
- Registrar método, viewport, estados, ajustes e resultado no item `VISUAL` da
  tarefa. Para uma tarefa sem superfície visual, registrar `Não aplicável` e o
  motivo concreto.

Essa conferência é parte da entrega e não depende de a pessoa solicitar uma
revisão visual.

## Linguagem visual SaaS

A interface deve ser informativa, reconhecível e operacional. A personalidade
vem da combinação de tipografia, contraste, ritmo, linguagem, hierarquia dos
dados e tratamento dos estados. Não dependa de decoração para criar identidade.

- Mostre primeiro a pergunta que a tela responde, depois os dados e as ações.
- Use densidade suficiente para trabalho recorrente, com respiro entre grupos e
  leitura clara em telas pequenas.
- Prefira nomes do domínio a rótulos genéricos como “Item”, “Dados” ou “Ação”.
- Exiba unidade, período, origem, atualização e consequência quando o dado
  precisar desse contexto.
- Preserve a posição, filtros e valores preenchidos depois de erro ou retorno.
- Diferencie ação primária, ação secundária e ação destrutiva por posição,
  hierarquia e cor semântica.

## Dashboard canônico

Um dashboard responde a uma pergunta operacional do produto. Ele não é uma
coleção de cartões sem contexto.

- Comece com `PageHeader`, período ou escopo visível e filtros próximos da
  região que eles alteram.
- Use uma faixa curta de indicadores `KPI` para mostrar valor, unidade,
  período, comparação, fonte e ação possível.
- Depois dos indicadores, mostre a tendência ou distribuição principal e uma
  `UTable` ou lista para investigação detalhada.
- Cada visualização informa loading, vazio, erro e atualização. Gráficos têm
  alternativa textual ou tabular e não dependem apenas de cor.
- Preserve filtros, período e posição ao atualizar ou retornar de um detalhe.
- Em telas pequenas, empilhe as informações na ordem da tarefa e evite
  overflow horizontal sem necessidade. A responsividade preserva leitura,
  controles e ações nos breakpoints suportados.

## Componentes base e blocos comuns

Use a base disponível no projeto antes de criar uma composição nova. Os
componentes do `@nuxt/ui` atendem controles e superfícies fundamentais, como
`UButton`, `UInput`, `UFormField`, `USelect`, `UModal`, `USlideover`, `UTabs`,
`UTable`, `UCard`, `UBadge`, `UAlert`, `USkeleton`, `UTooltip`, `UPagination` e
`UBreadcrumb`.

Composições como `PageHeader`, navegação, filtros, `UTable`, cartões de
indicadores, painéis e estados de feedback partem desses componentes e do tema
do projeto (`packages/tokens`). Adapte a composição aos tokens, dados,
permissões e linguagem do produto. Não adicione uma dependência somente pela
aparência de um exemplo.

Ao reutilizar um primitive ou bloco, registre em `INTERFACE.md` sua origem,
arquivo, API, estados, comportamento de teclado e telas consumidoras. Uma
composição de catálogo serve como base; ela não substitui as regras deste
documento nem a arquitetura da aplicação.

## Boas práticas de interface

- Dê a cada tela um título orientado à tarefa, uma ação principal e um caminho
  claro de retorno.
- Use hierarquia visual consistente, alinhamento previsível, contraste
  suficiente, áreas de toque confortáveis e texto legível em zoom.
- Garanta navegação por teclado, foco visível, ordem de foco coerente,
  mensagens associadas aos campos e nomes acessíveis para controles.
- Não use cor, ícone ou posição como único meio de comunicar estado; combine
  texto, semântica e indicação visual.
- Mantenha feedback próximo da ação, evite bloquear o fluxo sem necessidade e
  respeite `prefers-reduced-motion`.
- Teste conteúdo curto e longo, telas pequenas e grandes, loading, vazio, erro,
  sucesso, disabled e ausência de permissão.

## Shell global

Todas as páginas autenticadas seguem o shell do produto, salvo exceção
registrada abaixo.

- O shell possui navegação persistente, área de trabalho, retorno de foco e
  caminho de navegação coerente.
- Cada tela começa com `PageHeader`, contendo contexto, título orientado à
  tarefa, descrição útil e ação primária quando houver.
- Ações secundárias ficam próximas do título ou da região que afetam. A ação
  destrutiva exige distinção visual e confirmação com consequência explícita.
- A página deve declarar loading, vazio, erro, sucesso, ausência de permissão,
  conteúdo parcial e alterações não salvas quando esses estados fizerem parte
  do fluxo.

### Breadcrumb obrigatório

- Toda tela da aplicação exibe um `Breadcrumb` dentro do shell global. A trilha
  usa nomes reais do produto e termina no título da tela atual.
- A hierarquia sempre inclui a equipe ativa antes do módulo e da tela, com o
  nome da equipe visível e um link para o contexto inicial dela. Nenhuma tela
  autenticada pode ocultar a equipe por reduzir a trilha.
- Procure primeiro o breadcrumb existente, o layout que já o renderiza e o tipo
  de seus itens (ou use `UBreadcrumb`). Reaproveite essa estrutura,
  suas rotas e seus tokens; não crie uma segunda implementação paralela.
- Preserve a equipe e a tela atual em viewport estreito. Se os itens do meio
  precisarem ser recolhidos, use elipse acessível, sem remover os dois extremos
  nem o nome da equipe.
- O item atual usa estado sem link, `aria-current="page"` e nome acessível. Os
  itens anteriores são links reais, respeitam permissão e não dependem apenas
  de ícones ou cor.

## CRUD canônico

| Superfície | Composição obrigatória | Regras de uso |
| --- | --- | --- |
| Lista | `PageHeader` + resumo útil + `UTable` | Usar para comparação densa, busca, filtros, ordenação, paginação, seleção e ações por registro. Ações em lote devem deixar escopo e resultado claros. |
| Detalhe | `PageHeader` + `DetailLists` | Organizar atributos por assunto, destacar status e próxima ação. Adicionar atividade, relações ou histórico quando o domínio exigir. |
| Criar | `PageHeader` + seções de formulário em duas colunas responsivas | Cada seção tem coluna de contexto, painel de campos, labels visíveis, ajuda junto do campo e submit com estado de envio. |
| Editar | `PageHeader` + seções de formulário em duas colunas responsivas | Reaproveitar a estrutura de criar, exibir valores atuais, preservar alterações após falha e informar o resultado da gravação. |

### Reuso e ações obrigatórias do CRUD

- Todas as telas de um CRUD usam o mesmo componente `PageHeader` reutilizável.
  Lista, detalhe, criação e edição variam título, descrição, breadcrumbs e
  ações por props ou configuração, sem duplicar markup.
- Componentes recorrentes de tabela, linha, ações, formulário, estados e
  feedback são criados uma vez, registrados em `INTERFACE.md` e reaproveitados
  por todas as telas compatíveis.
- O `UTable` da listagem (`enterpriseTableUi`) ocupa toda a largura disponível. A coluna `ID` fica
  visível sempre, inclusive com outras colunas de negócio.
- A linha inteira é o link para o detalhe por mouse e teclado. Botões
  independentes de editar e apagar ficam na própria linha e não propagam o
  clique para o detalhe.
- Apagar respeita permissão, mostra o registro alvo e confirma a consequência
  antes da execução.

### Navegação da lista

- Quando a linha representa um registro com detalhe, a linha inteira é uma ação
  de navegação para esse detalhe. O clique em qualquer célula e a ativação por
  teclado têm o mesmo resultado.
- Use um link acessível sobre a área da linha, como `data-row-link`, sem colocar
  um link dentro de outro ou transformar o `tr` em um elemento inválido.
- Checkboxes, menus, botões e outros controles da própria linha ficam dentro de
  `TableRowAction` ou equivalente, acima do link da linha, e não navegam para o
  detalhe ao serem usados.
- A linha só é clicável quando existe um destino claro. O estado hover, foco e
  seleção devem permanecer perceptíveis sem depender apenas de cor.

### Estrutura dos formulários

Criar e editar usam seções separadas para reduzir a carga de leitura e tornar a
revisão do registro previsível.

- Cada seção usa uma coluna de contexto à esquerda, com título e descrição, e
  um painel de formulário à direita.
- O painel organiza campos relacionados em duas colunas nos breakpoints largos,
  usando `grid-cols-2` ou a composição equivalente, e em uma coluna no mobile.
- Campos longos, ajuda extensa, upload, tabelas internas e mensagens de erro
  ocupam a largura total quando a tarefa exigir.
- Campos dependentes permanecem próximos e seguem a ordem natural de leitura;
  a grade nunca deve separar label, ajuda e erro do campo.
- O rodapé da seção ou do formulário mantém cancelar, salvar, loading, sucesso e
  erro próximos da ação. Em edição, alterações não salvas ficam protegidas.

### Formulários

- Labels são visíveis e não dependem de placeholder.
- Campos obrigatórios, formato aceito e origem do valor ficam claros antes do
  envio.
- A validação aponta o campo com borda, fundo ou ícone semântico vermelho e
  mostra a mensagem de erro abaixo do campo. O texto também deve ser anunciado
  por tecnologia assistiva.
- Quando houver vários erros, um resumo no início oferece links para cada campo.
- O foco vai para o primeiro erro após o envio. O valor digitado permanece salvo
  sempre que o servidor permitir nova tentativa.
- O botão de envio informa carregamento, sucesso ou falha sem duplicar pedidos.

## Estados e mensagens

| Estado | Conteúdo mínimo |
| --- | --- |
| Loading | Estrutura próxima do conteúdo final e indicação do que está sendo carregado. |
| Vazio | Motivo, orientação e ação para começar, quando existir. |
| Erro | O que falhou, ação de recuperação e suporte para contato quando necessário. |
| Sem permissão | Explicação curta sem expor dados protegidos e caminho para solicitar acesso. |
| Sucesso | Resultado concreto, próximo passo e retorno ao contexto anterior. |
| Parcial | Dados disponíveis, parte ausente e forma de atualizar. |
| Não salvo | Alterações pendentes, saída protegida e opção clara de continuar ou descartar. |

## Regras de negócio expostas na interface

- Ações visíveis respeitam papel, permissão e estado do registro.
- Transições de status exibem estado atual, próximo estado possível e efeito da
  operação.
- Exclusão, cancelamento e ações irreversíveis mostram consequência, alvo e
  confirmação antes de executar.
- Duplicidade, conflito de versão e falha de validação retornam à tela com os
  dados preservados.
- Histórico, autoria e data aparecem quando a atividade altera a leitura do
  registro.

## Cenários canônicos

### Lista com registros

```gherkin
Dado que a pessoa tem permissão para consultar registros
Quando abre a rota de lista
Então vê um PageHeader com contexto e ação principal
E vê um Breadcrumb com o nome da equipe e o título da tela
E vê os registros em uma tabela com busca, filtros e ordenação adequados
E consegue identificar status, atualização e ação disponível por linha
```

### Lista vazia

```gherkin
Dado que não há registros para o escopo atual
Quando a pessoa abre a lista
Então vê uma mensagem que explica o motivo do vazio
E vê a ação para criar o primeiro registro quando tiver permissão
```

### Visualização de detalhe

```gherkin
Dado que a pessoa tem acesso a um registro
Quando abre seu detalhe
Então vê o PageHeader com identificação, status e ações possíveis
E vê os atributos organizados em DetailLists
E encontra relações ou atividade quando o domínio exigir
```

### Criação válida

```gherkin
Dado que a pessoa tem permissão para criar
Quando preenche as seções do formulário em duas colunas e envia
Então vê o resultado da gravação
E é levada ao detalhe ou à lista conforme o fluxo definido
```

### Criação ou edição com erro de campo

```gherkin
Dado que a pessoa enviou um campo inválido
Quando o servidor retorna a falha
Então o campo fica com estado visual vermelho
E a mensagem aparece abaixo do campo
E o foco chega ao primeiro erro
E os demais valores permanecem preenchidos
```

### Sem permissão

```gherkin
Dado que a pessoa não possui a permissão necessária
Quando tenta abrir ou executar a ação
Então vê uma mensagem sem dados protegidos
E não recebe controles que não pode usar
```

### Erro de carregamento

```gherkin
Dado que a fonte de dados falhou
Quando a pessoa abre a tela
Então vê o estado de erro com causa compreensível
E encontra uma ação para tentar novamente
```

## Tokens e componentes

Tokens de cor, tipografia, espaçamento, raio, foco e movimento devem ser
reaproveitados antes de criar valores locais. Componentes acessíveis e
composições de catálogo devem ser registrados em `INTERFACE.md` com origem,
props, eventos, estados e consumidores reais. A revisão visual precisa
confirmar bordas, espaçamentos, margens, padding e tipografia contra esses
tokens antes do item `EVIDENCE` da tarefa.

Origem deste bloco: `_docs/docs/DESIGN_SYSTEM.md`, **conferido contra
`packages/tokens` em 2026-09-18** (a versão de origem citava `packages/design-tokens`,
`packages/app` e `packages/auth-frontend`, que hoje são `packages/tokens`,
`apps/app` e `apps/login`).

### Onde os tokens vivem

Fonte única: o pacote de workspace `@nuxfire/tokens` (`packages/tokens`),
consumido por `apps/app`, `apps/web` e `apps/login`.

- `packages/tokens/theme.css`: fontes, paletas `flame`, `fire` e `night`, raio de
  borda (`--ui-radius`) e o mapeamento de superfície, texto e borda dos modos
  claro e escuro (`--ui-*`).
- `packages/tokens/index.ts`: `sharedUiConfig` (bloco `ui` espalhado no
  `app.config.ts` de cada app: `icons`, `colors`, `button`, `card`, `avatar`,
  `dashboardSidebar`, `navigationMenu`, `tabs`) e `enterpriseTableUi` (o `:ui` de
  toda `UTable`).
- Cadeia de CSS de cada app, nesta ordem: `@import "tailwindcss"`,
  `@import "@nuxt/ui"`, `@import "@nuxfire/tokens/theme.css"`. O `theme.css` vem
  depois para sobrescrever os defaults do Nuxt UI.
- `theme.css` declara `@source "./index.ts";`: sem essa linha o Tailwind não
  escaneia o pacote (chega por symlink) e uma classe que só existe em `index.ts`
  vai para o DOM sem regra de CSS.

### Identidade e regras visuais

Regras de marca do documento de origem (declaradas, não verificadas por teste):

- Fogo + engenharia + execução; "a cor pode ser intensa, o design precisa ser calmo".
- Vermelho (`flame`) e laranja (`fire`) são a marca. **Verde é exclusivamente
  feedback de sistema** (sucesso); nunca cor decorativa.
- Erro usa `red` padrão, **não** `flame` (`flame` = ação e identidade, `red` =
  destrutivo e erro).
- Sem chamas literais, partículas, glow exagerado nem glassmorphism; gradiente com
  intenção, nunca como wallpaper.
- Sem sombra em superfícies estáticas (cards, seções, painéis): a separação vem de
  borda/`ring` de 1px. Modais, dropdowns, popovers e tooltips mantêm sombra.
- Ícones monoline **Lucide** (`i-lucide-*`); nunca preenchidos ou 3D.

### Cores

`ui.colors` (verificado em `sharedUiConfig`): `primary: flame`, `secondary: fire`,
`success: green`, `info: blue`, `warning: amber`, `error: red`, `neutral: night`.

| Shade | `flame` | `fire` |
| --- | --- | --- |
| 50 | `#fff1f1` | `#fff8ed` |
| 100 | `#ffe1e1` | `#ffefd1` |
| 200 | `#ffc7c7` | `#ffdba3` |
| 300 | `#ffa0a0` | `#ffc06b` |
| 400 | `#ff6f6f` | `#ffa333` |
| 500 | `#ff4d4d` | `#ff8904` |
| 600 | `#f13a3a` | `#e67200` |
| 700 | `#d92626` | `#bf5c00` |
| 800 | `#991b1b` | `#99490a` |
| 900 | `#7a1616` | `#7a3c10` |
| 950 | `#450b0b` | `#431e08` |

Neutro `night` (cinza frio puro, definido **uma vez** em `theme.css` e usado pelos
três apps): 50 `#fafafa`, 100 `#f8f8f8`, 200 `#e6e6e6`, 300 `#cccccc`,
400 `#888888`, 500 `#555555`, 600 `#333333`, 700 `#1a1a1a`, 800 `#0d0d0d`,
900/950 `#000000`. (O documento de origem dizia que `apps/web` e `apps/login`
tinham uma escala quente própria: isso está desatualizado, `apps/web` só importa o
`theme.css`.)

### Raio de borda

Um único token, `--ui-radius: 0.1875rem` (3px), em `theme.css`. O Nuxt UI deriva
toda a escala `rounded-*` dele (`rounded-lg` = 2x = 6px, `rounded-xl` = 3x = 9px,
e assim por diante). Mudar essa variável muda cards, botões, inputs, modais e
badges de uma vez.

### Modo escuro e acessibilidade (valores de `theme.css`)

Canvas escuro `night-800` (`#0d0d0d`); `--ui-bg-elevated` `night-700`,
`--ui-bg-accented` `night-600`. Bordas: `--ui-border` `night-600` (`#333333`),
`--ui-border-muted` `night-700`, `--ui-border-accented` `night-500`. Texto
(contraste sobre o canvas, medido no app): `highlighted` `night-50` 18.7:1,
`text` `night-200` 15.6:1, `muted` `night-300` 12.1:1, `dimmed` `night-400`
5.48:1, todos acima do piso AA de 4.5:1. **Dark mode é obrigatório em toda UI**
(`.specsfy/RULES.md`). Não comunicar erro ou sucesso só por cor; manter foco
visível por teclado; respeitar `prefers-reduced-motion`.

### Overrides de componente (`sharedUiConfig`)

| Componente | Mudança | Motivo |
| --- | --- | --- |
| `UCard` (`outline`, `subtle`, `soft`) | `bg-elevated` (com `ring ring-default` em `outline`/`subtle`) | O padrão deixava o card no mesmo tom da página (contraste 1:1). O override fica na **variante**, não em `slots`, porque a classe de variante é aplicada depois da de slot. |
| `UAvatar` (`neutral`, sem imagem) | `bg-accented` | O fallback padrão tinha o tom do card e ficava invisível dentro dele. |
| `UNavigationMenu` (vertical) | ícones e linha colapsada como quadrado maior, item ativo com `ring` | A sidebar colapsada lê como enterprise. |
| `UTabs` | variante `link` (sublinhado) | Bloco cheio de cor de marca dentro de card pesa demais. |
| `UTable` (`enterpriseTableUi`) | cabeçalho `text-xs uppercase tracking-wider`, hover de linha, sem separador | Cabeçalho lê como rótulo de coluna. Passado por `:ui` (uma prop de instância sempre vence). |

### Tipografia

Interface: **Geist** (fallback `Montserrat` e `system-ui`); monoespaçada: **Geist
Mono** (fallback `JetBrains Mono`), declaradas em `theme.css`.

### Como rebrandar

- Cor de acento em todo o produto: escalas `flame-*` e `fire-*` em
  `packages/tokens/theme.css`.
- Raio: `--ui-radius` no mesmo arquivo.
- Estilo padrão de um componente Nuxt UI: `sharedUiConfig` ou `enterpriseTableUi`
  em `packages/tokens/index.ts`.
- Algo só em um app: espalhar `sharedUiConfig` no `app.config.ts` daquele app e
  acrescentar chaves depois do spread.

## Exceções da entrega

| Data | Tela ou fluxo | Default substituído | Nova regra | Alcance | Motivo | Autor |
| --- | --- | --- | --- | --- | --- | --- |
| A preencher | A preencher | A preencher | A preencher | Entrega, tela ou produto | A preencher | A preencher |

## Histórico

| Versão | Data | Alteração | Alcance |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-18 | Criação dos defaults de SaaS e dos cenários CRUD; bloco `Tokens e componentes` migrado de `_docs/docs/DESIGN_SYSTEM.md` e conferido contra `packages/tokens` | Produto |

<!-- markdownlint-enable MD013 -->
