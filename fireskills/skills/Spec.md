# Contrato central do framework Fireskills

Este arquivo contém as regras gerais carregadas por `AGENTS.md` e `CLAUDE.md`
nos projetos consumidores. Ele não é uma especificação de feature e não
substitui `specs/<estado>/<NNNN>-<slug>/spec.md`.

## Estrutura canônica

```text
specs/
├── inbox/
│   └── <AAAA-MM-DD-HHMMSS>-<slug>.md
├── backlog/
│   └── <NNNN>-<slug>.md
├── draft/
├── defined/
├── planned/
├── in-progress/
├── review/
└── completed/
    └── <NNNN>-<slug>/
        ├── spec.md
        └── research/
```

- `specs/inbox/` preserva inputs imediatamente, sem perguntas nem promoção.
- `specs/backlog/` organiza ideias escolhidas para refinamento.
- `specs/<estado>/<NNNN>-<slug>/spec.md` é a única fonte normativa de uma
  fatia. Ela existe em uma única pasta de estado.
- `research/` armazena apenas evidência consultada e indexada pela spec.
- O cabeçalho de `spec.md` é uma tabela Markdown de duas colunas, `Campo` e
  `Valor`; cada metadado ocupa uma linha da tabela.
- Não criar `plan.md`, `tasks.md`, `research.md`, `data-model.md` ou uma fonte
  normativa paralela.

## Estado, Effort e transição

O ciclo físico e o campo `Status` seguem a mesma ordem:

```text
draft → defined → planned → in-progress → review → completed
Draft → Defined → Planned → Implementing → Reviewing → Complete
```

Use `bun run fireskill transition <id> <pasta>` para transições adjacentes. O comando
move todo o pacote e atualiza `Status`. Use `bun run fireskill migrate` uma única vez
para mover o layout anterior `specs/specs/` para as pastas atuais.

Toda spec tem `Effort` de 1 a 10, `Effort updated at` e `Effort rationale` no
metadado. A pontuação estima a capacidade de raciocínio e execução necessária,
não prazo: 1–2 usa perfil `light`, 3–6 `standard`, 7–8 `high` e 9–10
`maximum`. Atualize-a com `bun run fireskill effort <id> <1-10> --reason "<motivo>"`
sempre que a descoberta, o plano ou a execução trouxer informação material.

`ClickUp Task` pode vincular a spec a uma tarefa externa. Quando houver skills
`clickupfy-*` instaladas, a skill responsável delega a sincronização da pasta e
do Effort. O estado local continua canônico quando a integração estiver ausente
ou pendente.

## Contexto persistente do projeto

- `PROJECT.md`, na raiz, mantém a história, a finalidade, as capacidades e os
  limites gerais do projeto.
- `.fireskills/STACK.md` mantém tecnologias estruturais e suas evidências.
- `.fireskills/RULES.md` mantém regras explícitas confirmadas pela pessoa
  responsável.
- `.fireskills/DATABASE.md` mantém o quadro tabular completo de persistência.
- `INTERFACE.md`, na raiz, é o mapa canônico do design system: stack de
  interface, tokens, componentes @nuxt/ui v4 usados, composições Vue SFC,
  arquivos-fonte, componentes reutilizáveis e telas que os consomem.
- `DESIGNSYSTEM.MD`, na raiz, mantém os defaults macro de interface, padrões
  comuns de CRUD e dashboard, estados e exceções com alcance.
- `.fireskills/PACKAGES.md` mantém o inventário de pacotes derivado dos
  manifests, lockfiles e metadados locais, com uma finalidade curta por pacote.
- `.fireskills/USER-PROFILE.md` mantém o nível de conhecimento confirmado, as
  respostas já dadas durante o setup e as fontes dessas respostas. O setup lê
  esse arquivo antes de perguntar e não repete assuntos já confirmados.
- `.fireskills/SPECKIT.md` aparece quando o projeto possui
  `.specify/memory/constitution.md`. Essa projeção lista a constituição e todos
  os arquivos regulares encontrados em `specs/`, sem alterar as fontes do
  GitHub Spec Kit.
