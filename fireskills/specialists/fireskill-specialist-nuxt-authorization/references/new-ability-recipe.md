# Receita: adicionar uma permissão/habilidade

Baseada em `layers/kanban` (permissões e habilidades de uma layer de feature) e
`layers/teams` (as três funções de papel de sistema).

## Passos (numa layer existente)

1. **String da permissão** — `layer:recurso:ação`. Acrescente:
   - ao `permissions` de `layer.manifest.ts`;
   - ao objeto de constantes em `shared/utils/permissions.ts`
     (`PERMISSIONS`/`<LAYER>_PERMISSIONS`).
2. **Habilidade** — em `shared/utils/abilities.ts`, **com prefixo da layer**:

```ts
export const minhaLayerCriarCoisa = defineAbility(
  (user: User | null, teamId: string) =>
    hasTeamPermission(user, teamId, MINHA_PERMISSIONS.COISAS.CREATE),
);
```

3. **Papéis** — quem recebe a permissão:
   - Layer **core** (`teams`/`billing`…): acrescente ao `SYSTEM_ROLES` em
     `apps/functions/src/database/seed/data.ts` (constante espelhada como string).
   - Layer **de feature** ou permissão nova numa instalação já semeada: faça um
     `ensure<Layer>Permissions()` em `server/utils/permissions.ts` (modelo:
     `ensureKanbanPermissions`), chamado no início das procedures da layer
     (`listBoards` chama). Ele é **idempotente** (`onConflictDoNothing`) e usa
     *flag* em processo.
   - Se ambos, mantenha `data.ts` e o `ensure…` **coerentes**: são duas vias
     para o mesmo estado.
4. **Servidor** — na procedure (`abilityProcedure`):
   `await authorize(minhaLayerCriarCoisa, team.id)` **depois** de provar
   associação à equipe e **antes** de escrever.
5. **Cliente** — `<Can :ability="minhaLayerCriarCoisa" :args="[team.id]">` para
   esconder a UI, e/ou um wrapper `useXAbility(team)` com `allows` em
   `useAsyncData`, no `app/composables/use-ability.ts` **da layer que define a
   habilidade**.
6. **Teste** — `shared/utils/abilities.test.ts`: caso permitido, caso negado
   (sem permissão), caso de fora da equipe (`outsider`), e, se a ação tem alvo,
   o caso "não pode agir sobre si mesmo".
7. `bun run test` e o typecheck de `apps/app`.

## Checklist

- [ ] Nome com o prefixo da **layer** (não da permissão).
- [ ] `hasTeamPermission` local; só constantes importadas de outra layer.
- [ ] Manifesto, constantes e `SYSTEM_ROLES` com a **mesma** string.
- [ ] Papéis de sistema recebem a permissão (seed **e/ou** `ensure…`).
- [ ] `authorize` no servidor; `<Can>` é só cosmético.
- [ ] Importada por `@nuxfire/layer-<nome>/shared/utils/abilities` fora da layer.
- [ ] Teste cobre permitido, negado e fora da equipe.
- [ ] Nada de plataforma passando por `abilityProcedure`.
