# Fireskills Skills

Este módulo mantém a metodologia executável do Fireskills (derivada do
Specsfy): skills, scripts determinísticos, referências, assets e metadata para
agentes.

A visão geral está em [`README.md`](../README.md) e a documentação de uso em
[`docs/`](../docs/).

## Responsabilidade

Este módulo possui:

- as instruções operacionais das quatorze skills base, do setup, do
  documentador e das três auxiliares.
- **(ausente neste repositório)** os templates de inbox, backlog, spec, tarefas,
  projeto, stack, regras, banco e interface em `templates/`, e o exemplo em
  `examples/Spec.md`: os scripts que os leem falham até que sejam restaurados
  (ver `PLANO-REFATORACAO.md`, "Pendências").
- o MCR-10 e referências dos gates.
- scripts de validação, rastreabilidade, evidência e progresso.
- metadata de descoberta em `agents/openai.yaml`.
- BDD, testes e fixtures que validam as próprias skills.

Specs pertencem ao projeto consumidor (aqui, o Nuxfire). Conhecimento técnico
pertence a [`specialists/`](../specialists/).

## Metodologia executável

O fluxo preservado pelas skills é:

```text
capturar imediatamente em specs/inbox
  → refinar no backlog
  → refinar
  → especificar
  → validar definição
  → planejar tarefas
  → usar o BDD da spec para provar TDD RED
  → implementar GREEN
  ↳ atualizar a spec e reabrir o fluxo quando surgir um pedido tardio
  → reconstruir a documentação técnica
  → validar entrega
  → consultar progresso
```

Cada fatia usa uma única fonte normativa em
`specs/<estado>/<NNNN>-<slug>/spec.md` e atravessa:

```text
Draft → Defined → Planned → Implementing → Complete
```

Nenhum `Definition Gate`, `Plan Gate` ou `Delivery Gate` passa sem evidência
compatível com o ato correspondente.

Tarefas de implementação usam o checklist `PREP`, `EXECUTE`, `VERIFY`,
`VISUAL`, `EVIDENCE` e `IMPROVE`. A etapa `VISUAL` é obrigatória para toda
tarefa que possa alterar a interface, mesmo sem pedido específico, e registra a
conferência de bordas, espaçamentos, margens, padding e tipografia. Tarefas sem
interface registram o motivo concreto da não aplicação.

## Orquestração conversacional

As skills fazem handoff dentro da mesma conversa. Quando uma responsabilidade
termina ou encontra uma pendência de outra etapa, a skill atual:

1. anuncia `Pendência detectada` quando houver trabalho bloqueante.
2. apresenta `Transição automática`, com origem, destino, motivo e resultado.
3. carrega imediatamente a skill responsável sem pedir confirmação nem exigir
   que a pessoa repita o comando.
4. preserva o contexto e resolve a pendência na mesma conversa.
5. apresenta `Retomada automática` e retorna à etapa de origem quando a correção
   terminar.

O protocolo também vale para retornos. Pedido tardio entra por
`fireskill-update-spec`. Mudança de comportamento reabre definição e
validação, mudança de plano retorna às tarefas e ausência de teste ou RED chama
TDD/BDD. O handoff é automático, mas não autoriza instalação, deploy,
publicação ou ação destrutiva, que continuam exigindo autorização específica.

Toda decisão material ausente é tratada por `fireskill-02-backlog`. A skill
reanalisa o contexto depois de cada rodada e pergunta novamente enquanto
existir lacuna aplicável, até o máximo de oito perguntas por área. Cada rodada
contém exatamente uma pergunta numerada. Ela oferece três ou mais opções
numeradas, `Escrever outra resposta`, `Gere outras opções` e `Avançar` desde a
primeira rodada. O avanço
preserva as lacunas em Draft e não aprova o Definition Gate.

No setup, o agente lê `.specsfy/USER-PROFILE.md`, a conversa e os contextos do
projeto antes de perguntar. Respostas já confirmadas não voltam para a rodada.
O perfil registra o nível de conhecimento e orienta a profundidade: iniciantes
recebem explicações dos termos e efeitos práticos, enquanto pessoas experientes
podem responder diretamente sobre versões, arquitetura, testes e integrações.
O setup também confirma quando uma entidade precisa de CRUD, mapeia o acesso às
telas pelos menus do sistema e pergunta quando essas duas informações não
estiverem claras. Ao final de toda execução completa, ele chama o documentador
para reconstruir a documentação técnica do sistema existente.

## Catálogo