- Antes de iniciar qualquer skill do framework, executar obrigatoriamente
  `$fireskill-setup` para verificar e reconciliar os contextos iniciais e
  os blocos reservados em `AGENTS.md` e `CLAUDE.md`. A única exceção é a própria
  `$fireskill-setup`, que não se chama recursivamente. Em uma transição automática,
  executar novamente o setup com a mesma raiz já confirmada antes de carregar a
  skill de destino. Em projetos com GitHub Spec Kit, a mesma execução atualiza
  apenas o bloco gerenciado de `SPECKIT.md` e exige a leitura dos arquivos
  originais.
  Executar `$fireskill-documentator` quando `PACKAGES.md` estiver ausente ou
  desatualizado.
- Executar `$fireskill-aux-stack` após mudanças estruturais de tecnologia,
  `$fireskill-aux-rules` para regras confirmadas e `$fireskill-aux-database` sempre
  que banco, schema, tabela, campo, relação ou migration mudar.
- Toda tarefa que cria ou altera a estrutura do banco inclui uma tarefa
  `[MIGRATION]` com arquivo
  versionado. A implementação aplica a migration no banco de teste e registra
  uma consulta de estado antes de concluir a tarefa ou o Delivery Gate.
- Executar
  `fireskills/skills/fireskill-setup/scripts/monitor_context.mjs --project . --check`
  no início, após cada tarefa de implementação e antes do Delivery Gate.
- Executar `$fireskill-documentator` depois de cada tarefa de implementação e
  sempre que o usuário pedir uma reconstrução técnica. A skill lê todo o
  projeto e mantém a projeção completa em `docs/` e `.specsfy/PACKAGES.md`,
  sem depender de uma spec.
- Não concluir uma tarefa enquanto o monitor exigir `STACK.md` ou `DATABASE.md`.
  Toda mudança de aplicação revisa `PROJECT.md`; quando não houver impacto
  material, registrar a justificativa na evidência da tarefa antes do
  reconhecimento explícito.
- Preservar conteúdo humano existente. Os blocos delimitados por
  `specsfy:*:start` e `specsfy:*:end` pertencem ao framework; conteúdo fora
  deles pertence ao projeto.

## Fluxo

```text
input → inbox → backlog → spec → validate → tasks → TDD/BDD → implement → documentator → progress
                                      ↑ update-spec ← mudança tardia
```

1. Use `fireskill-01-inbox` para preservar e pré-processar o texto em
   `specs/inbox/`, sem fazer perguntas.
2. Use `fireskill-02-backlog` para buscar material relacionado, registrar o item
   e aprofundar decisões por perguntas adaptativas. Quando a origem for um
   `MVP.md`, o refinamento lê a milestone, o backlog e as evidências importadas,
   registra automaticamente as respostas já declaradas e pergunta somente por
   lacuna, ambiguidade ou contradição aplicável.
3. Use `fireskill-03-specify` para criar e consolidar a spec normativa inicial.
4. Use `fireskill-04-validate` para comprovar a definição.
5. Use `fireskill-05-tasks` e `fireskill-06-tdd-bdd` para planejar, derivar
   testes TDD do BDD de referência e observar RED válido.
6. Use `fireskill-07-implement` para entregar em RED → GREEN → REFACTOR.
7. Use `fireskill-update-spec` quando a pessoa quiser adicionar, remover,
   corrigir ou mudar algo depois de a spec já ter sido definida. A skill
   incorpora o pedido na fonte normativa e reabre somente os atos afetados.
8. Use `fireskill-documentator` para reconstruir `docs/` e
   `.specsfy/PACKAGES.md` a partir do sistema existente após cada implementação
   ou por acionamento livre.
9. Use `fireskill-progress` somente para projetar o estado existente.
10. Use `fireskill-interviewer` para conversar com a spec nas fases `draft`,
    `defined`, `planned`, `in-progress` e `review`, antes da próxima skill.
