# Nuxfire — instruções para agentes

Este arquivo é lido no início de **toda** conversa neste repositório. O
desenvolvimento do Nuxfire é feito com o **Fireskills** (`fireskills/`): uma
metodologia orientada a especificações mais 33 especialistas técnicos que
funcionam como um engenheiro sênior que já conhece esta base de código. Você não
trabalha "por conta própria": trabalha através do Fireskills.

## 1. Toda nova conversa começa aqui (nesta ordem)

1. Leia `fireskills/SKILL.md`: ele diz qual skill de fluxo e qual especialista
   carregar para o pedido.
2. Leia o contexto do projeto: `PROJECT.md`, `.specsfy/RULES.md`,
   `.specsfy/STACK.md`, `.specsfy/DATABASE.md`, `DESIGNSYSTEM.MD` e `INTERFACE.md`
   (este último antes de mexer em qualquer tela).
3. Identifique a **área** do pedido e carregue o(s) especialista(s) dela
   **antes** de ler ou escrever código (tabela na seção 3).
4. Só então explore o código, planeje e aja.

Não responda sobre o projeto de memória: se o contexto acima ainda não foi lido
nesta conversa, leia-o primeiro.

## 2. Como trabalhar

- **Pedido novo ou que muda comportamento** (feature, correção com regra de
  negócio, mudança de dados ou de tela): siga o fluxo do Fireskills.
  `fireskill-01-inbox` → `-02-backlog` → `-03-specify` → `-04-validate` →
  `-05-tasks` → `-06-tdd-bdd` → `-07-implement` → `fireskill-documentator` →
  `fireskill-progress`. O contrato completo está em `fireskills/skills/Spec.md`
  (importado pelo bloco gerenciado abaixo). A spec (`specs/<estado>/<NNNN>-<slug>/spec.md`)
  é a única fonte normativa; não crie `plan.md`, `tasks.md` nem outra fonte paralela.
- **Ajuste trivial** (texto, renomeação local, erro de digitação, sem efeito de
  comportamento): pode ir direto, mas ainda exige ler `.specsfy/RULES.md`, carregar
  o especialista da área e rodar a validação dele.
- **Dúvida sobre como algo funciona hoje**: leia o especialista da área e, dentro
  dele, o `references/nuxfire-*.md`; depois confirme no código.
- **Mudança de spec depois de definida**: `fireskill-update-spec`.
- **Ver o estado das entregas**: `bun run fireskill progress`.
- Pergunte só quando a decisão for de fato do usuário e não puder ser resolvida
  pelo código ou pelo contexto; use o formato de perguntas numeradas do contrato.

## 3. Especialistas por área (carregue antes de escrever código)

| Ao tocar | Carregue (`fireskills/specialists/…`) |
|---|---|
| `.vue`, componentes `U*`, tema, formulários, tabelas | `fireskill-specialist-nuxt-ui` |
| páginas, layouts, middleware, plugins, Nitro, `runtimeConfig` | `fireskill-specialist-nuxt` |
| `layers/`, `config.ts`, `layer.manifest.ts` | `fireskill-specialist-nuxfire-layers` |
| routers e procedures, `useTrpcClient()` | `fireskill-specialist-trpc` |
| schema, migrações, seed, queries | `fireskill-specialist-drizzle` (+ `-postgres`) |
| permissões, `defineAbility`, `<Can>` | `fireskill-specialist-nuxt-authorization` |
| login, sessão, cookies, `apps/functions/src/auth.ts` | `fireskill-specialist-openauth` |
| stores | `fireskill-specialist-pinia` |
| Workers, bindings, filas, cron, Durable Objects | `fireskill-specialist-cloudflare-workers` |
| `infra/`, secrets, stages, deploy | `fireskill-specialist-sst` |
| segurança, acessibilidade, performance, observabilidade, arquitetura, API, UX/UI, TypeScript, Tailwind, revisão, depuração, versionamento, Git | os especialistas de mesmo nome (lista em `fireskills/specialists/README.md`) |

Cada especialista traz **o que existe de fato no código** (com arquivo de
evidência) e **o que NÃO existe**. Não assuma o que estiver na segunda lista.

## 4. Fontes de verdade (em caso de conflito, vence a de cima)

1. **O código** (e os testes).
2. `.specsfy/*`, `PROJECT.md`, `DESIGNSYSTEM.MD`, `INTERFACE.md`: contexto
   migrado de `_docs/docs` e **conferido contra o código** (`fireskills/MIGRACAO-DOCS.md`).
3. Os `references/nuxfire-*.md` dos especialistas.
4. `_docs/docs/*`: histórico de trabalho; pode estar desatualizado (nomes antigos
   de pacotes). Não use como prova.

Toda afirmação sobre o projeto precisa de um arquivo como evidência.

## 5. Comandos

| Para | Comando |
|---|---|
| Testes | `bun run test` (Vitest, raiz) |
| Typecheck do app | `bun run typecheck` em `apps/app` **e** `bunx vue-tsc --noEmit -p server/tsconfig.json` (o `nuxt typecheck` não cobre o servidor) |
| Completude de i18n | `bun run check:i18n` |
| Estado das specs / mudar estado / esforço / milestones | `bun run fireskill progress`, `… transition <id> <estado>`, `… effort <id> <1-10> --reason "…"`, `… milestones sync` |
| Monitor de contexto (início, após cada tarefa e antes de concluir) | `node fireskills/skills/fireskill-setup/scripts/monitor_context.mjs --project . --check` |
| Proteção do banco antes de qualquer teste/migração | `node fireskills/skills/fireskill-setup/scripts/check_database_safety.mjs --project . --command "<comando>"` |
| Deploy (**só com autorização**) | `bun run deploy -- --stage <stage>` |

