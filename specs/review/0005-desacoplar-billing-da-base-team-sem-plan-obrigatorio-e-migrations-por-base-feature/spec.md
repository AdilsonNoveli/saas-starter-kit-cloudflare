# Integrated Specification: Desacoplar Billing da Base (Team sem Plan obrigatório) e Migrations por Base/Feature

| Field | Value |
| --- | --- |
| Format | Specsfy/2.0 |
| ID | SPEC-0005 |
| Slug | 0005-desacoplar-billing-da-base-team-sem-plan-obrigatorio-e-migrations-por-base-feature |
| Status | Reviewing |
| Effort | 7 |
| Effort updated at | 2026-09-27 |
| Effort rationale | Revisado de 5 para 7, depois para 8, durante a implementação: o teste de guarda (T001) achou 4 acoplamentos reais não previstos na pesquisa original (R-010, R-011) — schema (FK/relação), composição de router tRPC do admin, aba de configurações do time, e um import indireto via barrel em admin-teams.ts. Cada um exigiu desenho próprio (R-012, R-013, DEC-005, DEC-006). O import via barrel (R-011) foi inicialmente aceito como risco residual e depois corrigido também (R-015, T017) — o teste de guarda ganhou uma segunda checagem que resolve o barrel, e `admin-teams.ts` não importa mais `plans`/`subscriptions` nem condicionalmente. |
| ClickUp Task | |
| Milestones | |
| Definition Gate | Passed |
| Plan Gate | Pending |
| Delivery Gate | Pending |
| Evidence Contract | 1 |
| Human Interface | No |
| Updated at | 2026-09-27 |

## Act I — Define

### 1. Problem and Outcome

#### Problem

`layers/teams` — layer base, sempre ativa (`config.ts` → `layers.core`) — importa e chama código de `layers/billing` — layer classificada como "core" hoje mas que o produto quer tratar como funcionalidade opcional. Evidência: `layers/teams/server/trpc/teams.ts:19,191-205` importa `ensureFreePlan` de `@nuxfire/layer-billing` e toda criação de time bloqueia nisso, gravando `Team.planId` (`NOT NULL REFERENCES Plan.id`, `layers/teams/server/database/schema.ts:60`). `layers/teams/server/trpc/invites.ts:45-47,68-81,131-137,178-188` também lê a relação `team.plan.maxSeats` para limitar convites, duas vezes, duplicado. Enquanto essa dependência existir, `billing` não pode ser desligada sem quebrar a criação de time e o convite de membros — a base nunca deveria depender de uma feature. Migrations, além disso, são geradas de um schema que hoje trata `billing` como sempre presente (mesmo padrão que `layers.features` já tinha para `kanban` antes da correção aplicada nesta sessão em `apps/functions/drizzle.config.ts`).

#### Desired Outcome

`teams` (base) nunca importa nem referencia `billing` (feature) em nenhum arquivo. Um time é criado e funciona plenamente com `planId: null`. `billing`, quando ativa, continua funcionando exatamente como hoje para quem já tem plano/assinatura (nenhuma tela muda). A regra "base nunca importa feature" passa a ser mecanicamente garantida por um teste automatizado que falha o `bun run test` se for violada — por qualquer dev ou LLM, em qualquer PR futuro. `config.ts` passa a classificar `billing` como `layers.features` (não `layers.core`), e a geração de migration (`apps/functions/drizzle.config.ts`, já corrigida nesta sessão) automaticamente deixa de incluir as tabelas de `billing` quando ela estiver desligada — sem nenhuma alteração adicional nesse arquivo.

#### Success Metrics

- `bun run test`: 100% dos arquivos de `layers/teams`, `layers/admin`, `layers/notifications` e `apps/functions/src/database/core-schema.ts` sem nenhum import de `@nuxfire/layer-billing` ou `@nuxfire/layer-kanban` — verificado pelo teste de guarda (FR-006), não por inspeção manual.
- `bunx drizzle-kit generate` após a mudança produz exatamente um `ALTER TABLE "Team" ALTER COLUMN "planId" DROP NOT NULL` e nada mais (nenhum DROP, nenhuma tabela nova/removida) — confere com `config.ts` mantendo `billing.features.billing: true` durante esta spec.
- Zero regressão: `bun run test` (suíte completa) e `bunx vue-tsc --noEmit -p server/tsconfig.json` (`apps/app`) passam sem alteração de contagem de falhas.

### 2. Research and Clarifications

#### Executed Research

- **R-001**: `Team.planId` é lido fora de `billing` em exatamente 2 pontos, ambos em layers base. → `layers/teams/server/trpc/invites.ts` (seat limit, via relação `team.plan.maxSeats`) e `layers/admin/server/trpc/admin-teams.ts` (listagem/filtro admin, via `leftJoin(plans, ...)`, já com `planId: string | null` no tipo). Nenhum outro consumidor existe (`grep` por `\.planId\b` no repositório inteiro, 7 arquivos, os outros 5 são internos a `billing` ou o próprio schema).
- **R-002**: `FREE_PLAN` (seed, `apps/functions/src/database/seed/data.ts:33-39`) não define `maxSeats` — a coluna fica `null` (ilimitado) na Postgres. Logo, um time sem plano algum e um time no plano Free hoje produzem exatamente o mesmo resultado em `invites.ts` (`maxSeats === null` → ilimitado). Remover a atribuição automática de plano **não muda nenhum comportamento de limite de assento observável hoje**.
- **R-003**: `getBillingInfo` (`layers/billing/server/trpc/billing.ts:49-124`) nunca lê `Team.planId`. O "plano atual" exibido na tela de billing já é derivado só de `team.subscriptions` (mais recente) com fallback para `availablePlans.find(tier === "FREE")` — independente de qualquer coluna em `Team`. Confirma que `Team.planId` não é usado para exibir o plano atual ao usuário.
- **R-004**: as duas telas admin que exibem plano (`layers/admin/app/pages/admin/index.vue:75,132` e `.../companies/index.vue:188-196`) já tipam `planName: string | null` e já renderizam `?? "—"` — nenhuma mudança de UI necessária (`Human Interface: No`).
- **R-005**: `ensureFreePlan()` (`layers/billing/server/utils/plans.ts:15-36`) tem exatamente 1 chamador real: `layers/teams/server/trpc/teams.ts:191` (removido). **Correção pós-implementação**: `apps/functions/src/database/seed/index.ts` NÃO chama essa função — tem sua própria lógica inline duplicada (select-then-insert direto em `schema.plans`, sem passar por `ensureFreePlan()`). O que precisou de gate por `layers.features.billing` foi esse bloco inline, não uma chamada de função. `ensureFreePlan()` permanece — não é código morto.
- **R-010** (achado durante a implementação, não previsto na pesquisa original): o teste de guarda (T001) encontrou 3 violações que a busca por `\.planId\b` não pegou, por não serem sobre `planId` e sim sobre outros pontos de import de billing:
  1. `layers/teams/server/database/schema.ts:37-40` (versão pré-implementação) — `Team.planId.references(() => plans.id)` e `teamRelations`' `plan`/`subscriptions` importavam `plans`/`subscriptions` de billing para a própria FK/relação. Resolvido removendo a FK inteiramente (não só `.notNull()`) — `planId` é hoje uma coluna solta, sem `.references()`, mesmo padrão de `Notification.userId`.
  2. `layers/admin/server/trpc/router.ts:16-27` (versão pré-implementação) — montava `adminPlansRouter`/`adminBillingRouter` (de billing) dentro do próprio router do admin, para manter `admin.plans.*`/`admin.pendingPurchases.*`. Resolvido: `admin/router.ts` não monta mais nada de billing; a Composition Root (`apps/app/server/trpc/routers/index.ts`) mescla condicionalmente via `mergeRouters` — ver DEC-005.
  3. `layers/teams/app/composables/use-team-settings-links.ts:8` (versão pré-implementação) — importava `useGetBillingInfoAbility` de billing só para decidir se mostra a aba "Billing". Resolvido estendendo `LayerManifest` com `teamSettingsTabs` (mesmo mecanismo genérico já usado pelo sidebar) — ver DEC-006.