11. Use `fireskill-mvp-milestone-interviewer` para definir o MVP por estados
   demonstráveis e `fireskill-roadmap-milestone-interviewer` para evolução após
   o MVP aceito. Use `fireskill-milestone-governor` para manter relações e a
   projeção `specs.md` sem substituir conteúdo humano.
12. Use `fireskill-data-discovery` quando uma Inbox, backlog, descoberta de MVP
    ou spec indicar informações que o produto precisa guardar. A conversa usa
    linguagem cotidiana e registra respostas confirmadas em
    `.specsfy/DATABASE.md`.

## Contrato de runtime Cloudflare Workers

Todo o código de servidor do Nuxfire roda em **Cloudflare Workers** (via SST 4).
Não existe servidor Linux, Docker, Swoole, PHP ou processo persistente.

Regras obrigatórias de runtime:
- `useDB()` cria um cliente `postgres.js` **por request** — nunca cachear globalmente em variável de módulo
- `closeDB()` deve ser chamado via `ExecutionContext.waitUntil()` nos hooks `afterResponse` e `error` do Nitro
- Sessões de autenticação estão no **Cloudflare KV** (`AuthKV`), não no Postgres — reset do banco NÃO limpa sessões
- Bindings NuxtHub devem ser nomeados exatamente `BLOB`/`KV`/`CACHE`
- Durations são **strings**, nunca números: `"120 seconds"`, não `120`
- Secrets sempre em `SCREAMING_SNAKE_CASE` em `.env.example`, `infra/secret.ts` e `Resource.*`
- `path.resolve()` não deve ser usado em caminhos de handlers Workers (quebra em Windows)
- Deploy é executado com `bun run deploy` → `sst deploy` → Cloudflare Workers

## Contrato de experiência de interface

Quando a entrega criar ou mudar uma interface usada por pessoas, a descoberta
não pode tratar a tela como detalhe de implementação. Antes de aprovar a
definição, a conversa deve esclarecer, somente nas lacunas reais:

1. quais telas existem e qual tarefa principal cada uma permite concluir;
2. como a informação entra, é consultada, muda e leva à próxima tela;
3. quais menus, itens, destinos, permissões e comportamentos responsivos
   orientam a navegação principal;
4. quais campos, agrupamentos, ajuda, validações, ações e recuperação de erro
   compõem cada formulário;
5. onde a ação acontece: página, painel lateral, modal, área expandida ou
   outra composição proposta pela pessoa;
6. como conteúdo, ações e dados se distribuem na tela em desktop e mobile;
7. como aparecem loading, vazio, erro, sucesso, permissão insuficiente e
   acessibilidade por teclado.

### Contrato CRUD

Quando a entrega incluir um CRUD, use os mesmos componentes em todas as telas
da superfície. O `PageHeader` deve ser um componente único e reutilizável para
lista, detalhe, criação e edição, com variações recebidas por props ou
configuração. Não replique o markup do cabeçalho em cada página.

- A listagem usa um `UTable` do `@nuxt/ui` com `:ui="enterpriseTableUi"`
  (de `@nuxfire/tokens`) que ocupa toda a largura disponível.
- A coluna `ID` fica visível em toda listagem, inclusive quando a tela também
  mostra nome, status ou outras informações do registro.
- A linha inteira funciona como link para o detalhe por mouse e teclado.
- Cada linha oferece ações independentes de editar e apagar. O botão de apagar
  respeita a permissão e confirma a consequência antes de executar.
- Componentes recorrentes de cabeçalho, tabela, linha, ações, formulário,
  estados e feedback são registrados em `INTERFACE.md` e reaproveitados antes
  de uma nova implementação.

### Revisão visual durante o desenvolvimento

A revisão visual é obrigatória em toda tarefa de desenvolvimento que possa
alterar uma interface, mesmo sem pedido da pessoa. O item `VISUAL` da tarefa
fica entre `VERIFY` e `EVIDENCE` para impedir o registro da entrega sem a
conferência.

