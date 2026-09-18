---
name: fireskill-specialist-nuxt-authorization
description: Definir e revisar o RBAC por equipe (tenant) do Nuxfire com `nuxt-authorization` — `defineAbility()` em `layers/*/shared/utils/abilities.ts`, constantes `PERMISSIONS`, papéis de sistema Owner/Admin/Member, `abilityProcedure` (`authorize`/`allows`/`denies`), `<Can>` e `allows()` no cliente. Use ao adicionar/alterar permissão, habilidade, papel ou qualquer checagem "pode fazer X nesta equipe"; a autoridade de plataforma (`platformAdminProcedure`, MFA elevada) é outro sistema e não é coberta aqui.
---

# nuxt-authorization (RBAC de equipe)

## Quando usar

- Acionar ao criar/alterar permissão, habilidade (`defineAbility`), papel de
  sistema, checagem `authorize`/`allows` numa procedure ou `<Can>`/`allows()` no
  front.
- Acionar ao depurar "ability não encontrada", habilidade que colide entre
  layers, usuário sem acesso a algo que deveria ter, permissão nova que não
  aparece em instalação existente.
- Não acionar para acesso de **plataforma** (`/admin`): `platformAdminProcedure`,
  ver `$fireskill-specialist-trpc`. Não acionar para login/sessão:
  `$fireskill-specialist-openauth`.
- Combinar com `$fireskill-specialist-nuxfire-layers` (prefixos e onde mora cada
  parte), `$fireskill-specialist-trpc` (onde `authorize` roda),
  `$fireskill-specialist-drizzle` (`Role`/`Permission`) e
  `$fireskill-specialist-application-security`.

## Fluxo

1. Ler [references/nuxfire-authorization.md](references/nuxfire-authorization.md).
2. Para permissão/habilidade nova, seguir
   [references/new-ability-recipe.md](references/new-ability-recipe.md).
3. Achar habilidade parecida em `layers/teams`, `layers/billing` ou `layers/kanban`
   e copiar o padrão (não a memória).
4. Garantir os três pontos de verdade: manifesto, constantes e papéis
   (`SYSTEM_ROLES`/`ensure…`).
5. Validar com testes de habilidade e checagem manual do servidor.

## Regras principais

- **Todo export de habilidade leva o prefixo da layer** (`kanbanCreateBoard`),
  nunca da permissão; sem prefixo colide em silêncio no auto-import.
- Procedures **não** são prefixadas (`teams.listMembersAndInvites`): só as
  habilidades.
- `hasTeamPermission` é copiado em cada layer; importe de outra layer só as
  **constantes** de permissão.
- Habilidade que recebe alvo verifica o alvo (nega agir sobre si mesmo em
  `teamsUpdateMemberRole`/`teamsRemoveMember`).
- Servidor: provar pertencimento à equipe, **depois** `authorize`, **antes** de
  escrever. Habilidade não prova existência nem membership.
- `<Can>` e `allows()` no cliente só escondem UI; **quem protege é o servidor**.
- Import fora da layer: `@nuxfire/layer-<nome>/shared/utils/abilities`; nunca
  `#shared/…`.
- A string `layer:recurso:ação` é a mesma no manifesto, nas constantes, no
  `SYSTEM_ROLES` e nas linhas de `Permission`; renomear string orfana dados
  reais.
- Papel de sistema tem `Role.teamId = null`. Permissão nova em instalação já
  semeada exige `ensure<Layer>Permissions()` idempotente.
- O wrapper cliente (`useXAbility`) mora na layer que define a habilidade.
- Permissões vêm da sessão carregada; mudança no banco só aparece após reler a
  sessão.
- Renomear/mover habilidade: **não altere as asserções** do teste, só os
  identificadores.
- Plataforma nunca passa por `abilityProcedure` (e o contrário).

## Antipadrões

- Habilidade sem prefixo da layer; prefixar procedure.
- Confiar só em `<Can>` para proteger uma ação.
- Chamar `authorize` sem antes checar que a equipe existe e que o usuário
  pertence a ela.
- Importar `hasTeamPermission` do módulo de outra layer.
- Adicionar a permissão só no manifesto (ou só no código) e não nos papéis.
- Renomear a string de uma permissão já gravada.
- `#shared/utils/abilities` dentro de layer.
- Colocar o wrapper `useXAbility` na layer que o chama em vez da dona da
  habilidade.
- Derivar autoridade de plataforma de permissão de equipe.
- Assumir CASL ou permissões fixas em código.
- Mudar o comportamento de uma habilidade ao mesmo tempo em que a move.

## Validação

- `bun run test` (Vitest): `abilities.test.ts` da layer com casos
  permitido/negado/fora-da-equipe/alvo-si-mesmo.
- Numa instalação já semeada: a permissão nova existe para cada papel de sistema
  esperado (`SELECT` em `Permission`) e o `ensure…` roda sem duplicar.
- Chamar a procedure com usuário sem a permissão → `FORBIDDEN` e um
  `authz denied` no log; com usuário de outra equipe → também negado.
- No front: o elemento sob `<Can>` some sem a permissão; forçar a chamada direta
  à API ainda é negada.
- `bun run typecheck` em `apps/app`.

## Skills relacionadas

- `$fireskill-specialist-trpc` — `abilityProcedure` e `platformAdminProcedure`.
- `$fireskill-specialist-nuxfire-layers` — convenções por layer.
- `$fireskill-specialist-drizzle` — tabelas `Role`/`Permission` e seed.
- `$fireskill-specialist-openauth` — de onde vêm `session.id` e o usuário.
- `$fireskill-specialist-application-security` — modelo de ameaça.
- `$fireskill-specialist-nuxt` — plugins e composables no cliente.
