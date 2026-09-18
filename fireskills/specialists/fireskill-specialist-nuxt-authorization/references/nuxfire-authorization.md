# Autorização no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento.
Há **dois sistemas separados**; não os misture:

| Sistema | Pergunta | Onde |
|---|---|---|
| **RBAC de equipe (tenant)** | "este usuário pode X **nesta equipe**?" | `nuxt-authorization` + `defineAbility()` + `abilityProcedure` |
| **Autoridade de plataforma** | "este é o dono/operador do SaaS?" | `platformAdminProcedure` + `PlatformAdmin` + MFA elevada |

Este documento cobre o primeiro. O segundo está em `$fireskill-specialist-trpc`
(§3) e `$fireskill-specialist-openauth`.

## 1. Stack

- `nuxt-authorization` `^0.3.5` (`apps/app/package.json`), módulo em
  `apps/app/nuxt.config.ts`. Estilo Bouncer: `defineAbility(fn)`.
- **Não existe CASL.** A permissão de cada usuário vem de linhas do banco
  (`Role`/`Permission`), não de constantes em código.

## 2. Modelo de dados

- `Role`: papel por equipe; `Role.teamId = null` = **papel de sistema**
  (compartilhado). Três papéis de sistema: **Owner**, **Admin**, **Member**
  (`Member` é `isDefault`). `Permission`: `(action, roleId)` com chave composta
  (`onConflictDoNothing()` torna backfill idempotente); `action` é a string
  `layer:recurso:ação`.
- Origem dos dados: `apps/functions/src/database/seed/data.ts` (`SYSTEM_ROLES`),
  usado pelo seed de deploy **e** por `ensureSystemRoles()`
  (`layers/teams/server/utils/roles.ts`), a rede de segurança reativa.
- `data.ts` **espelha como string literal** as ações de
  `layers/teams/shared/utils/permissions.ts` (o pacote `functions` não depende do
  `shared/` da layer). Se um lado mudar um valor, o outro muda junto.
- Layer de feature que nasce depois do seed acrescenta o seu backfill:
  `ensure<Layer>Permissions()` (`layers/kanban/server/utils/permissions.ts`):
  mapa papel→permissões, *flag* em processo para pagar um `SELECT` por processo,
  `onConflictDoNothing()`.

## 3. Como o usuário chega ao check

- **Servidor**: `apps/app/server/plugins/authorization-resolver.ts` põe
  `event.context.$authorization.resolveServerUser = () => getUser(event)` a cada
  requisição. `getUser` (`server/utils/auth.ts`) devolve `{ id, name, email,
  image, permissions, teams, isPlatformAdmin, mfaEnabled }`, onde
  `permissions: Record<teamId, string[]>` e `teams: string[]`
  (`getUserPermissions`).
- **Cliente**: `apps/app/app/plugins/authorization-resolver.ts` →
  `resolveClientUser = () => useSession().user.value`.
- **Consequência**: as permissões vêm **da sessão carregada**. Mudou papel/
  permissão no banco? O usuário só enxerga depois que a sessão é relida.

## 4. Como uma habilidade é escrita (convenção real)

Arquivo: `layers/<layer>/shared/utils/abilities.ts`.

```ts
import { PERMISSIONS } from "./permissions";

interface User {
  id: string;
  teams?: string[];
  permissions?: Record<string, string[]>;
}

const hasTeamPermission = (user: User | null, teamId: string, permission: string) =>
  !!user?.teams?.includes(teamId) &&
  (user?.permissions?.[teamId] || []).includes(permission);

export const teamsDeleteTeam = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, PERMISSIONS.TEAMS.DELETE),
);
```

- **Todo nome exportado leva o prefixo da layer** (`teamsDeleteTeam`,
  `kanbanCreateBoard`, `billingGetBillingInfo`). `nuxt-authorization` usa o
  auto-import de `shared/utils/` do Nuxt, que atravessa layers num único espaço de
  nomes por nome de export: dois `createBoard` se sobrepõem em silêncio, sem erro
  de build. **O prefixo é o da LAYER, não o da permissão**: `billingGetBillingInfo`
  guarda a string `teams:billing:view` (que é de `teams`).