Leia `DESIGNSYSTEM.MD`, `INTERFACE.md` e os componentes afetados. Compare a
interface renderizada ou inspecionada nos viewports e estados relevantes com o
sistema do projeto. A conferência precisa cobrir bordas, espaçamentos, margens,
padding e tipografia, incluindo família, peso, tamanho, altura de linha e
quebra de texto. Confira também alinhamento, overflow, foco, conteúdo curto e
conteúdo longo.

Registre na tarefa o método usado, o viewport, os estados percorridos, os
ajustes aplicados e o resultado. Quando a tarefa não tiver superfície visual,
marque o item `VISUAL` com `Não aplicável` e o motivo concreto. Essa análise
ocorre durante a implementação e novamente no fechamento do Delivery Gate;
pedido do usuário não é condição para acioná-la.

Antes da primeira pergunta dessa área, leia `.specsfy/STACK.md`,
`.specsfy/PACKAGES.md` quando existir, manifests, configurações e telas já
publicadas. Execute `node fireskills/skills/fireskill-setup/scripts/inspect_interface.mjs --project <raiz>` e use a saída para localizar as fontes relevantes. Quando houver sistema atual, percorra os fluxos e telas afetados,
incluindo navegação, conteúdo, componentes, permissões, estados e limites já
visíveis. Analise antes de sugerir ou escrever: descreva o que cada tela atual
permite fazer, o que precisa ser preservado e o que a entrega vai mudar.
Registre a camada de interface observada, incluindo framework,
roteamento, componentes, estilos, formulários e testes quando essas fontes
existirem. Proponha caminhos que respeitem e sigam a stack, o sistema atual e
os padrões locais; não introduza framework, biblioteca de componentes ou de
estilo por suposição. No Nuxfire a base é Vue 3 com `@nuxt/ui` v4 (Tailwind
vem por ele). Quando as fontes não definirem uma escolha, informe a lacuna e
pergunte à pessoa antes de sugerir uma base nova.

Use o `Contrato de perguntas numeradas`: uma pergunta por rodada, opções
textuais, `Escrever outra resposta`, `Gere outras opções` e `Avançar`. Faça no
máximo oito perguntas na área `Interface`; material já presente no pedido,
MVP, backlog ou produto existente não deve ser perguntado outra vez.

Registre a resposta textual, não apenas o número da opção. A spec declara no
cabeçalho se há interface para pessoas. Quando houver, a seção 10 precisa
conter telas, fluxo de informação, menus e navegação principal, formulários e
ações, composição, estados e acessibilidade. Uma entrega com interface inclui
suas telas e formulários: não se resume a rota, serviço ou persistência.

Toda interface usa Vue Single-File Components (SFC) com `@nuxt/ui` v4, que
fornece todos os componentes (`UButton`, `UModal`, `UTable`, `UForm`,
`UFormField` e demais). A página ou rota limita-se a obter dados e compor
componentes de domínio. Formulários, tabelas, filtros, ações em lote, diálogos,
painéis laterais, estados visuais e partes repetidas ficam em componentes
próprios. Antes de criar uma peça, leia `INTERFACE.md`, localize algo
reutilizável e registre nela cada arquivo criado ou reaproveitado, sua origem,
seus consumidores e o componente `@nuxt/ui` correspondente (para tabelas, o
`enterpriseTableUi`).

Orquestre `$fireskill-specialist-interface-experience` para analisar o sistema
atual e conduzir a descoberta; depois use `$fireskill-specialist-ux-design` para jornada e fluxo,
`$fireskill-specialist-ui-design` para composição e estados e
`$fireskill-specialist-nuxt-ui` (com `$fireskill-specialist-nuxt` para páginas,
middleware e composables) para materializar o que foi especificado. Esses
especialistas não substituem a conversa com a pessoa.
O resultado deve ser simples, funcional e completo para a tarefa proposta.