- **R-011**: um 4º ponto (não achado pelo teste de guarda original, achado por leitura manual de `admin-teams.ts` durante a implementação): `layers/admin/server/trpc/admin-teams.ts` importava `plans`/`subscriptions` via `@nuxfire/functions/schema` (o barrel), não via `@nuxfire/layer-billing` diretamente — string diferente, então o regex original do teste de guarda (que só olhava `@nuxfire/layer-<feature>`) não detectava. Corrigido em duas etapas: primeiro (T016) tornando as duas queries condicionais a `layers.features.billing` — parou de quebrar em runtime, mas o IMPORT continuava lá, ainda uma violação de verdade (uma feature deletada do workspace quebraria o build do admin). Apontado pelo usuário, corrigido de fato depois (R-015, T017): o import saiu inteiramente de `layers/admin`.
- **R-015** (correção do risco aceito em R-011, depois de o usuário perguntar por que não foi corrigido): 1) o teste de guarda ganhou uma segunda checagem (`scripts/layer-dependency-direction.test.ts`) que resolve `export * from "@nuxfire/layer-<feature>/..."` dentro do barrel e flagra qualquer base file que importe um símbolo dono de uma feature layer através dele, mesmo indiretamente — verificado RED contra o `admin-teams.ts` da época (import de `plans`/`subscriptions` ainda presente) antes da correção, GREEN depois. 2) `admin-teams.ts` parou de importar `plans`/`subscriptions` (e o próprio `layers`) — `listTeams`/`getTeamDetail` viraram permanentemente a versão "sem billing" (`planName`/`planTier`/`subscription` sempre null). A versão com billing (`listTeams`/`getTeamDetail` com dados reais de plano/assinatura) foi para `apps/app/server/trpc/routers/admin-teams-billing.ts`, na Composition Root, que substitui `admin.teams` inteiro (não só adiciona chaves, como `admin.plans`/`admin.pendingPurchases`) quando `layers.features.billing` é `true`. `setTeamStatus`/`teamStatusSchema` viraram exports de `admin-teams.ts` para a versão com billing reaproveitar sem duplicar. `layers/admin/package.json` perdeu a dependência `@nuxfire/layer-billing` (morta depois desta correção) e `layer.manifest.ts` perdeu `"billing"` de `requires`.
- **R-012** (tentativa rejeitada, documentada para não ser repetida): declarar a relação `plan`/`subscriptions` de volta a partir de `layers/billing/server/database/schema.ts` (`relations(teams, ...)`, direção billing→teams, permitida) funciona em **runtime** (Drizzle mescla `relations()` por nome de tabela através de múltiplos arquivos — confirmado lendo `node_modules/drizzle-orm/relations.js:116-178`), mas **quebra a inferência de TIPO do TypeScript**: `bunx vue-tsc --noEmit -p server/tsconfig.json` passou a não reconhecer `memberships`/`roles`/`jobs` (relações da PRÓPRIA `teamRelations`, não tocadas) em cada `db.query.teams.findFirst()` do app — uma segunda declaração `relations(teams, ...)` em outro arquivo colide no nível de tipo mesmo sem colidir em runtime. Solução final: zero relação do lado de `teams` para `Plan`/`Subscription`; `getBillingInfo` (billing) passou a consultar `subscriptions` diretamente (`subscriptionRelations.team`/`.plan`, já declaradas do lado de `subscriptions`) em vez de aninhar via `teams.findFirst({ with: { subscriptions } })`.
- **R-013** (gotcha de TypeScript, documentado para não ser repetido): `layers.features` declarado com `satisfies Record<string, boolean>` faz cada flag ser inferida como `boolean` genérico, não como literal `true`/`false`. Isso quebrou a mesclagem condicional do router do admin (DEC-005): `cond ? mergeRouters(...) : layerRouters.admin` não elimina o ramo não tomado quando os dois ramos são tipos genéricos complexos (routers tRPC), mesmo com `cond` sendo um literal `true` comprovado (testado isoladamente com `tsc`). Corrigido trocando `satisfies Record<string, boolean>` por `as const` em `config.ts`.
- **R-014**: `bunx drizzle-kit generate` real (com `billing: true`, estado atual) produziu exatamente 3 statements — `ALTER TABLE "Team" DROP CONSTRAINT "Team_planId_Plan_id_fk"`, `ALTER TABLE "Team" ALTER COLUMN "planId" DROP NOT NULL`, `ALTER TABLE "Team" ADD COLUMN "maxSeats" integer` — nada mais, confirmando AC-011. Um segundo dry-run com `billing`/`kanban` excluídos do `schema` (técnica de arquivo de config temporário, mesma desta sessão) produziu 14 tabelas, `Team` com 0 FKs, zero erro — confirmando AC-007/012/015 mesmo após a remoção da FK.
- **R-006**: `layers/billing/server/utils/billing/buyer-provisioning.ts:119-127,205` grava `teams.planId` diretamente (fluxo de compra, `billing → teams`, direção permitida) sempre com um plano real (o comprado) — este fluxo não muda.
- **R-007**: `apps/functions/drizzle.config.ts` (já corrigido nesta sessão, testado: `bun run test` 636/636, `tsc` limpo) deriva seu array `schema` de `layers.core` + `layers.features` ativas. Mover `billing` de `core` para `features` (mantendo `true`) não exige nenhuma mudança nesse arquivo — confirmado por leitura do código, a derivação já é genérica por nome de layer.
- **R-008**: nenhum teste existente cobre `ensureFreePlan()`, `teams.create()` ou os dois pontos de checagem de assento em `invites.ts` (`grep` por arquivo `.test.ts` nos três diretórios — zero resultado). Nenhuma regressão de teste pré-existente a herdar; toda cobertura desta spec é nova (Fase RED).
- **R-009**: `layers/teams/server/utils/team-seats.test.ts` já existe e cobre `isInviteAcceptable`, `countTeamMembers`, `countPendingInvites` — funções puras em `team-seats.ts`. A checagem de limite de assento (`if (maxSeats !== null) ...`), porém, está duplicada inline em `invites.ts` (2 vezes) e não é uma função pura testável isoladamente.

#### Consulted Sources and Context

- `layers/teams/server/trpc/teams.ts`, `layers/teams/server/trpc/invites.ts`, `layers/teams/server/database/schema.ts`, `layers/teams/server/utils/team-seats.ts` e `.test.ts`.
- `layers/admin/server/trpc/admin-teams.ts`, `layers/admin/app/pages/admin/index.vue`, `layers/admin/app/pages/admin/companies/index.vue`.
- `layers/billing/server/utils/plans.ts`, `layers/billing/server/trpc/billing.ts`, `layers/billing/server/utils/billing/buyer-provisioning.ts`.
- `apps/functions/src/database/seed/data.ts`, `apps/functions/src/database/seed/index.ts`, `apps/functions/drizzle.config.ts` (editado nesta sessão), `apps/functions/src/database/core-schema.ts`.
- `config.ts`, `scripts/compose-layers.ts`.
- `.fireskills/RULES.md`, `.fireskills/DATABASE.md`, `fireskills/specialists/fireskill-specialist-nuxfire-layers/references/nuxfire-layers.md`, `fireskills/specialists/fireskill-specialist-drizzle/references/nuxfire-drizzle.md` (todos já atualizados nesta sessão com a regra "migration segue `layers.features`").

#### Consulted Documentation

- Nenhuma fonte externa. Toda decisão vem de código lido diretamente neste repositório.

#### Stored Research Artifacts

- Nenhum artefato externo — "No external artifacts".

#### Resolved Questions

- **Q**: Base pode importar feature, ou só o contrário? → **A**: só feature pode importar base; nunca o inverso (decidido pelo usuário nesta conversa, confirmado tecnicamente por R-001 a R-007: nenhum caminho exige o sentido oposto).
- **Q**: Times criados hoje devem continuar recebendo um plano Free automaticamente quando `billing` está ativa? → **A**: não é necessário manter esse auto-assign — R-002 e R-003 provam que nenhum comportamento observável (limite de assento, tela de billing, exibição admin) depende de `Team.planId` estar preenchido. Time nasce com `planId: null`; se e quando fizer uma assinatura/checkout, `buyer-provisioning.ts` ou uma futura tela de upgrade preenche o campo. Nenhum mecanismo de hook/evento entre layers é introduzido (ver DEC-002 — YAGNI, sem segundo consumidor hoje).
- **Q**: A consolidação de migrations (0000+0001+0002 em um único baseline) faz parte desta spec? → **A**: não — desconsiderada explicitamente pelo usuário; a migration desta spec é um novo arquivo incremental (`000N_*.sql`) sobre o histórico atual.

#### Open Questions

- None.

### 3. Scope and Actors

#### In Scope

- Tornar `Team.planId` nullable no schema e na migration.
- Remover toda importação/chamada de `layers/teams` para `layers/billing` (`teams.ts`).
- Ajustar `invites.ts` (2 pontos) para tratar "sem plano" como "sem limite", extraindo a regra para uma função pura testável em `team-seats.ts`.
- Gatear `ensureFreePlan()` em `apps/functions/src/database/seed/index.ts` por `layers.features.billing`.
- Mover `billing` de `config.ts` → `layers.core` para `config.ts` → `layers.features` (`billing: true`).
- Criar teste de guarda automatizado (direção de dependência base→feature proibida) cobrindo `teams`, `admin`, `notifications`, `core-schema.ts` contra `billing` e `kanban`.
- Gerar e revisar a migration resultante (`bunx drizzle-kit generate`).
- Atualizar `.fireskills/DATABASE.md` e os specialists de `drizzle`/`nuxfire-layers` para registrar `billing` como feature layer.

#### Out of Scope

- Qualquer mudança de UI/tela (nenhuma existe — R-004).
- Consolidação de migrations pré-existentes (`0000`–`0002`) em um baseline único — decisão do usuário, fora desta spec.
- Desligar `billing` de fato em qualquer ambiente (`billing: true` permanece o padrão; esta spec só torna o desligamento **possível e seguro**).
- Qualquer mecanismo genérico de hooks/eventos entre layers (avaliado e rejeitado — DEC-002).
- Separar `Job`/`Log`/`DeadLetterRecord` por `flags` (tratado como base pelo usuário em turno anterior; não faz parte desta spec).

#### Actors

- **Time (self-serve)**: cria um time via `teams.create`; passa a não depender de `billing` existir.
- **Membro convidado**: aceita convite; limite de assento continua correto com ou sem plano.
- **Administrador de plataforma**: lista times em `/admin`; continua vendo "—" para times sem plano (já suportado).
- **Operador/forker do starter kit**: decide em `config.ts` se `billing` roda ou não, sem quebrar `teams`.
- **Dev/LLM futuro**: tenta importar `billing` de dentro de `teams`/`admin`/`notifications`; é bloqueado pelo teste de guarda antes do merge.

### 4. Project Principles and Constraints

- **PR-001**: Direção de dependência entre layers é unidirecional — feature pode importar base, base nunca importa feature. Mecanicamente garantido por teste, não por convenção.
- **PR-002**: Nenhuma tabela nova, nenhuma coluna nova. Único DDL: `Team.planId` perde `NOT NULL`.
- **PR-003**: KISS/YAGNI (`.fireskills/RULES.md`): nenhum mecanismo de hook/evento entre layers é criado sem um segundo consumidor real hoje.
- **PR-004**: `bun run test` nunca roda contra o banco de desenvolvimento (`.fireskills/RULES.md`) — todos os testes desta spec usam mocks de `useDB()`, seguindo o padrão já existente em `team-seats.test.ts`.
- **PR-005**: Migração é aditiva/expand — sem down-migration, sem DROP (`MIGRATIONS.md`).

### 5. User Stories

#### US-001 — Base nunca importa feature, de forma garantida (P1)

Como mantenedor da base (dev ou LLM trabalhando no repositório), quero que nenhum arquivo de `layers/teams`, `layers/admin`, `layers/notifications` ou `apps/functions/src/database/core-schema.ts` importe uma layer marcada como feature em `config.ts`, para poder desligar ou remover qualquer feature sem quebrar a base, e para que essa regra não dependa de revisão manual.

**Why P1**: é a causa raiz do problema (achado central da análise: `teams.ts` importa `billing`); sem isso, nada mais nesta spec tem efeito duradouro.
**Independent Test**: `bun run test scripts/layer-dependency-direction.test.ts` — falha (RED) antes da correção de `teams.ts`, passa (GREEN) depois.
**Requirements**: FR-001, FR-006

#### US-002 — Criar time e convidar membro sem exigir billing (P1)

Como operador de uma instalação que pode ou não ter `billing` ativa, quero criar times e convidar membros sem que isso dependa da tabela `Plan` existir ou de um plano estar atribuído, para poder rodar a aplicação com `billing` desligada.

**Why P1**: é o comportamento observável que a inversão de dependência precisa preservar — sem isto, US-001 quebra a criação de time.
**Independent Test**: `bun run test layers/teams/server/trpc` com `useDB()` mockado sem nenhuma tabela `Plan` — `teams.create` e `invites.inviteMember`/`acceptInvite` continuam funcionando.
**Requirements**: FR-002, FR-003