Os scripts das skills ficam em `fireskills/skills/<skill>/scripts/`.

## 6. Regras que não se negociam

O texto completo está em `.specsfy/RULES.md`; o essencial:

- Tipagem forte, **zero `any`**; zero código morto; KISS, DRY, YAGNI.
- **Dark mode obrigatório**; notificações via `useNotification`; imagens via R2
  (`hubBlob()`); só cores semânticas do `@nuxt/ui`.
- Domínio em `layers/`, nunca em `apps/app`. Habilidades com prefixo da layer.
- Nunca abrir, colar nem versionar `.env.stage` / `.env.production`.
- Nunca rodar teste ou comando destrutivo contra o banco de desenvolvimento.
- `tsc`/`vitest`/`nuxt build` verdes **não** provam que o deploy funciona; para o
  que toca `apps/functions` e `layers/`, o gate real é `sst deploy` num stage de
  teste.
- **Nunca faça deploy, apague dados, publique ou faça ação irreversível sem
  autorização explícita.**
- Não declare "pronto" sem evidência: comando rodado e resultado.

## 7. Manter o Fireskills vivo

- Terminou uma entrega: `fireskill-documentator` (reconstrói `docs/` e
  `.specsfy/PACKAGES.md`) e o monitor de contexto sem `PENDING`.
- Mudou uma regra, tela ou tabela: atualize `.specsfy/RULES.md`, `INTERFACE.md`
  ou `.specsfy/DATABASE.md` (as skills `fireskill-aux-*` fazem isso sem apagar
  texto humano).
- Descobriu que um especialista está errado ou incompleto: corrija o
  `references/nuxfire-*.md` dele **com a evidência**, no mesmo passo.
- Pendências conhecidas do próprio Fireskills: `fireskills/PLANO-REFATORACAO.md`.

<!-- specsfy:framework:start -->
## Framework Specsfy

Leia e siga integralmente `fireskills/skills/Spec.md` antes de trabalhar com
backlogs, refinamentos do backlog, especificações, tarefas, testes ou implementação. Esse
arquivo contém o fluxo, os caminhos canônicos e os gates do framework.

- Preserve as instruções próprias deste projeto.
- O diretório do projeto é o caminho informado durante `$fireskill-setup`. Use-o
  em toda leitura e escrita posterior. Se ele estiver dentro de um Hub, não
  promova o trabalho para a raiz Git nem crie contexto, specs ou código fora
  desse caminho.
- Leia `PROJECT.md`, `DESIGNSYSTEM.MD`, `.specsfy/STACK.md`,
  `.specsfy/RULES.md`, `.specsfy/DATABASE.md`, `.specsfy/PACKAGES.md` e
  `.specsfy/USER-PROFILE.md` como contexto persistente antes de planejar
  mudanças.
- Antes de perguntar, consulte `.specsfy/USER-PROFILE.md`, a conversa atual e
  as fontes do projeto. Não repita uma pergunta cuja resposta já esteja
  confirmada; registre respostas novas no perfil com a fonte e o alcance.
- Quando `.specsfy/SPECKIT.md` existir, leia
  `.specify/memory/constitution.md` e cada fonte do GitHub Spec Kit listada na
  projeção. Preserve `.specify/` e os artefatos já existentes em `specs/`; o
  Specsfy não os migra nem os substitui.
- Antes de iniciar qualquer skill do framework, execute obrigatoriamente
  `$fireskill-setup` para verificar e reconciliar o contexto e os blocos
  reservados. A própria `$fireskill-setup` não se chama recursivamente. Em uma
  transição automática, execute-a de novo com a mesma raiz já confirmada antes
  de carregar a skill de destino. Execute `$fireskill-documentator` quando
  `PACKAGES.md` estiver ausente ou desatualizado.
- Execute o monitor de contexto no início, após cada tarefa e antes de concluir
  a entrega; resolva todo resultado `PENDING`.
- Use as skills `fireskill-aux-*` para manter stack, regras e banco sem apagar
  conteúdo humano.
- Toda tarefa que cria ou altera a estrutura do banco inclui uma tarefa
  `[MIGRATION]` com arquivo
  versionado. A implementação aplica a migration no banco de teste e consulta
  seu estado antes de concluir a tarefa ou o Delivery Gate.
- Execute `$fireskill-documentator` depois de cada implementação para reconstruir
  a documentação técnica completa em `docs/` e o registro de dependências em
  `.specsfy/PACKAGES.md`.
- Use `specs/inbox/` para capturas imediatas ainda não refinadas.
- Use `specs/backlog/` para itens refináveis ainda não promovidos.
- Use `specs/<estado>/<NNNN>-<slug>/spec.md` como fonte normativa de cada
  fatia, em uma única pasta de estado.
- Não crie `plan.md`, `tasks.md`, `research.md` ou outra fonte normativa
  paralela.
<!-- specsfy:framework:end -->