Um backlog não autoriza implementação nem cria uma segunda fonte normativa. A
importação de `MVP.md` é uma exceção operacional: depois de gerar e refinar
automaticamente cada backlog, ela pode criar uma spec em `Draft` para cada
item, sempre preservando `Definition Gate: Pending` e marcando lacunas como
`Pendente`. Essa geração não implementa código, não executa tarefas e não
passa gates; qualquer promoção posterior continua exigindo intenção explícita
do usuário.

## Contrato de perguntas numeradas

Toda skill que formular perguntas usa este contrato desde a primeira rodada,
inclusive para escolher arquivo, runner, autorização, confirmação ou próximo
passo.

1. Apresente exatamente uma pergunta numerada por rodada, com o rótulo
   `Pergunta 1`. Espere a resposta antes de formular qualquer outra pergunta.
2. Abaixo da pergunta, ofereça pelo menos três opções numeradas e
   específicas para o assunto apresentado.
3. Depois das opções sugeridas, acrescente como itens numerados
   `Escrever outra resposta`, `Gere outras opções` e `Avançar`.
4. Quando a pessoa escolher `Gere outras opções`, mantenha a mesma pergunta e
   apresente pelo menos três alternativas materialmente diferentes. Não registre
   essa escolha como resposta de produto nem avance para outra lacuna.
5. Mantenha `Avançar` disponível desde a primeira rodada. Na rodada seguinte,
   pergunte se a pessoa quer encerrar definitivamente as perguntas daquela
   área, responder depois ou voltar a responder agora. Inclua essa confirmação
   como a única pergunta da rodada.
6. Aceite respostas no formato `1.2`, `1. Escrever: <texto>` ou equivalente e
   releia a resposta antes da rodada seguinte. Quando a resposta for apenas o
   número de uma opção, resolva-a para o texto completo da opção antes de
   registrar contexto, Inbox, milestone, backlog, spec ou dado confirmado. O
   número pode ficar como rastreabilidade da interação, mas nunca substitui o
   significado escolhido.
7. Se a pessoa encerrar a área, registre
   `Área encerrada pelo usuário: <área>` no artefato aplicável e não volte ao
   assunto, salvo se ela o reabrir explicitamente. Se escolher responder
   depois, registre `Área adiada pelo usuário: <área>` e preserve os pontos
   abertos para retomada.
8. Encerrar ou adiar não autoriza preencher conteúdo por inferência nem aprovar
   um gate incompleto.
9. Faça no máximo oito perguntas por área de conversa. Ao alcançar o limite,
   apresente uma síntese, registre o que ficou aberto e pare o ciclo. Só faça
   perguntas adicionais quando a pessoa pedir explicitamente e informar quantas
   perguntas quer responder; esse novo pedido define outro limite finito.
10. Se restarem lacunas dentro do limite, priorize a de maior impacto e faça-a
    na rodada seguinte. Não antecipe outras perguntas nem complete a rodada com
    temas distintos.
11. Não use opções sem número, letras ou bullets soltos.
12. Produza em Português do Brasil toda pergunta, opção, síntese, orientação e
    artefato gerado. Uma citação literal de fonte em outro idioma pode ser
    preservada para proveniência, mas sua interpretação deve ser registrada em
    Português do Brasil.

Use este formato mínimo:

```text
Pergunta 1. <pergunta>
1. <opção sugerida>
2. <opção sugerida>
3. <opção sugerida>
4. Escrever outra resposta
5. Gere outras opções
6. Avançar
```

## Orquestração conversacional

Trate o fluxo como uma conversa contínua, não como uma lista de comandos que a
pessoa precisa copiar. Ao concluir uma responsabilidade ou encontrar uma
pendência pertencente a outra etapa:

1. releia backlog, spec, gates, tarefas e evidências aplicáveis para escolher a
   skill responsável pelo estado observado;
2. se a pendência couber na skill atual, avise
   `Pendência detectada: <descrição> — ação: resolvendo nesta etapa` e
   resolva-a imediatamente no próprio escopo;