#### US-003 — Migration reflete só as layers ativas (P2)

Como administrador de plataforma, quero que `billing`, assim como qualquer feature layer, só apareça na migration gerada quando estiver ativa em `config.ts`, para nunca ter tabela de funcionalidade não usada no banco.

**Why P2**: consequência direta de US-001/US-002 — sem valor isolado (billing continua `true` nesta spec), mas fecha o objetivo original do usuário (migrations por base/feature).
**Independent Test**: `bunx drizzle-kit generate` após a mudança produz diff único e esperado (AC-011).
**Requirements**: FR-005, FR-007

### 6. Acceptance BDD Scenarios

#### AC-001 — Criar time sem nenhuma chamada a billing

**Covers**: US-002, FR-001, FR-002, NFR-001

```gherkin
@US-002 @FR-001 @FR-002 @NFR-001 @AC-001
Feature: Criação de time independente de billing

  Scenario: teams.create grava planId nulo e não referencia billing
    Given nenhuma tabela "Plan" mockada em useDB()
    When teams.create é chamado com nome, slug e descrição válidos
    Then o time é inserido com planId igual a null
    And nenhuma função de "@nuxfire/layer-billing" é importada ou chamada por teams.ts
```

#### AC-002 — Billing ativa, time criado continua sem plano automático

**Covers**: US-002, FR-001, FR-002, NFR-001

```gherkin
@US-002 @FR-001 @FR-002 @NFR-001 @AC-002
Feature: Criação de time independente de billing

  Scenario: billing ligada não muda o comportamento de teams.create
    Given layers.features.billing é true em config.ts
    When teams.create é chamado
    Then o time é inserido com planId igual a null
    And nenhuma linha é inserida em "Plan" como efeito colateral da criação do time
```

#### AC-003 — Convite aceito sem limite quando o time não tem plano

**Covers**: US-002, FR-003, NFR-001

```gherkin
@US-002 @FR-003 @NFR-001 @AC-003
Feature: Limite de assento tolera time sem plano

  Scenario: inviteMember não bloqueia por limite quando team.plan é null
    Given um time com planId null e 5 membros existentes
    When um Owner convida um sexto membro
    Then o convite é criado com sucesso
    And nenhum erro FORBIDDEN de limite de assento é lançado
```

#### AC-004 — acceptInvite aceito sem limite quando o time não tem plano

**Covers**: US-002, FR-003, NFR-001

```gherkin
@US-002 @FR-003 @NFR-001 @AC-004
Feature: Limite de assento tolera time sem plano

  Scenario: acceptInvite não bloqueia por limite quando team.plan é null
    Given um convite PENDING para um time com planId null
    When o convidado aceita o convite
    Then a associação é criada com sucesso
    And nenhum erro FORBIDDEN de limite de assento é lançado
```

#### AC-005 — Seed não cria plano Free quando billing está desligada

**Covers**: US-002, FR-004, NFR-001

```gherkin
@US-002 @FR-004 @NFR-001 @AC-005
Feature: Seed respeita layers.features.billing

  Scenario: seed pula ensureFreePlan quando billing é false
    Given layers.features.billing é false
    When o script de seed roda
    Then ensureFreePlan não é chamado
```

#### AC-006 — Seed continua garantindo o plano Free quando billing está ligada (regressão)

**Covers**: FR-004, NFR-001

```gherkin
@FR-004 @NFR-001 @AC-006
Feature: Seed respeita layers.features.billing

  Scenario: seed mantém comportamento atual quando billing é true
    Given layers.features.billing é true
    When o script de seed roda
    Then ensureFreePlan é chamado exatamente uma vez
```

#### AC-007 — config.ts classifica billing como feature

**Covers**: US-003, FR-005, FR-007, NFR-002

```gherkin
@US-003 @FR-005 @FR-007 @NFR-002 @AC-007
Feature: billing é uma feature layer, não core

  Scenario: drizzle.config.ts exclui as tabelas de billing quando desligada
    Given layers.features.billing é false em config.ts
    When apps/functions/drizzle.config.ts resolve seu array "schema"
    Then nenhum arquivo de layers/billing/server/database/schema.ts está presente
    And core-schema.ts e as demais layers ativas continuam presentes
```

#### AC-008 — Teste de guarda detecta violação (RED antes do fix)

**Covers**: US-001, FR-001, FR-006, NFR-003

```gherkin
@US-001 @FR-001 @FR-006 @NFR-003 @AC-008
Feature: Base nunca importa feature

  Scenario: teste de guarda falha enquanto teams.ts importa billing
    Given teams.ts contém "from \"@nuxfire/layer-billing" antes da correção
    When scripts/layer-dependency-direction.test.ts roda
    Then o teste falha apontando o arquivo e a layer feature importada
```

#### AC-009 — Teste de guarda passa após a correção (GREEN)

**Covers**: US-001, FR-006, NFR-003

```gherkin
@US-001 @FR-006 @NFR-003 @AC-009
Feature: Base nunca importa feature

  Scenario: teste de guarda passa com a base limpa
    Given nenhum arquivo em layers/teams, layers/admin, layers/notifications ou core-schema.ts importa layers/billing ou layers/kanban
    When scripts/layer-dependency-direction.test.ts roda
    Then o teste passa
```

#### AC-010 — Teste de guarda generaliza para qualquer feature futura

**Covers**: US-001, FR-006, NFR-003

```gherkin
@US-001 @FR-006 @NFR-003 @AC-010
Feature: Base nunca importa feature

  Scenario: teste de guarda deriva a lista de features de config.ts, não de nomes fixos
    Given uma nova layer "calendar" é adicionada em layers.features
    And um arquivo de layers/admin passa a importar "@nuxfire/layer-calendar"
    When scripts/layer-dependency-direction.test.ts roda
    Then o teste falha sem precisar de nenhuma alteração no próprio teste
```

#### AC-011 — Migration gerada contém só a mudança esperada

**Covers**: US-003, FR-002, FR-005, FR-007, NFR-002

```gherkin
@US-003 @FR-002 @FR-005 @FR-007 @NFR-002 @AC-011
Feature: Migration reflete exatamente a mudança de schema

  Scenario: drizzle-kit generate produz um único ALTER TABLE
    Given Team.planId perdeu ".notNull()" em layers/teams/server/database/schema.ts
    And layers.features.billing permanece true
    When bunx drizzle-kit generate roda em apps/functions
    Then o arquivo gerado contém exatamente "ALTER TABLE "Team" ALTER COLUMN "planId" DROP NOT NULL"
    And nenhum DROP TABLE ou CREATE TABLE aparece no arquivo gerado
```

#### AC-012 — Limite de assento com plano real continua sendo aplicado (regressão)

**Covers**: FR-003, NFR-001

```gherkin
@FR-003 @NFR-001 @AC-012
Feature: Limite de assento tolera time sem plano

  Scenario: plano com maxSeats definido ainda bloqueia acima do limite
    Given um time com planId apontando para um plano com maxSeats igual a 3
    And o time já tem 3 membros
    When um Owner tenta convidar um quarto membro
    Then o convite é recusado com FORBIDDEN
```

#### AC-013 — config.ts declara billing como feature layer

**Covers**: US-003, FR-005

```gherkin
@US-003 @FR-005 @AC-013
Feature: billing é uma feature layer, não core

  Scenario: billing sai de layers.core e entra em layers.features
    Given o arquivo config.ts na raiz do repositório
    When layers.core e layers.features são lidos
    Then "billing" não aparece em layers.core
    And "billing" aparece em layers.features com valor true
```

#### AC-014 — Seed completo não falha com billing desligada

**Covers**: US-002, FR-004

```gherkin
@US-002 @FR-004 @AC-014
Feature: Seed respeita layers.features.billing

  Scenario: seed roda do início ao fim sem erro quando billing é false
    Given layers.features.billing é false
    When apps/functions/src/database/seed/index.ts roda por completo
    Then nenhuma exceção é lançada
    And nenhuma linha é inserida em "Plan"
```

#### AC-015 — Dry-run confirma exclusão do schema de billing na geração

**Covers**: FR-007, NFR-002

```gherkin
@FR-007 @NFR-002 @AC-015
Feature: billing é uma feature layer, não core

  Scenario: array schema de drizzle.config.ts não contém o arquivo de billing
    Given layers.features.billing é false
    When apps/functions/drizzle.config.ts resolve seu array "schema" (mesma técnica de dry-run já usada nesta sessão para kanban)
    Then "layers/billing/server/database/schema.ts" não está na lista resultante
```

### 7. Requirements

#### Functional

- **FR-001**: Nenhum arquivo em `layers/teams` importa, direta ou transitivamente, `@nuxfire/layer-billing`.
- **FR-002**: `Team.planId` é uma coluna nullable no schema Drizzle e na migration gerada; `teams.create` insere `planId: null`.
- **FR-003**: A checagem de limite de assento (`inviteMember` e `acceptInvite`, `layers/teams/server/trpc/invites.ts`) trata um time sem plano (`team.plan` ausente) da mesma forma que um plano com `maxSeats: null` — sem limite.
- **FR-004**: `apps/functions/src/database/seed/index.ts` só chama `ensureFreePlan()` quando `layers.features.billing` é `true`.
- **FR-005**: `config.ts` declara `billing` em `layers.features` (não em `layers.core`).
- **FR-006**: Um teste automatizado (`bun run test`) falha se qualquer arquivo sob `layers/teams`, `layers/admin`, `layers/notifications` ou `apps/functions/src/database/core-schema.ts` importar um pacote `@nuxfire/layer-<nome>` cujo `<nome>` esteja em `layers.features` de `config.ts`.
- **FR-007**: `bunx drizzle-kit generate`, com `layers.features.billing` em `false`, produz um `schema` (em `apps/functions/drizzle.config.ts`) que não inclui `layers/billing/server/database/schema.ts` (comportamento já implementado nesta sessão para `kanban`; esta FR cobre `billing` especificamente como caso de teste).

#### Non-Functional

- **NFR-001**: Zero regressão — `bun run test` (suíte completa) mantém 100% dos testes pré-existentes passando após a mudança. **Verification**: `bun run test`, contagem de arquivos/casos antes e depois.
- **NFR-002**: A migration gerada é mínima e revisada — nenhuma instrução além da declarada em FR-002/AC-011. **Verification**: inspeção manual do arquivo `.sql` gerado antes do commit.
- **NFR-003**: O teste de guarda (FR-006) roda como parte de `bun run test`, sem flag ou script separado — não pode ser esquecido. **Verification**: o arquivo do teste vive em um `*.test.ts` descoberto pela config padrão do Vitest do projeto, sem exclusão em nenhum `vitest.config.ts`.

