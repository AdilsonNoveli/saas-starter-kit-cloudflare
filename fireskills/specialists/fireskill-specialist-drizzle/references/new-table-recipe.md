# Receita: adicionar ou alterar tabela

Baseada em `layers/kanban/server/database/schema.ts` (a layer de feature mais
simples) e nas regras de `nuxfire-drizzle.md`.

## Tabela nova numa layer existente

1. Declare em `layers/<layer>/server/database/schema.ts`, seguindo as
   convenções do arquivo (PascalCase no SQL, `id` cuid2, datas com timezone,
   FK em callback):

```ts
import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createId as cuid } from "@paralleldrive/cuid2";
import { teams } from "@nuxfire/layer-teams/server/database/schema";

export const minhaTabela = pgTable("MinhaTabela", {
  id: text("id").$default(() => cuid()).primaryKey().notNull(),
  teamId: text("teamId").notNull().references(() => teams.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
});

export const minhaTabelaRelations = relations(minhaTabela, ({ one }) => ({
  team: one(teams, { fields: [minhaTabela.teamId], references: [teams.id] }),
}));
```

2. Toda tabela de tenant tem `teamId` e as queries filtram por ele (ver
   `$fireskill-specialist-trpc`, "escopo de tenant").
3. Importe tabelas de outra layer pelo **arquivo dono** e pelo **especificador
   de pacote**; declare a dependência `@nuxfire/layer-<x>: workspace:*` no
   `package.json` da layer (e `requires: [...]` no manifest).
4. Gere a migração e **leia o SQL**.
5. Rode `bun run test` (Vitest) e o typecheck do servidor
   (`bunx vue-tsc --noEmit -p server/tsconfig.json` em `apps/app`) — o
   `nuxt typecheck` não cobre `server/**`.

## Layer nova (schema)

1. Crie `layers/<nome>/server/database/schema.ts`.
2. Exporte-o no `package.json` da layer:
   `"./server/database/schema": "./server/database/schema.ts"`.
3. Acrescente **uma linha** ao barrel
   `apps/functions/src/database/schema.ts`:
   `export * from "@nuxfire/layer-<nome>/server/database/schema";`
4. Adicione `@nuxfire/layer-<nome>: workspace:*` em
   `apps/functions/package.json` e rode `bun install`.
5. O glob de `drizzle.config.ts` já enxerga o arquivo.
6. **Gate real**: um `sst deploy` num stage de teste (ou, no mínimo,
   `bunx esbuild <handler> --bundle --platform=node` para cada `handler:` de
   `infra/*.ts`). Nada rodável localmente substitui isso para o barrel.

## Alterar coluna/tabela existente

- Adicionar coluna nullable ou com default: migração aditiva, segura.
- Renomear, remover, trocar tipo ou adicionar `NOT NULL`: **expand/contract** em
  duas migrações e dois deploys (ver `nuxfire-drizzle.md` §5).
- Nunca editar `0000_init.sql` nem `meta/` à mão.
- Nunca "corrigir" o ciclo de schema com FK real onde hoje há só `relations()`.

## Checklist

- [ ] Nome SQL em PascalCase; `id`/datas no padrão.
- [ ] FKs e relations só dentro de callback.
- [ ] Barrel com especificador de pacote; dependência de workspace declarada.
- [ ] SQL gerado lido; destrutivo separado.
- [ ] Sem `teamId` esquecido em tabela de tenant.
- [ ] Nenhuma tabela apaga dado de layer desativada.
- [ ] `sst deploy` (ou proxy) rodado quando o barrel/`core-schema` mudou.