3. se exigir outra skill, avise
   `Transição automática: $<origem> → $<destino> — motivo: <motivo> —
   resultado esperado: <resultado>`;
4. carregue imediatamente a skill de destino, sem pedir confirmação; não peça
   que a pessoa repita o comando;
5. continue na mesma conversa, preservando contexto, artefatos e decisões;
6. quando a skill de destino resolver uma pendência necessária à etapa de
   origem, avise
   `Retomada automática: $<destino> → $<origem> — pendência resolvida: <resultado>`
   e carregue imediatamente a skill de origem.

Aplique o mesmo protocolo a avanço ou retorno. Mudança surgida depois da
definição retorna para `$fireskill-update-spec`, que chama
`$fireskill-02-backlog` quando faltar decisão, `$fireskill-04-validate` após
mudança de comportamento e `$fireskill-05-tasks` após mudança somente de plano.
Teste ou RED ausente chama
`$fireskill-06-tdd-bdd` quando `Plan Gate` estiver `Pending`; se o Plan Gate já
estiver `Passed`, retorne primeiro para `$fireskill-05-tasks`, que reabre o Ato
II e chama TDD/BDD automaticamente. Depois de uma correção, retome
automaticamente a etapa que a detectou.

Não peça confirmação para o handoff. Se faltar uma decisão material que somente
a pessoa pode fornecer, carregue `$fireskill-02-backlog`. O refinamento do backlog
reanalisa o contexto acumulado e as novas respostas antes de cada rodada, até
o máximo de oito perguntas por área.
`Avançar` permanece disponível em cada pergunta desde a primeira rodada. Antes
de encerrar o ciclo atual, a rodada seguinte confirma se a pessoa encerra
definitivamente aquela área, responde depois ou volta a responder agora. A
primeira escolha fica registrada e impede novas perguntas sobre a área até uma
reabertura explícita. A segunda preserva as lacunas para retomada. Ambas mantêm
`Status: Draft` e `Definition Gate: Pending` quando houver pontos aplicáveis
em aberto. A etapa
chamadora não reabre o mesmo ciclo durante essa retomada. Isso não
transforma a escolha da próxima skill em decisão do usuário.
O handoff não autoriza ações destrutivas, publicação, deploy, instalação de
especialista ou outras mudanças externas: cada ação sensível continua exigindo
autorização específica. Carregue automaticamente o especialista de
`fireskills/specialists/`; se estiver ausente, informe nome, finalidade e
dependências, peça autorização específica e só então copie-o. Nunca altere
gates para contornar a etapa responsável. Após cada
handoff, reavalie o estado canônico; se origem, destino e pendência se repetirem
sem mudança observável, pare o ciclo e relate o impasse.

### Proteção do banco de desenvolvimento

Nenhuma etapa executa testes usando o banco de desenvolvimento. No Nuxfire, o
setup e cada skill que roda testes que acessam Postgres exigem um destino de
banco de teste explicitamente diferente do configurado nos secrets do stage
(`DATABASE_HOST`, `DATABASE_NAME` e afins). Enquanto essa separação não estiver
comprovada, nenhum teste que toque o banco pode ser executado. Os testes
Vitest atuais (billing, assentos de equipe, habilidades) não acessam o banco:
substituem `useDB`.

Comandos que apagam, recriam ou zeram banco e schema são sempre ignorados. A
recusa inclui `migrate:fresh`, `migrate:refresh`, `migrate:reset`,
`migrate:rollback`, `db:wipe`, `schema:drop`, `prisma migrate reset`,
`drizzle-kit push --force`, `drizzle-kit drop`, `DROP DATABASE`, `DROP SCHEMA`,
`DROP TABLE`, `TRUNCATE`, `RefreshDatabase`, `DatabaseMigrations` e
equivalentes. Autorização da pessoa não remove essa proteção. Em testes que
precisem de banco, use transação revertida ou registros de fixture restritos ao
caso, sempre no banco de teste dedicado.