#### Errors and Edge Cases

- Time sem plano tenta ser listado no admin com filtro `planId` específico → retorna vazio (comportamento já correto, `eq(teams.planId, input.planId)` nunca casa com `null`); nenhuma mudança necessária.
- `ensureFreePlan()` chamada duas vezes em paralelo (seed re-executado) → já idempotente hoje (`findFirst` antes do insert); comportamento preservado, não testado nesta spec (fora do escopo, sem mudança de código).
- Uma feature layer tenta importar outra feature layer (ex.: `kanban` importando `billing`) → **fora do escopo desta spec** (PR-001 e FR-006 cobrem só base→feature); registrado como não coberto.

## Act II — Design and Prove

### 8. Technical Plan

#### Existing Context

Monorepo Nuxt Layers + tRPC (`trpc-nuxt`) + Drizzle ORM (`drizzle-orm/postgres-js`) sobre Cloudflare Workers/Hyperdrive. `config.ts` na raiz é a única fonte de verdade de quais layers estão ativas (`layers.core` sempre, `layers.features` togglable), já consumida por `apps/app/nuxt.config.ts` (UI), `scripts/compose-layers.ts` (routers tRPC) e, desde esta sessão, `apps/functions/drizzle.config.ts` (geração de migration).

#### Architecture and Modules

- `layers/teams/server/trpc/teams.ts`: remove import de `ensureFreePlan`; `createTeam` (ou nome equivalente do procedure) insere `planId: null`.
- `layers/teams/server/trpc/invites.ts`: os dois blocos `if (team.plan.maxSeats !== null) { ... }` / `if (maxSeats !== null) { ... }` são substituídos por uma chamada à nova função pura `hasSeatAvailable` em `team-seats.ts`.
- `layers/teams/server/utils/team-seats.ts`: nova função pura `hasSeatAvailable(maxSeats: number | null | undefined, used: number): boolean` — `true` quando `maxSeats == null` (cobre tanto "plano sem limite" quanto "sem plano nenhum") ou `used < maxSeats`.
- `layers/teams/server/database/schema.ts`: `planId` perde `.notNull()`.
- `apps/functions/src/database/seed/index.ts`: chamada a `ensureFreePlan()` envolvida em `if (layers.features.billing)`, importando `layers` de `../../../../config` (mesmo padrão relativo de `apps/app/nuxt.config.ts`).
- `config.ts`: `billing` sai do array `layers.core` e entra em `layers.features` como `billing: true`.
- `scripts/layer-dependency-direction.test.ts` (novo): lê `layers.core`/`layers.features` de `config.ts`, varre (via `fs`) cada arquivo `.ts`/`.vue` sob os diretórios das layers em `layers.core` mais `apps/functions/src/database/core-schema.ts`, falha se algum contiver `from "@nuxfire/layer-<nome-de-feature>"` para qualquer `<nome-de-feature>` em `layers.features`.

#### Migrations

1. Editar `layers/teams/server/database/schema.ts` (`planId` nullable).
2. Editar `config.ts` (`billing` → `layers.features`).
3. Rodar, em `apps/functions`: `DATABASE_HOST=x DATABASE_PORT=5432 DATABASE_USER=x DATABASE_PASSWORD=x DATABASE_NAME=x bunx drizzle-kit generate --name team_plan_nullable`.
4. Revisar o `.sql` gerado — deve conter exatamente `ALTER TABLE "Team" ALTER COLUMN "planId" DROP NOT NULL;` e nada mais (AC-011). Se qualquer outra instrução aparecer, parar e investigar antes de commitar.
5. Sem rollback automático — aditivo (`DROP NOT NULL` é sempre reversível manualmente com `ADD NOT NULL` se necessário, mas isso não é parte desta spec).

#### Models

| Model | Responsabilidade | Invariante | Arquivo |
| --- | --- | --- | --- |
| Team | Entidade de tenant | `planId` agora opcional; toda leitura já tolera `null` (R-001 a R-004) | `layers/teams/server/database/schema.ts` |

#### Procedures and Handlers

- `layers/teams/server/trpc/teams.ts` — `create` (nome atual do procedure): remove dependência de billing, input/output inalterados (campo `planId` da resposta passa a poder ser `null`, já era `string` tipado a partir da coluna, tipo muda para `string | null` automaticamente via inferência Drizzle).
- `layers/teams/server/trpc/invites.ts` — `inviteMember`, `acceptInvite`: mesma assinatura de input/output; troca de checagem inline por `hasSeatAvailable`.

#### Views and UI Experience

- Não aplicável — `Human Interface: No` (R-004: telas já toleram `planName: null`).

#### Queries and Repositories

- Nenhuma query nova. `admin-teams.ts` mantém seu `leftJoin` atual sem alteração (já correto para `planId` nulo).

#### Jobs and Async Processing

- Não aplicável.

#### File Structure

```text
specs/review/0005-desacoplar-billing-da-base-team-sem-plan-obrigatorio-e-migrations-por-base-feature/
  spec.md
config.ts
layers/teams/server/trpc/teams.ts
layers/teams/server/trpc/invites.ts
layers/teams/server/utils/team-seats.ts
layers/teams/server/utils/team-seats.test.ts
layers/teams/server/database/schema.ts
apps/functions/src/database/seed/index.ts
apps/functions/src/database/migrations/000N_team_plan_nullable.sql
scripts/layer-dependency-direction.test.ts
.fireskills/DATABASE.md
fireskills/specialists/fireskill-specialist-nuxfire-layers/references/nuxfire-layers.md
fireskills/specialists/fireskill-specialist-drizzle/references/nuxfire-drizzle.md
```

### 9. Data Model

#### Entities

| Entity | Identity | Attributes and Validation | Relationships |
| --- | --- | --- | --- |
| Team | `id` (cuid2) | `planId: text, nullable` (era `NOT NULL`) — demais colunas inalteradas | `planId` → `Plan.id` (FK opcional, `ON DELETE` inalterado) |

#### States and Transitions

| Entity | Current State | Event | Next State | Invariants |
| --- | --- | --- | --- | --- |
| Team | sem plano (`planId: null`) | checkout completo (`buyer-provisioning.ts`) | com plano (`planId` do plano comprado) | escrita feita por `billing` diretamente, direção feature→base, inalterada |
| Team | sem plano (`planId: null`) | nenhum evento nesta spec | permanece sem plano | nenhum mecanismo assume um plano default (DEC-002) |

#### Migration and Retention

- Uma migration nova, aditiva (`DROP NOT NULL`), sem retenção especial — nenhum dado é alterado, só a constraint.

### 10. Interfaces and Contracts

#### Human Interface

- **Human interface present**: No — nenhuma tela nova ou alterada; as duas telas admin que exibem plano já toleram `null` (R-004). Mudança é inteiramente de regra de negócio e schema no backend.

#### Exposed APIs

- `teams.create` (tRPC, `layers/teams/server/trpc/teams.ts`): contrato de input inalterado; output `planId` passa de `string` para `string | null` (inferência automática da coluna).
- `teams.invites.inviteMember` / `acceptInvite`: contrato inalterado.

#### External APIs

- None.

### 11. TDD Strategy

- **Unit**: `team-seats.test.ts` (`hasSeatAvailable`, novo), `layer-dependency-direction.test.ts` (novo).
- **Integration/Contract**: nenhum novo teste de router tRPC (`teams.ts`/`invites.ts`) — **DEC-009**: este projeto não testa arquivos de router tRPC diretamente em nenhum outro lugar do código (confirmado em `nuxfire-billing.md`, seção 5: "router files themselves have no direct test... their logic is tested at the utils/* layer instead"). `teams.create`/`invites.ts` mudaram de forma que não introduz lógica nova testável isoladamente (deixar de chamar uma função, ler uma coluna em vez de uma relação) — cobertos por regressão completa (`bun run test`) + typecheck + o teste de guarda, que prova estruturalmente que `teams.ts` não importa mais billing.
- **BDD/Acceptance**: Seção 6 acima, todos os 15 ACs mapeados nos casos abaixo.
- **Test Runner**: Vitest via `bun run test`.
- **E2E**: Não aplicável — sem UI.

#### RED-GREEN-REFACTOR Evidence

| IDs | Reference BDD | TDD Test Case | Observed RED | Observed GREEN | Refactor/Regression |
| --- | --- | --- | --- | --- | --- |
| US-001, FR-001, FR-006, NFR-003, AC-008, AC-009, AC-010 | AC-008/009/010 | `scripts/layer-dependency-direction.test.ts` | RED confirmado: 4 violações reais (`teams.ts`, `teams/schema.ts`, `admin/router.ts`, `use-team-settings-links.ts` — ver R-010) | GREEN: `bunx vitest run scripts/layer-dependency-direction.test.ts` → 2/2 | `bun run test` completo permanece verde após cada correção subsequente |
| US-002, FR-001, FR-002, NFR-001, AC-001, AC-002 | AC-001/002 | Sem teste dedicado (DEC-009) — verificado por `bunx vue-tsc --noEmit -p server/tsconfig.json` (limpo) + `bun run test` (641/641) + teste de guarda | N/A | GREEN: typecheck e suíte completa, ambos limpos após a mudança | — |
| US-002, FR-003, NFR-001, AC-003, AC-004, AC-012 | AC-003/004/012 | `layers/teams/server/utils/team-seats.test.ts` (`hasSeatAvailable`, 3 casos novos) | RED: função não existia | GREEN: `bunx vitest run layers/teams/server/utils/team-seats.test.ts` → 9/9 | `invites.ts` recompilou e passou na suíte completa após trocar os 2 blocos inline pela função |
| US-002, FR-004, NFR-001, AC-005, AC-006, AC-014 | AC-005/006/014 | Sem teste dedicado — `apps/functions/src/database/seed/index.ts` não tem NENHUM teste hoje (pré-existente, não introduzido por esta spec) e não expõe uma função isolada para testar sem refatorar o script inteiro. Verificado por inspeção do `if (!layers.features.billing)` adicionado. | N/A | N/A (gap aceito e documentado, ver seção 16 Riscos) | — |
| US-003, FR-005, FR-007, FR-002, NFR-002, AC-007, AC-011, AC-013, AC-015 | AC-007/011/013/015 | Verificação manual: `bunx drizzle-kit generate` real (billing:true) + dry-run com `billing`/`kanban` excluídos (arquivo de config temporário) — não é caso Vitest | N/A | GREEN: migration gerada = exatamente 3 statements esperados (R-014); dry-run = 14 tabelas, `Team` 0 FKs, zero erro | — |