| Skill | Responsabilidade | Limite principal |
| --- | --- | --- |
| [`fireskill-01-inbox`](fireskill-01-inbox/SKILL.md) | preservar e pré-processar o input sem perguntas | não refina, promove ou implementa |
| [`fireskill-02-backlog`](fireskill-02-backlog/SKILL.md) | refinar entradas, registrar backlog e fechar lacunas em ciclo adaptativo com MCR-10 | não cria especificações |
| [`fireskill-03-specify`](fireskill-03-specify/SKILL.md) | promover decisões para `spec.md` e research | não implementa nem captura ideia vaga |
| [`fireskill-04-validate`](fireskill-04-validate/SKILL.md) | auditar o Definition Gate | não decide requisitos |
| [`fireskill-05-tasks`](fireskill-05-tasks/SKILL.md) | manter tarefas nas seções 14–15 | não cria `tasks.md` nem código |
| [`fireskill-06-tdd-bdd`](fireskill-06-tdd-bdd/SKILL.md) | usar o BDD da spec para criar TDD e provar RED/GREEN | não executa Gherkin nem inventa comportamento |
| [`fireskill-07-implement`](fireskill-07-implement/SKILL.md) | executar tarefas prontas e evidenciar | não trabalha sem RED |
| [`fireskill-update-spec`](fireskill-update-spec/SKILL.md) | incorporar pedido tardio e reabrir somente os atos afetados | não cria nova spec nem implementa |
| [`fireskill-progress`](fireskill-progress/SKILL.md) | projetar o estado global | não altera gates ou checkboxes |
| [`fireskill-mvp-milestone-interviewer`](fireskill-mvp-milestone-interviewer/SKILL.md) | entrevistar e definir o MVP por milestones | não planeja tarefas ou código |
| [`fireskill-data-discovery`](fireskill-data-discovery/SKILL.md) | conversar sobre informações que o produto precisa guardar | não escolhe tecnologia ou implementação |
| [`fireskill-roadmap-milestone-interviewer`](fireskill-roadmap-milestone-interviewer/SKILL.md) | entrevistar a evolução pós-MVP | não altera o núcleo sem confirmação |
| [`fireskill-milestone-governor`](fireskill-milestone-governor/SKILL.md) | sincronizar a projeção de milestones | não inventa condição de saída |
| [`fireskill-setup`](fireskill-setup/SKILL.md) | detectar o stack, criar contexto ausente, preparar `DESIGNSYSTEM.MD`, manter o perfil de interação e reconciliar blocos de agentes | não sobrescreve arquivos de contexto existentes |
| [`fireskill-documentator`](fireskill-documentator/SKILL.md) | reconstruir `docs/` e o inventário `.specsfy/PACKAGES.md` | não inventa decisões, relações, finalidades ou referências |
| [`fireskill-aux-stack`](fireskill-aux-stack/SKILL.md) | manter `.specsfy/STACK.md` a partir de evidência executável | não inventa nem copia toda dependência |
| [`fireskill-aux-rules`](fireskill-aux-rules/SKILL.md) | ajudar a registrar regras confirmadas em `.specsfy/RULES.md` | não decide regras pela pessoa |
| [`fireskill-aux-database`](fireskill-aux-database/SKILL.md) | manter `.specsfy/DATABASE.md` após toda mudança persistente | não copia dados ou segredos |

`PROJECT.md`, `INTERFACE.md` e `DESIGNSYSTEM.MD` ficam na raiz do projeto
consumidor. `STACK.md`, `RULES.md`, `DATABASE.md`, `PACKAGES.md` e
`USER-PROFILE.md` ficam em
`.specsfy/`. O setup pode ser executado
novamente para garantir os contextos iniciais; o documentador garante o
inventário de pacotes. Ambos preservam arquivos existentes e todo conteúdo fora
dos blocos gerenciados.

Quando o projeto já usa GitHub Spec Kit, a constituição em
`.specify/memory/constitution.md` ativa uma ponte de leitura. O setup percorre
todos os arquivos regulares em `specs/`, cria `.specsfy/SPECKIT.md` com os
caminhos e fingerprints encontrados e orienta os agentes a ler as fontes
originais. Nenhum arquivo de `.specify/` ou `specs/` é movido, convertido,
substituído ou removido.

Durante planejamento, implementação e projeção de progresso,
`fireskill-setup/scripts/monitor_context.mjs` classifica mudanças staged, unstaged
e untracked. Alterações estruturais exigem `STACK.md`. Alterações de
persistência exigem `DATABASE.md`. Código de aplicação exige revisão de
`PROJECT.md`. A ausência de impacto material é registrada na evidência da
tarefa, nunca presumida silenciosamente.

`fireskill-documentator` funciona de forma independente e também é um handoff
obrigatório após cada tarefa de implementação. Em toda execução, ele reavalia o
código existente e reconstrói arquitetura, aplicação, banco, fluxos, testes,
frontend, pacotes, integrações e decisões dentro dos blocos gerenciados de
`docs/`. A mesma execução preenche `.specsfy/PACKAGES.md` com todos os pacotes
npm/Bun observados, diretos ou transitivos, e suas finalidades locais,
preservando texto humano externo.

## Capacidades nativas

As skills incorporam capacidades inspiradas em extensões de specification
development sem instalar outro runtime ou criar fontes paralelas:

