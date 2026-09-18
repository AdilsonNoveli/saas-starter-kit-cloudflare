---
name: fireskill-specialist-drizzle
description: Modelar e alterar schema, relações, migrações e seed com Drizzle ORM sobre PostgreSQL (Hyperdrive) no Nuxfire — tabelas por layer, barrel `schema.ts`, ciclos de schema deliberados, `drizzle-kit generate/migrate`, expand/contract e `useDB()`. Use ao tocar `apps/functions/src/database/`, `layers/*/server/database/schema.ts` ou qualquer query Drizzle; não cobre SQL/índices/tuning puro de Postgres (postgres) nem a regra de I/O por requisição (cloudflare-workers).
---

# Drizzle ORM (PostgreSQL)

## Quando usar

- Acionar ao criar/alterar tabela, coluna, relação, índice, migração ou seed, e
  ao escrever query com `useDB()` ou nos Workers de `apps/functions`.
- Acionar ao criar uma layer com tabelas (linha no barrel do schema).
- Não acionar para tuning de SQL, extensões e planos de execução:
  `$fireskill-specialist-postgres`. Para modelagem conceitual:
  `$fireskill-specialist-data-modeling` e `$fireskill-specialist-domain-modeling`.
  Para ciclo de vida do cliente por requisição:
  `$fireskill-specialist-cloudflare-workers`.
- Combinar com `$fireskill-specialist-nuxfire-layers` (onde a layer mora),
  `$fireskill-specialist-trpc` (uso nas procedures) e
  `$fireskill-specialist-sst` (migração e seed rodam no deploy).

## Fluxo

1. Ler [references/nuxfire-drizzle.md](references/nuxfire-drizzle.md).
2. Abrir o arquivo de schema vizinho e copiar a convenção dele (não a de
   memória): PascalCase no SQL, `id` cuid2, datas com timezone.
3. Para tabela/layer nova, seguir
   [references/new-table-recipe.md](references/new-table-recipe.md).
4. Gerar a migração, **ler o SQL**, separar mudança destrutiva.
5. Validar (seção abaixo). Mudou barrel ou `core-schema`? Só um `sst deploy` (ou
   proxy com esbuild por handler) prova que o bundler do deploy resolve.

## Regras principais

- A fonte é `core-schema.ts` (não-domínio) + `schema.ts` de cada layer;
  `apps/functions/src/database/schema.ts` é **barrel** com uma linha manual por
  layer, **sempre por especificador de pacote** (`@nuxfire/layer-<x>/…`), nunca
  caminho relativo.
- Dentro de uma layer, importe a tabela pelo **arquivo dono**, nunca pelo barrel
  `@nuxfire/functions/schema`.
- Referência entre arquivos **só dentro de callback**
  (`.references(() => t.id)`, `relations(t, ({ one }) => …)`); nunca leia
  binding importado no topo do módulo (TDZ).
- Há exatamente três ciclos de schema deliberados (core↔teams, teams↔billing,
  core↔notifications). Não crie um quarto sem necessidade; o do `notifications`
  é só `relations()`, sem FK.
- Não renomeie coluna nem "uniformize" `camelCase`/`snake_case` existentes: gera
  migração destrutiva.
- Estado que cresce com o tempo é `text` com default, não `pgEnum`.
- Tabela de tenant tem `teamId` e toda query a filtra.
- Migração: gerar em `apps/functions` com `DATABASE_*` no ambiente; aplicar
  **só** pelo deploy (`drizzle-kit migrate` em `infra/utils/nuxt.ts`). Sem
  migração de volta: expand/contract.
- Seed do deploy é idempotente e só cria o plano Free e os papéis de sistema;
  criar admin é manual (`grant-platform-admin.ts`), nunca automático.
- Desativar layer não apaga tabelas.
- Mover `pgTable` entre arquivos não gera migração; se gerar, algo mudou por
  acidente.
- `23505` é violação de unicidade (postgres.js).

## Antipadrões

- `export * from "../../../layers/<x>/…"` no barrel — quebra só no
  `sst deploy`.
- Importar `@nuxfire/functions/schema` de dentro do schema de uma layer (laço
  pelo agregador).
- Ler `teams`, `users`, `plans` no topo do módulo de outro arquivo do ciclo.
- Completar o ciclo de `notifications` com FK real.
- Editar `0000_init.sql` ou `meta/*` à mão; aplicar migração manual em stage
  compartilhado.
- Remover coluna/tabela e o código que a usa **no mesmo deploy**.
- Ligar criação de admin ou senha fixa ao seed/deploy.
- Cachear cliente Drizzle/postgres.js em variável de módulo.
- Zerar `User` sem limpar as duas chaves do `AuthKV` (split-brain de cadastro).
- Confiar em `nuxt typecheck` para o servidor — ele não o cobre.
- Assumir tabela `sessions`, Prisma ou testes de schema: não existem.

## Validação

- `bun run generate-migrations` (em `apps/functions`) não deve produzir
  migração quando só se moveu tabela de arquivo.
- SQL gerado lido: sem `DROP`/`ALTER … NOT NULL` inesperado.
- `bun run typecheck` em `apps/functions` (`tsc --noEmit`) e
  `bunx vue-tsc --noEmit -p server/tsconfig.json` em `apps/app` (a metade
  servidor que o `nuxt typecheck` ignora).
- `bun run test` (Vitest) na raiz.
- `grep -n "platformAdmins\|auditLogs" apps/functions/src/database/core-schema.ts`
  só pode acertar comentários.
- Depois de mexer em barrel/`core-schema`: `sst deploy` em stage de teste (gate
  real).
- Seed idempotente: rodar duas vezes seguidas não altera nada na segunda.

## Skills relacionadas

- `$fireskill-specialist-postgres` — SQL, índices e tuning.
- `$fireskill-specialist-data-modeling` e `$fireskill-specialist-domain-modeling`.
- `$fireskill-specialist-nuxfire-layers` — estrutura e registro de layer.
- `$fireskill-specialist-trpc` — uso das tabelas nas procedures.
- `$fireskill-specialist-cloudflare-workers` — Hyperdrive e I/O por requisição.
- `$fireskill-specialist-sst` — migração/seed no deploy e secrets `Database*`.
- `$fireskill-specialist-openauth` — por que não há tabela de sessão.