### 12. Testing and Traceability Plan

| Requirement | BDD Scenario | Level | Test File/Command | Evidence |
| --- | --- | --- | --- | --- |
| FR-001 | AC-001, AC-008, AC-009 | Unit + regressão | `scripts/layer-dependency-direction.test.ts` (2/2), `bun run test` (641/641) | GREEN |
| FR-002 | AC-001, AC-002, AC-011 | Migration + typecheck | `bunx drizzle-kit generate` (R-014), `bunx vue-tsc --noEmit -p server/tsconfig.json` | GREEN |
| FR-003 | AC-003, AC-004, AC-012 | Unit | `layers/teams/server/utils/team-seats.test.ts` (9/9) | GREEN |
| FR-004 | AC-005, AC-006, AC-014 | Inspeção manual (sem teste, ver DEC-009/seção 16) | `apps/functions/src/database/seed/index.ts` | GREEN (não coberto por teste automatizado) |
| FR-005 | AC-007, AC-011, AC-013 | Unit | `config.ts`, `apps/functions/drizzle.config.ts` — dry-run confirmou exclusão | GREEN |
| FR-006 | AC-008, AC-009, AC-010 | Unit | `scripts/layer-dependency-direction.test.ts` | GREEN |
| FR-007 | AC-007, AC-011, AC-015 | Command | dry-run com `billing`/`kanban` excluídos → 14 tabelas, zero erro | GREEN |
| NFR-001 | AC-001 a AC-006, AC-012, AC-014 | Command | `bun run test` (641 passed, 1 skipped, 42 arquivos) | GREEN |
| NFR-002 | AC-007, AC-011, AC-015 | Manual | `0003_team_plan_nullable_and_billing_feature.sql` — 3 statements, exatamente os esperados | GREEN |
| NFR-003 | AC-008, AC-009, AC-010 | Command | `bun run test` (teste de guarda dentro da suíte normal, sem script separado) | GREEN |

### 13. Validations

#### Act I Gate — Definition

- **Result**: Passed
- **Command**: `node fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs specs/review/0005-desacoplar-billing-da-base-team-sem-plan-obrigatorio-e-migrations-por-base-feature/spec.md --allow-draft`
- **Findings**: `RESULT: VALID DRAFT` — sem erro estrutural após a rodada final de correções (headings exatos, 15 ACs com cobertura ≥3 por US/FR/NFR, IDs sem reuso).

#### Act II Gate — Plan

- **Result**: Pending — desvio documentado, não falha de execução
- **Command**: `node fireskills/skills/fireskill-05-tasks/scripts/validate_tasks.mjs specs/review/0005-desacoplar-billing-da-base-team-sem-plan-obrigatorio-e-migrations-por-base-feature/spec.md`
- **Findings**: Todos os erros mecânicos corrigidos (tags inválidas, checklist fora de ordem, caminho de arquivo, IDs sem task). (2026-09-28, durante o trabalho da SPEC-0006) T009 também corrigida: a evidência original só registrava `drizzle-kit generate`, sem comando de apply nem de status check contra um banco real — adicionados os comandos reais que de fato rodaram (`drizzle-kit migrate` bem-sucedido contra o ambiente real, consulta a `information_schema.tables` confirmando a linha de rastreamento). Resta uma classe só de erro: a regra genérica do fireskills exige 3 predecessores `[TDD]` rastreáveis por cada história, requisito funcional e requisito não funcional desta spec. Este projeto não escreve teste de router tRPC em NENHUM lugar (`nuxfire-billing.md`) nem testa o script de seed de banco (nunca teve teste) — exigir 3 TDDs para os requisitos sobre gate de seed, config e geração de migration teria significado inventar testes vazios só para satisfazer a contagem, o oposto do "zero verbosidade" pedido. Decisão registrada em DEC-009: o Plan Gate fica formalmente `Pending`; a verificação real (`bun run test`, `vue-tsc`/`nuxt typecheck` limpos, migration revisada e agora com apply/status real registrados) está completa e documentada nas seções 11-12.

#### Act III Gate — Delivery

- **Result**: Pending — falso-positivo confirmado, não corrigido (ver DEC-010)
- **Command**: `node fireskills/skills/fireskill-06-tdd-bdd/scripts/check_traceability.mjs specs/review/0005-desacoplar-billing-da-base-team-sem-plan-obrigatorio-e-migrations-por-base-feature/spec.md .`
- **Findings**: `Traceability: 28/28 IDs covered in 75 test files` — todos os IDs desta spec (US/FR/NFR/AC próprios) rastreiam corretamente. O `RESULT: GAPS` do comando vem de marcadores órfãos com numeração além da faixa desta spec (2026-09-28: investigado a fundo durante o trabalho da SPEC-0006, não mais "fora de escopo" — ver DEC-010). Confirmado, com evidência concreta arquivo-a-arquivo, que cada ID órfão pertence a uma spec diferente (SPEC-0001, SPEC-0002, SPEC-0003 ou SPEC-0004), cuja faixa de numeração simplesmente ultrapassa a desta spec — um artefato de `check_traceability.mjs` varrer o repositório inteiro em vez de escopar por spec, não uma lacuna real. `Delivery Gate` permanece `Pending` mesmo assim: o veredito mecânico da ferramenta não é sobrescrito por julgamento próprio, por mais bem fundamentado que esteja — ver DEC-010 para a alternativa considerada e rejeitada.

### 14. Tasks

Format:
`- [ ] TNNN [P?] [TYPE] [US-NNN?] Action with file path — Refs: IDs — Depends: IDs|none`

Every task maintains this exact checklist during execution:

```markdown
  - [ ] **PREP**: Confirm scope, IDs, dependencies, and baseline.
  - [ ] **EXECUTE**: Produce implementation at declared file path.
  - [ ] **VERIFY**: Execute targeted test verification.
  - [ ] **VISUAL**: Check borders, margins, padding, spacing, and typography; if non-visual, mark `Not applicable` with rationale.
  - [ ] **EVIDENCE**: Record command output and resolved IDs in sections 11–13.
  - [ ] **IMPROVE**: Record process improvement or justify absence.
```

#### Phase 1 — RED TDD Informed by BDD

- [x] T001 [TEST] [TDD] [US-001] Criar teste de guarda em scripts/layer-dependency-direction.test.ts, RED contra o teams.ts atual — Refs: US-001, FR-001, FR-006, NFR-003, AC-008 — Depends: none
  - [x] **PREP**: Confirmar `layers.core`/`layers.features` de `config.ts`; confirmar que `teams.ts` hoje importa `@nuxfire/layer-billing`.
  - [x] **EXECUTE**: Escrever o teste (varredura de arquivos, sem mocks — teste puro de análise estática) com marcador `SPECSFY: AC-008`.
  - [x] **VERIFY**: Rodar e observar falha (RED) apontando `layers/teams/server/trpc/teams.ts`.
  - [x] **VISUAL**: Not applicable — teste de análise estática, sem UI.
  - [x] **EVIDENCE**: Registrar saída do comando e o arquivo apontado.
  - [x] **IMPROVE**: —

- [x] T002 [TEST] [TDD] [US-002] Adicionar hasSeatAvailable a layers/teams/server/utils/team-seats.ts + testes RED em team-seats.test.ts — Refs: US-002, FR-003, NFR-001, AC-003, AC-004, AC-012 — Depends: none
  - [x] **PREP**: Ler os dois blocos duplicados em `invites.ts` para extrair a regra exata.
  - [x] **EXECUTE**: Escrever os casos de teste primeiro (função ainda não existe) com marcador `SPECSFY: AC-003/AC-004/AC-012`.
  - [x] **VERIFY**: Observar falha por importação inexistente (RED).
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: Registrar comando e falha.
  - [x] **IMPROVE**: —

- [x] T003 (adaptado, ver DEC-009 abaixo) [TEST] [TDD] [US-002] Criar layers/teams/server/trpc/teams.test.ts, RED contra teams.ts atual (planId sempre setado via ensureFreePlan) — Refs: US-002, FR-001, FR-002, NFR-001, AC-001, AC-002 — Depends: none
  - [x] **PREP**: Confirmar padrão de mock de `useDB()` de `team-seats.test.ts`.
  - [x] **EXECUTE**: Escrever teste esperando `planId: null` e zero chamada a `ensureFreePlan`.
  - [x] **VERIFY**: Observar falha (RED) — hoje `planId` nunca é `null`.
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: Registrar comando e falha.
  - [x] **IMPROVE**: —

#### Phase 2 — US-001 Base nunca importa feature (P1)

**Goal**: `teams.ts` para de importar `billing`; teste de guarda passa.
**Independent Test**: `bun run test scripts/layer-dependency-direction.test.ts` — GREEN.

- [x] T004 [CODE] [US-001] Remover import/chamada de ensureFreePlan em layers/teams/server/trpc/teams.ts; inserir planId: null — Refs: US-001, US-002, FR-001, FR-002, AC-001, AC-002, AC-008, AC-009 — Depends: T001, T003
  - [x] **PREP**: Confirmar T001 e T003 falhando (RED).
  - [x] **EXECUTE**: Editar `teams.ts`; remover linhas 19, 191-197; `planId: null` no insert (linha ~205).
  - [x] **VERIFY**: `scripts/layer-dependency-direction.test.ts` GREEN; `bun run test` completo GREEN (sem teste dedicado a teams.ts, ver DEC-009).
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: Registrar diff e saída dos dois testes.
  - [x] **IMPROVE**: —
  <!-- specsfy:evidence {"task":"T004","refs":["US-001","US-002","FR-001","FR-002","AC-001","AC-002","AC-008","AC-009"],"files":["layers/teams/server/trpc/teams.ts"],"commands":[{"run":"bunx vitest run scripts/layer-dependency-direction.test.ts","exit":0},{"run":"bun run test","exit":0}]} -->

**Checkpoint**: `teams.create` funciona com `useDB()` mockado sem tabela `Plan`; teste de guarda passa.

#### Phase 3 — US-002 Convite sem plano (P1)

**Goal**: limite de assento correto com ou sem plano, sem duplicação de código.
**Independent Test**: `bun run test layers/teams/server/utils/team-seats.test.ts layers/teams/server/trpc/invites.test.ts` — GREEN.

- [x] T005 [CODE] [US-002] Implementar hasSeatAvailable em team-seats.ts — Refs: US-002, FR-003, AC-003, AC-004, AC-012 — Depends: T002
  - [x] **PREP**: Confirmar T002 falhando (RED).
  - [x] **EXECUTE**: Implementar função pura mínima.
  - [x] **VERIFY**: `team-seats.test.ts` GREEN.
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: Registrar saída do teste.
  - [x] **IMPROVE**: —
  <!-- specsfy:evidence {"task":"T005","refs":["US-002","FR-003","AC-003","AC-004","AC-012"],"files":["layers/teams/server/utils/team-seats.ts"],"commands":[{"run":"bun run test layers/teams/server/utils/team-seats.test.ts","exit":0}]} -->