## Três atos e estado

- **Ato I — Definir:** intenção, requisitos e Gherkin; termina em
  `Definition Gate: Passed`.
- **Ato II — Projetar e provar:** tarefas, testes TDD informados pelo BDD e RED; termina em
  `Plan Gate: Passed`.
- **Ato III — Entregar e validar:** GREEN, regressão e evidência; termina em
  `Delivery Gate: Passed`.

Estado canônico:

```text
Draft → Defined → Planned → Implementing → Complete
```

Mudança de comportamento reabre os Atos I–III. Mudança apenas de plano reabre
os Atos II–III. Gate posterior não permanece aprovado sobre entrada invalidada.

## Disciplina de execução

- Preserve a formulação do usuário e diferencie declaração, inferência,
  hipótese, decisão, conflito e questão aberta.
- Centralize no refinamento do backlog as perguntas sobre decisões materiais e
  aplique o Contrato de perguntas numeradas em cada rodada.
- Não invente requisitos, stakeholders, restrições ou evidência.
- Mantenha o Gherkin BDD somente na `spec.md` como contrato de referência; não
  crie nem execute arquivos `.feature`.
- Defina no mínimo três `AC` distintos para a feature inteira e para cada
  `US`, `FR` e `NFR`; conte somente IDs declarados em `**Cobre**`.
- Use o BDD como contexto para criar os testes TDD executáveis e observe RED
  válido antes da implementação.
- Materialize no mínimo três casos TDD executáveis para a feature inteira e
  para cada `US`, `FR` e `NFR`. Cada caso declara seu próprio marcador
`SPECSFY:`; um marcador compartilhado é considerado como um caso.
- Toda tarefa mantém o checklist `PREP`, `EXECUTE`, `VERIFY`, `VISUAL`,
  `EVIDENCE` e `IMPROVE`, nessa ordem. O item `VISUAL` registra a conferência
  de bordas, espaçamentos, margens, padding e tipografia ou a justificativa
  concreta para uma tarefa sem interface.
- Execute os testes derivados com Vitest (`bun run test`; o agregador da raiz é
  `vitest.config.mts` e cada layer traz o próprio `vitest.config.ts`). Não há
  PHP no Nuxfire.
- Mantenha tarefas, checklists, gates e evidência na própria `spec.md`.
- Preserve alterações preexistentes e instruções locais do projeto.
- Instale especialistas somente sob demanda; eles orientam padrões técnicos e
  não substituem a fonte normativa.

## Arquivos gerenciados

No Nuxfire o Fireskills vive dentro do repositório, em `fireskills/`. As skills
ficam em `fireskills/skills/`, os templates em `fireskills/skills/templates/` e
o exemplo não normativo em `fireskills/skills/examples/Spec.md`. Este contrato é
lido diretamente de `fireskills/skills/Spec.md`; não há cópia em `.specsfy/`. A
criação de um artefato resolve seu template nesta ordem:

1. `.specsfy/templates/custom/<Nome>.md`, customização do projeto.
2. `.specsfy/templates/<Nome>.md`, cópia local opcional.
3. `fireskills/skills/templates/<Nome>.md`, fonte padrão.

O diretório `.specsfy/templates/custom/` pertence ao projeto e nunca é
sobrescrito. A criação de uma spec copia e renderiza o template resolvido em
`specs/<estado>/<NNNN>-<slug>/spec.md`; o exemplo existe para inspeção, testes e
compreensão da arquitetura, nunca como fonte de uma feature.

O comando `fireskill` (`bun run fireskill`, código em `fireskills/cli/`) executa
o motor do fluxo: `transition`, `migrate`, `effort`, `progress`,
`milestones sync`, `test` e `config`. Não instala skills nem especialistas: eles
já estão no repositório.

O setup mantém blocos delimitados em `AGENTS.md` e `CLAUDE.md`. Conteúdo fora
desses blocos pertence ao usuário e nunca é substituído.
