# Receita: adicionar um router tRPC numa layer

Baseada em `layers/kanban/server/trpc/router.ts` (a layer de feature mais
enxuta) e `layers/teams/server/trpc/router.ts` (uma layer com duas chaves).
Confirme cada caminho no código antes de copiar: se divergir, o código vence.

## Passos

1. **Habilidades primeiro** (se a ação depende de permissão de equipe): defina
   em `layers/<layer>/shared/utils/abilities.ts` — ver
   `$fireskill-specialist-nuxt-authorization`.
2. **Tabelas** (se houver): `layers/<layer>/server/database/schema.ts` — ver
   `$fireskill-specialist-drizzle`.
3. **Router** em `layers/<layer>/server/trpc/router.ts` (ou vários arquivos
   agregados por ele, como em `teams`):

```ts
import { TRPCError, type AnyRouter } from "@trpc/server";
import { z } from "zod";
import { abilityProcedure, router } from "~~/server/trpc/trpc";
import { useDB } from "~~/server/utils/db";
import { minhaAbility } from "../../shared/utils/abilities";

const meuRouter = router({
  listar: abilityProcedure
    .input(z.object({ teamIdentifier: z.string() }))
    .query(async ({ ctx: { authorize, user }, input }) => {
      // 1) provar que a equipe existe e que `user` pertence a ela
      // 2) só então autorizar a ação nessa equipe
      await authorize(minhaAbility, /* team.id */);
      return useDB().query.minhaTabela.findMany(/* ... */);
    }),
});

export const routers = {
  minhaChave: meuRouter,
} satisfies Record<string, AnyRouter>;
```

4. **Exportar o mapa `routers`** com esse nome exato: `scripts/compose-layers.ts`
   o importa por nome fixo (não adivinha pelo manifest).
5. **Ativar a layer** em `config.ts` (`layers.core` ou `layers.features`). Ao
   subir o Nuxt, `.composition/layer-routers.ts` é regenerado sozinho — confira
   o diff, mas não o edite.
6. **Consumir no front**: `useTrpcClient().minhaChave.listar.useQuery({ ... })`.
7. **Tipos derivados**: `RouterOutput["minhaChave"]["listar"]`.

## Checklist antes de dar por pronto

- [ ] Procedure usa a base certa (`public` / `protected` / `ability` /
      `platformAdmin`); nada de plataforma fora de `admin.*`.
- [ ] `.input()` com `zod` e mensagens de erro nos campos.
- [ ] Toda id vinda do cliente é resolvida **no banco** e cruzada com a equipe do
      usuário antes de agir (cartão → coluna → quadro → equipe).
- [ ] `authorize` chamado antes de qualquer escrita.
- [ ] Erros são `TRPCError` com `code` correto, nunca `throw new Error`.
- [ ] `export const routers = {...} satisfies Record<string, AnyRouter>`
      (sem anotação de tipo).
- [ ] Nada importado de outra layer sem estar declarado como dependência no
      `package.json` da layer (`@nuxfire/layer-*`).
- [ ] Se a procedure usa `ctx.jobsQueue`/`Websockets`, trata o caso de a flag
      estar desligada.
- [ ] `bun run typecheck` em `apps/app` e testes da layer (`vitest`) passam.