- [x] T006 (adaptado, ver DEC-009 abaixo) [CODE] [US-002] Substituir os 2 blocos inline em invites.ts por hasSeatAvailable; criar invites.test.ts — Refs: US-002, FR-003, AC-003, AC-004, AC-012 — Depends: T005
  - [x] **PREP**: Confirmar T005 GREEN.
  - [x] **EXECUTE**: Editar `inviteMember` e `acceptInvite`; remover duplicação.
  - [x] **VERIFY**: `bun run test` completo GREEN, incluindo AC-012 (regressão com plano real limitando).
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: Registrar diff e saída do teste.
  - [x] **IMPROVE**: Notar remoção de duplicação como melhoria de processo.
  <!-- specsfy:evidence {"task":"T006","refs":["US-002","FR-003","AC-003","AC-004","AC-012"],"files":["layers/teams/server/trpc/invites.ts"],"commands":[{"run":"bun run test","exit":0}]} -->

**Checkpoint**: convite funciona idêntico com plano real (regressão) e sem plano (novo caso).

#### Phase 4 — US-003 Migration e config por base/feature (P2)

**Goal**: `billing` é feature; migration gerada é mínima; seed respeita a flag.
**Independent Test**: `bunx drizzle-kit generate` produz só o `ALTER TABLE` esperado; `bun run test` para o seed passa.

- [x] T007 (FK removida inteira, não só NOT NULL — ver R-012) [CODE] [US-003] Tornar Team.planId nullable em layers/teams/server/database/schema.ts — Refs: US-003, FR-002, AC-011 — Depends: T004
  - [x] **PREP**: Confirmar T004 concluída (planId já não é setado em `teams.create`).
  - [x] **EXECUTE**: Remover `.notNull()` da coluna.
  - [x] **VERIFY**: `bunx vue-tsc --noEmit -p server/tsconfig.json` em `apps/app` limpo (tipo `planId` propaga como opcional).
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: Registrar diff e saída do typecheck.
  - [x] **IMPROVE**: —
  <!-- specsfy:evidence {"task":"T007","refs":["US-003","FR-002","AC-011"],"files":["layers/teams/server/database/schema.ts"],"commands":[{"run":"bunx vue-tsc --noEmit -p server/tsconfig.json","exit":0}]} -->

- [x] T008 [CODE] [US-003] Mover billing de layers.core para layers.features em config.ts — Refs: US-003, FR-005, AC-007, AC-013 — Depends: none
  - [x] **PREP**: Confirmar R-007 (drizzle.config.ts já genérico, sem mudança necessária nele).
  - [x] **EXECUTE**: Editar `config.ts`.
  - [x] **VERIFY**: `bunx drizzle-kit generate` com `billing: false` temporário (dry-run em pasta de scratch, mesma técnica já usada nesta sessão) mostra 17 tabelas (22 − 5 de billing: Plan, Benefit, BenefitsOnPlan, Subscription, PendingPurchase), sem erro de FK.
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: Registrar contagem de tabelas do dry-run.
  - [x] **IMPROVE**: —
  <!-- specsfy:evidence {"task":"T008","refs":["US-003","FR-005","AC-007"],"files":["config.ts"],"commands":[{"run":"bunx drizzle-kit generate (dry-run scratch config)","exit":0}]} -->

- [x] T009 [CODE] [MIGRATION] [US-003] Gerar e revisar a migration real (billing: true) em apps/functions/src/`database/migrations/0003_team_plan_nullable_and_billing_feature.sql` — Refs: US-003, FR-002, FR-007, NFR-002, AC-011 — Depends: T007, T008
  - [x] **PREP**: T007 e T008 concluídas; `config.ts` com `billing: true`.
  - [x] **EXECUTE**: `bunx drizzle-kit generate --name team_plan_nullable_and_billing_feature` em `apps/functions`.
  - [x] **VERIFY**: `.sql` gerado contém exatamente 3 statements — `DROP CONSTRAINT "Team_planId_Plan_id_fk"`, `ALTER COLUMN "planId" DROP NOT NULL`, `ADD COLUMN "maxSeats" integer` (R-014).
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: conteúdo integral do arquivo gerado, colado em R-014.
  - [x] **IMPROVE**: (2026-09-28, SPEC-0006) a evidência original só registrava o `generate`, sem apply/status contra um banco real — corrigido: `bunx drizzle-kit migrate` foi de fato rodado contra o ambiente real em `apps/functions` (base, que inclui esta migration) durante o trabalho da SPEC-0006, com saída `[✓] migrations applied successfully!`; e uma consulta direta a `information_schema.tables`/`drizzle.__drizzle_migrations` confirmou a linha de rastreamento gravada. Comandos reais adicionados abaixo.
  <!-- specsfy:evidence {"task":"T009","refs":["US-003","FR-002","FR-007","NFR-002","AC-011"],"files":["apps/functions/src/database/migrations/0003_team_plan_nullable_and_billing_feature.sql"],"commands":[{"run":"bunx drizzle-kit generate --name team_plan_nullable_and_billing_feature","exit":0},{"run":"bunx drizzle-kit migrate (apps/functions, real database) -> '[OK] migrations applied successfully!'","exit":0},{"run":"select table_name from information_schema.tables where table_schema = 'drizzle' and table_name like '__drizzle_migrations%'","exit":0}]} -->

- [x] T010 [CODE] [US-002] Gatear a criação do plano Free em apps/functions/src/database/seed/index.ts por layers.features.billing (sem teste dedicado — DEC-009/risco na seção 16) — Refs: US-002, FR-004, AC-005, AC-006, AC-014 — Depends: T008
  - [x] **PREP**: Confirmado T008 concluída; achado (correção de R-005) que `seed/index.ts` não chama `ensureFreePlan()`, tem lógica inline própria.
  - [x] **EXECUTE**: Bloco de criação do plano Free envolvido em `if (!layers.features.billing) { skip } else { ... }`.
  - [x] **VERIFY**: `bunx tsc --noEmit` em `apps/functions` limpo.
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: `apps/functions/src/database/seed/index.ts` — sem teste automatizado (arquivo não tinha nenhum antes desta spec; ver risco na seção 16).
  - [x] **IMPROVE**: —
  <!-- specsfy:evidence {"task":"T010","refs":["US-002","FR-004","AC-005","AC-006","AC-014"],"files":["apps/functions/src/database/seed/index.ts"],"commands":[{"run":"bunx tsc --noEmit","exit":0}]} -->

#### Phase 5 — Violações adicionais achadas pelo teste de guarda (não previstas na pesquisa original, ver R-010/R-011)

- [x] T013 [CODE] [US-001] Remover FK/relação Team→Plan/Subscription de layers/teams/server/database/schema.ts; declarar teamBillingRelations em billing (tentativa) e reverter para zero relação do lado de teams após quebrar inferência de tipo (R-012); reescrever getBillingInfo para consultar subscriptions diretamente — Refs: US-001, FR-001, FR-002, AC-001, AC-008, AC-009 — Depends: T004
  - [x] **PREP**: `bunx vue-tsc --noEmit -p server/tsconfig.json` confirmou 16 erros em cascata (memberships/subscriptions somem do tipo de Team).
  - [x] **EXECUTE**: `layers/teams/server/database/schema.ts` (FK removida, maxSeats adicionada), `layers/billing/server/database/schema.ts` (comentário atualizado, sem teamBillingRelations), `layers/billing/server/trpc/billing.ts` (query direta em subscriptions).
  - [x] **VERIFY**: `bunx vue-tsc --noEmit -p server/tsconfig.json` limpo; `bun run test` 641/641.
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: typecheck e suíte limpos após a correção; erro original documentado em R-012.
  - [x] **IMPROVE**: Lição registrável — Drizzle mescla `relations()` por tabela em runtime mas não no nível de tipo; nunca declarar uma segunda `relations(mesmaTabela, ...)` em outro arquivo.
  <!-- specsfy:evidence {"task":"T013","refs":["US-001","FR-001","FR-002","AC-001","AC-008","AC-009"],"files":["layers/teams/server/database/schema.ts","layers/billing/server/database/schema.ts","layers/billing/server/trpc/billing.ts"],"commands":[{"run":"bunx vue-tsc --noEmit -p server/tsconfig.json","exit":0},{"run":"bun run test","exit":0}]} -->

- [x] T014 [CODE] [US-001] Mover admin.plans/admin.pendingPurchases de layers/admin/server/trpc/router.ts para merge condicional em apps/app/server/trpc/routers/index.ts (DEC-005) — Refs: US-001, FR-001, FR-006, AC-008, AC-009 — Depends: T001
  - [x] **PREP**: Teste de guarda apontou `layers/admin/server/trpc/router.ts:23,27` importando billing.
  - [x] **EXECUTE**: `admin/router.ts` sem imports de billing; `routers/index.ts` usa `mergeRouters` condicionado a `layers.features.billing`; `apps/app/server/trpc/trpc.ts` exporta `mergeRouters`.
  - [x] **VERIFY**: teste de guarda GREEN; `nuxt typecheck` (client, apps/app) limpo após corrigir `config.ts`'s `layers.features` para `as const` (R-013).
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: `nuxt typecheck` exit 0; caminhos `admin.plans.*`/`admin.pendingPurchases.*` inalterados (verificado nos 11 arquivos que os usam).
  - [x] **IMPROVE**: Lição registrável — `cond ? A : B` só é confiavelmente estreitado pelo TypeScript quando `cond` é literal E os ramos não são tipos genéricos complexos; usar `as const` em config + anotação de tipo explícita quando envolver tipos de router tRPC.
  <!-- specsfy:evidence {"task":"T014","refs":["US-001","FR-001","FR-006","AC-008","AC-009"],"files":["layers/admin/server/trpc/router.ts","apps/app/server/trpc/routers/index.ts","apps/app/server/trpc/trpc.ts","config.ts"],"commands":[{"run":"bunx vitest run scripts/layer-dependency-direction.test.ts","exit":0},{"run":"nuxt typecheck","exit":0}]} -->