- **`hasTeamPermission` é duplicado de propósito** em cada layer (quatro linhas de
  predicado puro), para a layer de feature carregar mesmo sem a layer `teams` no
  build; importar do módulo de outra layer acopla a internals dela. Importe só as
  **constantes** de permissão se precisar (`@nuxfire/layer-teams/shared/utils/permissions`).
- `PERMISSIONS`/`KANBAN_PERMISSIONS` espelham o `permissions` do manifesto da
  layer (`layer.manifest.ts`).
- Ações que dependem do **alvo** recebem mais argumentos e os checam:
  `teamsUpdateMemberRole(user, teamId, memberId?)` e `teamsRemoveMember` **negam
  agir sobre si mesmo** (`memberId !== user.id`).
- `teamsListTeams` é `() => true`; `teamsGetTeamDetails` só exige pertencer à
  equipe.
- Estrutura (colunas de quadro) usa a permissão do **pai**
  (`kanbanUpdateBoard`), não uma própria.
- Import fora da layer: `@nuxfire/layer-<nome>/shared/utils/abilities`.
  **Nunca `#shared/utils/abilities`**: `#shared` aponta para o `shared/` do
  Composition Root, jamais o de uma layer.

## 5. Uso no servidor (tRPC)

`abilityProcedure` (`apps/app/server/trpc/trpc.ts`) acrescenta ao `ctx`:

- `await ctx.authorize(ability, ...args)` — lança `TRPCError FORBIDDEN` (mensagem
  do erro original) e registra `console.warn("authz denied", { userId, ability,
  args })`;
- `await ctx.allows(ability, ...args)` / `ctx.denies(...)` — booleanos, sem lançar.

Padrão de procedure: primeiro provar que a equipe existe e que o usuário
pertence a ela (query com `memberships`), **depois** `authorize`. Habilidade
responde "pode X na equipe T", nunca "T existe" nem "ele é membro" — ver
`$fireskill-specialist-trpc`.

## 6. Uso no cliente

- **Renderização condicional**: componente `<Can :ability="..." :args="[...]">`
  (ex.: `layers/teams/app/pages/[[team]]/settings/members.vue`:
  `<Can :ability="sendInviteAbility" :args="[team?.id || '']">`), importando a
  habilidade como `import { teamsSendInvite as sendInviteAbility } from
  "@nuxfire/layer-teams/shared/utils/abilities"`. `<Can>` esconde a UI; **não
  protege nada**: o servidor decide de novo.
- **Lógica**: `allows(ability, ...args)` dentro de `useAsyncData`
  (`layers/teams/app/composables/use-ability.ts`):
  `useAsyncData(() => allows(teamsDeleteTeam, team.value), { watch: [team] })`.
- O *wrapper* cliente **acompanha a habilidade, não quem o chama**:
  `useGetBillingInfoAbility` fica em `layers/billing/app/composables/use-ability.ts`
  mesmo que seu único uso seja em `layers/teams`
  (`use-team-settings-links.ts`, que decide se a aba Billing aparece).

## 7. Testes

- `shared/utils/abilities.test.ts` por layer (teams, billing, kanban); import de
  `allows` de `nuxt-authorization/utils`; usuários fabricados
  (`member([...permissões])`, `outsider`).
- `defineAbility` é auto-import do Nuxt; o `vitest.setup.ts` da layer o coloca em
  `globalThis` (`Object.assign(globalThis, { defineAbility })`), duplicado de
  propósito para a layer rodar sozinha.
- Ao renomear/mover habilidade, **não altere as asserções**: só os
  identificadores; suíte verde = comportamento intacto (foi assim nas Fases 3.1a e
  3.1b).

## 8. O que NÃO existe

- Diferenciação de papéis `SUPER_ADMIN`/`SUPPORT` de plataforma (o enum existe; a
  procedure não os distingue).
- Cache/invalidations de permissões além de reler a sessão.
- Testes de router que exercitem `authorize` de ponta a ponta.