| Capacidade | Responsável |
| --- | --- |
| Gates de qualidade | `fireskill-04-validate` |
| Proteção de CI | `fireskill-04-validate` |
| Verificação de tarefas | `fireskill-07-implement` |
| Revisão visual da interface | `fireskill-07-implement` e especialistas de interface |
| Rastreabilidade da spec | `fireskill-06-tdd-bdd` |
| Carregamento de referências da spec | `fireskill-03-specify` |
| Estrutura de pesquisa | `fireskill-03-specify` |
| Análise de cenários hipotéticos | `fireskill-update-spec` |
| Changelog da spec | `fireskill-update-spec` |
| Crítica da spec | `fireskill-04-validate` |
| Proteção arquitetural | `fireskill-04-validate` |
| Revisão de segurança | `fireskill-04-validate` |
| Testes de qualidade | `fireskill-06-tdd-bdd` |
| Análise de consumo de tokens | `fireskill-progress` |
| Integração com PR | `fireskill-07-implement` |

## Especialistas sob demanda

Cada skill base possui `references/specialists.md` com condições para recomendar
contexto técnico opcional:

```bash
npx skills add https://github.com/promovaweb/specsfy \
  --skill fireskill-specialist-<nome> --agent universal --copy --full-depth
```

As bases informam o nome, a finalidade e as dependências do especialista. Se
ele já estiver instalado, carregam-no na mesma conversa. Se estiver ausente,
avisam que executarão o comando acima, pedem autorização específica e só então
executam `npx skills add`. Instalação nunca ocorre como efeito implícito do
handoff. O workspace `promovaweb/specsfy` não é projeto consumidor e não
recebe nenhuma categoria.

## Estrutura

```text
templates/
├── Inbox.md, Backlog.md, Spec.md e Tasks.md
└── Project.md, Stack.md, Rules.md, Database.md, UserProfile.md, Interface.md e DESIGNSYSTEM.MD
examples/
└── Spec.md        # fixture preenchida para agentes, CLI e testes
specsfy-{base-<responsabilidade>|setup|documentator|aux-<responsabilidade>}/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── scripts/       # quando há automação determinística
├── references/    # conhecimento consultado pela skill
└── assets/        # templates e materiais de saída
```

- `SKILL.md` possui frontmatter com `name` e `description`.
- `agents/openai.yaml` menciona `$<nome-da-skill>` no prompt padrão.
- Scripts usam Python 3 e biblioteca padrão, sem rede ou ação destrutiva por
  padrão.
- Referências extensas vivem a um nível da skill e possuem gatilho explícito de
  leitura.
- Uma regra normativa possui uma única fonte. Outros arquivos apontam para ela.
- O CLI publica os templates e o exemplo sob `.specsfy/`. Somente uma spec
  criada a partir do template se torna normativa para uma feature.
- `DESIGNSYSTEM.MD` orienta regras macro de interface no projeto consumidor;
  `INTERFACE.md` mantém o registro local de componentes e telas.

## Disponibilizar as skills

O executável versionado pode ser baixado em `get.specsfy.dev`. Para instalar o
CLI com o npm e então materializar o catálogo base:

```bash
npm install --global @promovaweb/specsfy
specsfy install
```

O monorepo oficial mantém este módulo como fonte do catálogo, sem instalar as
skills na própria raiz.

## Desenvolver

Leia [`AGENTS.md`](AGENTS.md) antes de alterar uma skill.

Uma mudança de comportamento segue:

```text
spec → Gherkin → teste TDD → RED → skill/script → GREEN → regressão → evidência
```

O ciclo técnico permanece `RED → GREEN → REFACTOR`.

Testes e fixtures das skills permanecem neste módulo e criam specs somente
em diretórios temporários.

Nos projetos consumidores, o runner dos testes derivados do BDD é selecionado
pela stack. No Nuxfire o runner é o Vitest (`bun run test`). Em outras stacks,
o agente preserva o runner existente ou pergunta qual adotar antes de criar ou
executar testes. O Gherkin permanece
somente na `spec.md` como referência: agentes derivam testes executáveis dele,
sem criar ou executar `.feature`. A decisão Node é materializada no script
`test:tdd`. Cada feature, história e requisito recebe no mínimo três cenários
BDD distintos e três casos TDD executáveis. Cada caso TDD possui seu próprio
marcador `SPECSFY:`.

## Validar

Valide cada skill alterada:

```bash
uv run --quiet --with pyyaml python \
  /home/luizeof/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  specsfy-<NN>-<nome>
```

Execute os contratos das skills a partir desta raiz:

```bash
node -m unittest discover -s tests -p 'test_*.py'
node fireskill-04-validate/scripts/verify_repo.mjs . \
  --boundary local
```

O verificador exige as skills base. Os contratos do catálogo também
validam o setup, o documentador e as três auxiliares. Especialistas instalados
são validados sem limitar o tamanho total do catálogo.

## Publicação

Antes de publicar:

- frontmatter e metadata são válidos.
- gatilhos positivos e limites negativos estão claros.
- não existem placeholders, caches ou links locais quebrados.
- os testes TDD informados pelo BDD tiveram RED válido e estão verdes.
- requisitos, testes, tarefas e evidências estão rastreáveis.
- a regressão do workspace passou.
- o diff integrado mantém este módulo e seus consumidores coerentes.