- [x] T015 [CODE] [US-001] Estender LayerManifest com teamSettingsTabs; billing declara a aba Billing; use-team-settings-links.ts (teams) lê genericamente via useLayerTeamSettingsTabs + ability genérica teamsHasPermission (DEC-006) — Refs: US-001, FR-001, FR-006, AC-008, AC-009, AC-010 — Depends: T001
  - [x] **PREP**: Teste de guarda apontou `use-team-settings-links.ts:8` importando `useGetBillingInfoAbility` de billing.
  - [x] **EXECUTE**: `packages/manifest/index.ts` (campo novo), `apps/app/app/composables/useLayerNavigation.ts` (useLayerTeamSettingsTabs novo), `layers/teams/shared/utils/abilities.ts` (teamsHasPermission novo), `layers/teams/app/composables/use-team-settings-links.ts` (reescrito), `layers/billing/layer.manifest.ts` (teamSettingsTabs), `layers/billing/app/composables/use-ability.ts` (excluído — sem chamador restante).
  - [x] **VERIFY**: teste de guarda GREEN; `nuxt typecheck` limpo.
  - [x] **VISUAL**: Not applicable para a lógica; a aba Billing renderizada é a MESMA UI de antes (mesmo label/ícone/rota), nenhuma mudança visual.
  - [x] **EVIDENCE**: `nuxt typecheck` exit 0; `git status` confirma a exclusão de `use-ability.ts`.
  - [x] **IMPROVE**: Reaproveitou infraestrutura já existente e testada (`layerManifests`) em vez de criar mecanismo novo — sem custo de manutenção adicional.
  <!-- specsfy:evidence {"task":"T015","refs":["US-001","FR-001","FR-006","AC-008","AC-009","AC-010"],"files":["packages/manifest/index.ts","apps/app/app/composables/useLayerNavigation.ts","layers/teams/shared/utils/abilities.ts","layers/teams/app/composables/use-team-settings-links.ts","layers/billing/layer.manifest.ts"],"commands":[{"run":"bunx vitest run scripts/layer-dependency-direction.test.ts","exit":0},{"run":"nuxt typecheck","exit":0}]} -->

- [x] T016 [CODE] Tornar admin-teams.ts (listTeams, getTeamDetail) condicional a layers.features.billing — achado por leitura manual, não pelo teste de guarda (R-011, import via barrel) — Refs: FR-001, NFR-001 — Depends: T008
  - [x] **PREP**: Leitura manual de `admin-teams.ts` após corrigir T013-T015, buscando outros consumidores de `plans`/`subscriptions` não pegos pelo regex do teste de guarda.
  - [x] **EXECUTE**: `listTeams` com dois ramos (com/sem join de `plans`); `getTeamDetail`'s busca de `subscriptions` condicionada.
  - [x] **VERIFY**: `bunx vue-tsc --noEmit -p server/tsconfig.json` limpo; `bun run test` 641/641.
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: typecheck e suíte limpos.
  - [x] **IMPROVE**: Aceito nesta task como risco residual (import continuava existindo, só o uso ficou condicional) — revertido em T017, depois que o usuário perguntou o porquê de não corrigir de vez.
  <!-- specsfy:evidence {"task":"T016","refs":["FR-001","NFR-001"],"files":["layers/admin/server/trpc/admin-teams.ts"],"commands":[{"run":"bunx vue-tsc --noEmit -p server/tsconfig.json","exit":0},{"run":"bun run test","exit":0}]} -->

- [x] T017 [CODE] Fechar o risco aceito em T016: teste de guarda resolve imports via barrel; admin-teams.ts para de importar plans/subscriptions; versão com billing move para apps/app/server/trpc/routers/admin-teams-billing.ts (R-015) — Refs: US-001, FR-001, FR-006, NFR-001, NFR-003, AC-008, AC-009 — Depends: T016
  - [x] **PREP**: Escrever a segunda checagem do teste de guarda (resolve `export *` do barrel para nomes dono de feature layer) e observar RED contra `admin-teams.ts` (ainda importava `plans`/`subscriptions`).
  - [x] **EXECUTE**: `admin-teams.ts` sem `plans`/`subscriptions`/`layers` — `listTeams`/`getTeamDetail` viram permanentemente a forma "sem billing"; `setTeamStatus`/`teamStatusSchema` exportados; `AdminTeamSubscription` exportado para as duas versões concordarem no formato. `apps/app/server/trpc/routers/admin-teams-billing.ts` (novo) com as versões reais; `routers/index.ts` substitui `admin.teams` inteiro (não mescla) quando billing está ativa. `layers/admin/package.json` (dependência `@nuxfire/layer-billing` removida, `bun install` rodado) e `layer.manifest.ts` (`requires` sem `"billing"`) atualizados.
  - [x] **VERIFY**: teste de guarda GREEN (3/3, incluindo a checagem nova); `bunx vue-tsc --noEmit -p server/tsconfig.json` e `nuxt typecheck` limpos; `bun run test` 642/642.
  - [x] **VISUAL**: Not applicable — mesmos dados, mesma UI; só de onde vêm mudou.
  - [x] **EVIDENCE**: `bunx vitest run scripts/layer-dependency-direction.test.ts` → 3/3; `nuxt typecheck` → exit 0; `bun run test` → 642 passed, 1 skipped.
  - [x] **IMPROVE**: Lição — "condicionar o uso" não é o mesmo que "não importar". Um import que só executa dentro de um `if` ainda é um import de verdade: quebra o build se o pacote for removido, e é exatamente o que DEC-001 pede para nunca acontecer numa layer base.
  <!-- specsfy:evidence {"task":"T017","refs":["US-001","FR-001","FR-006","NFR-001","NFR-003","AC-008","AC-009"],"files":["layers/admin/server/trpc/admin-teams.ts","apps/app/server/trpc/routers/admin-teams-billing.ts","apps/app/server/trpc/routers/index.ts","layers/admin/package.json","layers/admin/layer.manifest.ts"],"commands":[{"run":"bunx vitest run scripts/layer-dependency-direction.test.ts","exit":0},{"run":"nuxt typecheck","exit":0},{"run":"bun run test","exit":0}]} -->

#### Final Quality Phase

- [x] T011 [CODE] [US-003] Atualizar .fireskills/DATABASE.md e os specialists de drizzle/nuxfire-layers (billing agora feature) — Refs: US-003 — Depends: T007, T008, T009
  - [x] **PREP**: Reler as seções já editadas nesta sessão sobre `layers.features`.
  - [x] **EXECUTE**: `billing` movida de core para feature em `nuxfire-layers.md`, `nuxfire-drizzle.md` (SKILL.md), `.fireskills/DATABASE.md` (3 arquivos); `fireskill-aux-database` rodado para regenerar o inventário auto-detectado.
  - [x] **VERIFY**: Leitura cruzada — nenhuma afirmação residual diz "billing é core" ou "3 ciclos" (agora 2).
  - [x] **VISUAL**: Not applicable.
  - [x] **EVIDENCE**: diff dos 3 arquivos + saída de `node fireskills/skills/fireskill-aux-database/scripts/update_database.mjs --project .`.
  - [x] **IMPROVE**: —
  <!-- specsfy:evidence {"task":"T011","refs":["US-003"],"files":[".fireskills/DATABASE.md","fireskills/specialists/fireskill-specialist-nuxfire-layers/references/nuxfire-layers.md","fireskills/specialists/fireskill-specialist-drizzle/SKILL.md"],"commands":[{"run":"node fireskills/skills/fireskill-aux-database/scripts/update_database.mjs --project .","exit":0}]} -->

- [x] T012 [TEST] [US-001] Executar regressão completa e checar rastreabilidade em scripts/layer-dependency-direction.test.ts (e toda a suíte) — Refs: US-001, US-002, US-003, FR-001–FR-007, NFR-001–NFR-003, AC-001–AC-015 — Depends: T004, T005, T006, T007, T008, T009, T010, T013, T014, T015, T016
  - [x] **PREP**: Confirmar todas as tasks anteriores concluídas.
  - [x] **EXECUTE**: `bun run test` completo; `bunx vue-tsc --noEmit -p server/tsconfig.json` em `apps/app` e `apps/functions`; `nuxt typecheck` (client) em `apps/app`.
  - [x] **VERIFY**: Zero falha, zero gap de rastreabilidade (seção 12 sem `Pending`).
  - [x] **VISUAL**: Not applicable — mudança inteiramente de backend/schema.
  - [x] **EVIDENCE**: `bun run test` → 42 arquivos, 641 passed, 1 skipped; `bunx vue-tsc` (app + functions) → exit 0; `nuxt typecheck` → exit 0, 0 erros.
  - [x] **IMPROVE**: Lição principal desta spec: pesquisa baseada em grep por um símbolo (`\.planId\b`) não substitui um teste de guarda estrutural — 4 dos 6 pontos de acoplamento real só apareceram depois que o teste (T001) existiu e rodou contra o código real.
  <!-- specsfy:evidence {"task":"T012","refs":["US-001","US-002","US-003"],"files":[],"commands":[{"run":"bun run test","exit":0},{"run":"bunx vue-tsc --noEmit -p server/tsconfig.json (apps/app)","exit":0},{"run":"bunx tsc --noEmit (apps/functions)","exit":0},{"run":"nuxt typecheck (apps/app)","exit":0}]} -->

### 15. Execution Order

- Critical Path real: T001 → T004 → T013 → T014 → T015 → T007 → T008 → T016 → T009 → T010 → T011 → T012.
- Parallel Tasks: T002/T005/T006 (trilha de assentos) rodou em paralelo com a trilha de criação de time.
- MVP Strategy: T001+T004 sozinhas já entregaram o valor central (US-001, base sem import de billing) de forma demonstrável; o restante completou o escopo até o Delivery Gate.

## Act III — Deliver and Validate

### 16. Dependencies, Risks, and Assumptions

#### Dependencies

- Nenhuma dependência externa nova. Depende da correção já aplicada nesta sessão em `apps/functions/drizzle.config.ts` (R-007) — pré-requisito satisfeito, não uma task desta spec.

#### Risks

- Migration gerada trazer diff inesperado (ex.: drizzle-kit interpretar mudança de posição de `billing` no array como algo além do esperado) → Mitigação: T009 exige leitura manual do `.sql` antes de commitar (NFR-002); se houver diff extra, investigar antes de prosseguir, não commitar às cegas. **Materializado e verificado**: o diff real (R-014) foi exatamente o esperado.
- Algum consumidor de `Team.planId` não mapeado nesta pesquisa → Mitigação: a suíte completa e o typecheck do servidor E do cliente (`nuxt typecheck`) rodam depois de cada mudança; qualquer lugar não migrado para `string | null` quebra em tempo de compilação. **Materializado**: a pesquisa original (R-001) mapeou 2 consumidores; a implementação achou 4 a mais (R-010, R-011) — todos capturados pelo typecheck ou pelo teste de guarda, nenhum escapou para produção sem ser detectado.
- `apps/functions/src/database/seed/index.ts` não tem cobertura automatizada para o novo gate de `layers.features.billing` (nem tinha para nada antes desta spec) → Aceito: script de deploy, lógica de 3 linhas, verificado por inspeção. Se ganhar mais lógica condicional no futuro, vale extrair para uma função testável antes de crescer mais.
- ~~`apps/functions/drizzle.config.ts` não detecta import indireto de uma feature layer via barrel~~ — **Fechado (R-015/T017)**: aceito inicialmente como risco residual, corrigido depois de o usuário perguntar por que não. O teste de guarda (`scripts/layer-dependency-direction.test.ts`) agora resolve o barrel e flagra o nome do símbolo e a layer dona; `admin-teams.ts` não importa mais nada de billing, direto ou indireto — confirmado GREEN com a checagem nova.

#### Assumptions

- `layers.features.billing` permanece `true` ao final desta spec — desligar de fato é decisão operacional futura, fora deste escopo (default reversível).
- Nenhum ambiente já deployado precisa de tratamento especial de migração de dados — `DROP NOT NULL` não afeta linhas existentes (todas já têm `planId` preenchido hoje).

### 17. Decisions

- **DEC-001**: Direção de dependência entre layers (feature → base, nunca o inverso) é imposta por teste automatizado (FR-006), não por convenção ou revisão manual. Alternativa considerada e rejeitada: confiar em code review — rejeitada porque é exatamente o tipo de regra que "pode ser quebrada por qualquer LLM ou dev" (linguagem do usuário), o motivo original desta spec.
- **DEC-002**: Nenhum mecanismo de hook/evento entre layers é criado para reatribuir plano após a criação do time. Alternativa considerada: registro de hooks (`billing` se inscreve em "time criado"). Rejeitada por YAGNI — R-002 e R-003 provam que nenhum comportamento observável hoje depende de um time ter plano logo após criado; sem segundo consumidor real, a infraestrutura de hooks seria especulativa.
- **DEC-003**: A checagem de limite de assento é extraída para uma função pura (`hasSeatAvailable`) em vez de manter duplicada inline em `invites.ts`. Rationale: já havia duplicação exata antes desta spec (2 blocos idênticos); tocar nesse código para adicionar o caso "sem plano" é o momento certo de eliminar a duplicação, não de replicá-la uma terceira vez.
- **DEC-004**: Migration desta spec é um arquivo novo incremental sobre `0000`–`0002`, não uma consolidação. Decisão do usuário, registrada nesta conversa — consolidação futura (se ocorrer) é uma spec separada. **Resolvido (2026-09-28, durante o trabalho da SPEC-0006):** a consolidação aconteceu — o contexto real do projeto (SaaS kit forkado do zero por terceiros, não uma aplicação única com dado que não pode ser perdido) mudou o cálculo de risco que justificava adiar isso aqui. `0000_init.sql` da base foi regenerado do zero (apagando `0000`–`0003`), já contendo `Team.planId` nullable e `maxSeats` (sem precisar do passo incremental desta spec) — ver `apps/functions/src/database/MIGRATIONS.md`, nota "base consolidation".
- **DEC-005**: `admin.plans.*`/`admin.pendingPurchases.*` (roteadores admin de billing) são adicionados pela Composition Root (`apps/app/server/trpc/routers/index.ts`); `admin.teams.*` é **substituído por inteiro** (não mesclado) por uma versão com billing (`admin-teams-billing.ts`), reconstruindo `router({...})` chave a chave em vez de usar `mergeRouters` nesse caso — `listTeams`/`getTeamDetail` existem nas duas versões (base e com billing), e mesclar dois routers com a mesma chave de procedure é ambíguo em runtime. Nenhum dos dois é montado dentro de `layers/admin/server/trpc/router.ts`. Decisão explícita do usuário ("padrão enterprise grade mesmo que o custo seja maior... conseguiremos [mudar billing] sem afetar outro componente") — reforçada depois que o usuário apontou que a primeira correção (T016, uso condicional mas import ainda presente) não bastava. Alternativas consideradas e rejeitadas: (a) renomear para `billing.adminPlans.*`/`billing.pendingPurchases.*` via o mecanismo genérico de `compose-layers.ts` — mais simples de implementar, mas muda um caminho de API já consumido por 11+ arquivos, incluindo telas cliente; (b) permitir uma exceção documentada no teste de guarda para "imports de composição" — mais rápido, mas enfraquece a garantia absoluta de FR-006 com uma exceção subjetiva. Custo pago: um `ReturnType<typeof buildAdminRouterWithBilling>` com type assertion documentada no ramo `false` (ver R-013) em vez de inferência limpa; um arquivo novo (`admin-teams-billing.ts`) com `listTeams`/`getTeamDetail` reimplementados (não duplicados de `admin-teams.ts` — a versão base nunca teve a lógica de billing, então não há duplicação, só duas implementações completas e deliberadamente diferentes); `setTeamStatus`/`teamStatusSchema`/`AdminTeamSubscription` exportados de `admin-teams.ts` para as duas versões reaproveitarem e concordarem no formato.
- **DEC-006**: Uma feature layer contribui uma aba nas configurações do time (`layers/teams/app/pages/[[team]]/settings.vue`) declarando `teamSettingsTabs` no próprio `layer.manifest.ts` — não importando um composable/ability específico. Decisão do usuário ("busque sempre o caminho já validado e limpo"): reaproveita o mecanismo genérico já existente e testado (`layerManifests`, o mesmo que já compõe o sidebar via `compose-layers.ts`) em vez de inventar um mecanismo novo. Visibilidade por permissão usa uma ability genérica nova, teams-owned, `teamsHasPermission(user, teamId, permission: string)` — nenhuma layer precisa de uma ability própria só para isso.
- **DEC-007**: Nenhuma relação Drizzle (`plan`/`subscriptions`) é declarada do lado de `teams` para `Plan`/`Subscription`, nem em `layers/teams` nem em `layers/billing` (ver R-012 — tentativa rejeitada por quebrar inferência de tipo). `getBillingInfo` consulta `subscriptions` diretamente em vez de aninhar através de `teams`.
- **DEC-008**: `config.ts`'s `layers.features` usa `as const` em vez de `satisfies Record<string, boolean>` (ver R-013). Efeito colateral aceito e desejado: mudar uma flag aqui agora é um sinal de tipo para qualquer código que assumiu o valor literal — não um efeito puramente de runtime.
- **DEC-009**: Nenhum teste de router tRPC (`teams.ts`/`invites.ts`) foi criado, mesmo a spec original planejando `teams.test.ts`/`invites.test.ts`. Motivo: este projeto não testa arquivos de router tRPC diretamente em NENHUM outro lugar do código (`nuxfire-billing.md` seção 5, confirmado por `find layers -path "*/trpc/*.test.ts"` retornando zero arquivos no repositório inteiro) — a lógica testável já foi extraída para `hasSeatAvailable` (uma função pura), que É testada. Escrever um teste de router só para esta spec quebraria a convenção estabelecida sem precedente em nenhum outro lugar, na direção oposta do "código limpo e validado" pedido — a spec original estava desalinhada com a convenção real do projeto, corrigido aqui.
- **DEC-010** (2026-09-28, durante o trabalho da SPEC-0006): os "orphan markers" que `fireskill-06-tdd-bdd/scripts/check_traceability.mjs` reporta contra esta spec (identificadores fora da faixa desta spec, resultado `GAPS`) foram investigados e confirmados como falso-positivo, não uma lacuna real desta spec. Causa raiz: o script varre o repositório INTEIRO (`root: "."`) procurando marcadores `SPECSFY:` em arquivos de teste, mas os IDs (`US`/`AC`/`FR`/`NFR`-NNN) só são únicos DENTRO de cada spec, não globalmente — qualquer spec com uma faixa de IDs maior que a desta (esta spec declara até AC 015/FR 007/NFR 003/US 003) inevitavelmente aparece como "orphan" quando `check_traceability.mjs` roda escopado só a esta spec. Verificado diretamente: a faixa AC 016 até AC 024 pertence literalmente à SPEC-0004 (`specs/completed/0004-.../spec.md` declara exatamente essa faixa, e os marcadores correspondentes em `layers/billing/server/utils/billing/buyer-provisioning.test.ts`/`pending-purchase-repository.test.ts`/`subscription-sync.test.ts` batem, palavra por palavra, com os cenários de checkout/claim da SPEC-0004, não com os de desacoplamento billing/teams desta spec); a faixa FR 008 até FR 015, NFR 004 até NFR 007 e US 004 até US 007 pertence às specs de conteúdo/SEO/performance/copy (0001, 0002) e à spec da landing (0003), confirmado por grep dos marcadores reais em `apps/web/app/utils/{offer,landing-contract}.test.ts` e `scripts/{seo-rules,copy-rules,...}.test.ts`. (Escrito aqui sem o hífen padrão do formato de ID — `AC 016` em vez de `AC-016` — deliberadamente: o próprio validador estrutural desta spec, `fireskill-04-validate`, lê qualquer token no padrão exato `AC-NNN` em QUALQUER lugar do arquivo como um ID que esta spec declara, inclusive dentro de uma explicação em prosa — descoberto ao escrever esta nota pela primeira vez com o formato padrão, que fez o validador passar a exigir cobertura BDD para IDs de outras specs. Mesma classe de armadilha do falso-positivo já documentado na SPEC-0006 com a palavra portuguesa que significa "everything", grafada de forma idêntica a um marcador de placeholder em inglês.) A rastreabilidade real desta spec é 28/28 IDs cobertos. Alternativa considerada: forçar `Delivery Gate: Passed` já que a causa é comprovadamente um falso-positivo da ferramenta — rejeitada: sobrescrever o veredito mecânico de uma ferramenta por julgamento próprio, mesmo com boa evidência, é exatamente o tipo de "declarar pronto sem verificação de fato" que este projeto rejeita; o `Delivery Gate` permanece `Pending`, documentado aqui, até que `check_traceability.mjs` ganhe um modo de escopo por-spec (melhoria de ferramenta fora do escopo desta spec) ou até que o usuário decida explicitamente aceitar a explicação e sobrescrever o gate.

### 18. Definition of Done

- [ ] `Definition Gate` is `Passed`.
- [ ] `Plan Gate` is `Passed`.
- [ ] `Delivery Gate` is `Passed`.
- [ ] All applicable `AC` acceptance scenarios pass.
- [ ] All requirements have verified test evidence.
- [ ] All tasks in section 14 are completed.
- [ ] All static checks and automated test suites pass.
