# Drizzle no Nuxfire — o que existe de fato no código

Cada afirmação tem o arquivo de evidência. O código vence este documento.

## 1. Versões e driver

- `drizzle-orm` `^0.45.2`, `drizzle-kit` `^0.31.10`, `postgres` (postgres.js)
  `^3.4.5` — `apps/functions/package.json`. Dialeto `postgresql`
  (`apps/functions/drizzle.config.ts`). Só `pgTable`/`pgEnum`.
- Conexão em runtime: `drizzle-orm/postgres-js` sobre um cliente `postgres.js`
  com `{ max: 5, fetch_types: false }`, via Cloudflare **Hyperdrive**
  (`infra/database.ts`). Origem: qualquer Postgres padrão; PostGIS já está
  habilitado desde a migração inicial.
- **Não existe** Prisma, D1 para dados da aplicação, nem `hubDatabase()` do
  NuxtHub (o D1 `DB` só serve ao `@nuxt/content` do `apps/web`).
- **Não existe tabela `sessions`.** Sessão e credenciais vivem no KV `AuthKV`
  (ver `$fireskill-specialist-openauth`).

## 2. Onde o schema mora

| Arquivo | Papel |
|---|---|
| `apps/functions/src/database/core-schema.ts` | Só o que não é de domínio: `User`, `WaitlistEmail`, `Job`, `Log`, `DeadLetterRecord` |
| `apps/functions/src/database/schema.ts` | **Barrel** (`export *`): `core-schema` + **uma linha escrita à mão por layer** |
| `layers/<layer>/server/database/schema.ts` | Tabelas do domínio da layer (teams, billing, notifications, admin, kanban) |

- Todo consumidor importa `@nuxfire/functions/schema` e enxerga um módulo
  achatado. No app, `useDB()` e `tables` vêm de `apps/app/server/utils/db.ts`
  (`export const tables = schema`; reexporta `sql, eq, ne, and, or, count`).
- `drizzle.config.ts` lê `./src/database/core-schema.ts` **e**
  `../../layers/*/server/database/schema.ts` (glob), então uma layer nova entra
  nas migrações sozinha; já no **barrel** a linha é manual.
- As linhas do barrel são **incondicionais**: desativar uma layer de feature em
  `config.ts` tira páginas e componentes do bundle, **não** remove tabelas nem
  o tipo do cliente ("desativado" ≠ "apagado"; dado órfão é intencional).
- **Especificador de pacote, nunca caminho relativo**, no barrel e no
  `core-schema.ts`:
  `export * from "@nuxfire/layer-kanban/server/database/schema";`.
  O relativo (`../../../../layers/...`) passa em `tsc`, `vitest`, `drizzle-kit`,
  Nitro e esbuild puro, mas **falha no `sst deploy`** (o bundler do SST empacota
  `cron.ts`, `jobs-consumer.ts` e `dlq-consumer.ts`, que importam o barrel).
  Exige `@nuxfire/layer-<nome>: workspace:*` no `package.json` de
  `apps/functions`.
- Dentro de uma layer, importe a **tabela dona** pelo arquivo de origem
  (`@nuxfire/layer-teams/server/database/schema`,
  `@nuxfire/functions/database/core-schema`), **nunca** pelo barrel
  `@nuxfire/functions/schema`, que reexporta a própria layer e cria laço.

## 3. Convenções de tabela (observadas em `core-schema.ts`, `teams`, `kanban`)

- Nome SQL em PascalCase: `pgTable("Team", …)`, `pgTable("KanbanBoard", …)`.
- `id`: `text("id").$default(() => cuid()).primaryKey().notNull()` com
  `createId` de `@paralleldrive/cuid2`. Exceção: `User` usa
  `crypto.randomUUID()` (o id vem do emissor de auth, ver `openauth`).
- Datas: ``timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`)``
  e `updated_at` com `.$onUpdate(() => new Date())`.
- FK: `.references(() => tabela.id)` sempre em **callback**.
- Estado que ganha valores com o tempo: `text` com `default`, não `pgEnum`
  (`Team.status = "ACTIVE" | "SUSPENDED"`). Enum só onde é fechado
  (`platform_role`).
- Convenção de nome de coluna **não é uniforme**: há `teamId`/`mfaSecret`
  (camelCase) e `created_at`/`updated_at` (snake_case) na mesma tabela. Siga o
  arquivo em que está trabalhando; não "normalize" — renomear coluna gera
  migração destrutiva.
- Relações com `relations(tabela, ({ one, many }) => ({ … }))`, ao lado da
  tabela.
- Tipos: `typeof tabela.$inferSelect` / `$inferInsert`
  (ex.: `jobs-consumer.ts`, `InsertRole` em `db.ts`).
- Papéis do sistema: `Role.teamId = null` = papel de sistema, compartilhado.
- `AuditLog.actorUserId` **não** é FK de propósito; `Notification.userId`
  idem (só relação Drizzle).

## 4. Os três ciclos de schema (deliberados) e a única regra que os mantém seguros

1. `core-schema.ts` ↔ `layers/teams`: `Job`/`DeadLetterRecord` ficam no core com
   FK para `Team`; `TeamMembership`/`TeamInvite` ficam na layer com FK para
   `User`.
2. `layers/teams` ↔ `layers/billing`: `Subscription.teamId` → `Team`;
   `Team.planId`, `plan`/`subscriptions` → billing.
3. `core-schema.ts` ↔ `layers/notifications`: `usersRelations.notifications`
   ↔ `notificationRelations`. É par de **relations** apenas, **sem FK**: não
   "complete" com `.references()` (geraria migração).

**Regra**: toda referência entre arquivos fica **dentro de callback**
(`.references(() => x.id)`, `relations(t, ({ one }) => …)`). Ler um binding
importado no topo do módulo vira crash por TDZ no import.
`layers/admin` não criou ciclo: `core-schema.ts` nunca referencia
`platformAdmins`/`auditLogs` — após mexer no core, faça grep por esses dois
nomes; um hit em **código** (não comentário) é um ciclo novo sem necessidade.
Ciclos de schema têm ciclo de dependência de workspace correspondente
(`teams` ⇄ `billing`, `functions` ⇄ `notifications`); o Bun resolve por symlink.

Mover um `pgTable` entre arquivos **não gera migração** (o drizzle-kit compara
identidade de tabela/coluna com o snapshot). Se a mudança gerar uma, alguma
coluna mudou sem querer.

## 5. Migrações

- Histórico consolidado em `apps/functions/src/database/migrations/0000_init.sql`
  (2026-09-16); `meta/_journal.json` tem uma entrada.
- **Gerar** (de `apps/functions`), com as credenciais em variáveis de ambiente:
  `DATABASE_HOST=… DATABASE_PORT=5432 DATABASE_USER=… DATABASE_PASSWORD=… DATABASE_NAME=… bunx drizzle-kit generate`
  (`generate-migrations` no `package.json`). **Leia o SQL gerado**: o kit não
  sabe se foi rename ou drop+add.
- **Aplicar**: automático a cada deploy do `App` — `drizzle-kit migrate` num
  `command.local.Command` (`infra/utils/nuxt.ts`), com os secrets `Database*`.
  Não se aplica migração à mão em stage compartilhado.
- **Sem migração de volta.** Rollback = expand/contract
  (`apps/functions/src/database/MIGRATIONS.md`): mudança aditiva pode ficar;
  mudança destrutiva (drop, `NOT NULL` em coluna existente, troca de tipo) vai
  numa migração própria, **depois** de o código que deixou de depender da forma
  antiga estar no ar. Erro em produção se corrige com nova migração para frente.
- Ambiente que aplicou o histórico antigo (`0000`–`0009`) precisa ter os schemas
  `public`/`drizzle` zerados antes do próximo `migrate`.
- Backup/snapshot antes de qualquer migração que apague ou altere colunas com
  dados.

## 6. Seed e scripts manuais

- `seed/index.ts` roda **a cada deploy** (logo após as migrações,
  `infra/utils/nuxt.ts`), é idempotente e cria só o plano **Free** e os papéis
  de sistema (Owner/Admin/Member). Os dados vêm de `seed/data.ts`, o mesmo que
  `ensureSystemRoles()` (`layers/teams/server/utils/roles.ts`) e `ensureFreePlan()`
  (`layers/billing/server/utils/plans.ts`) usam como rede de segurança reativa.
  Mantenha as duas vias lendo o mesmo `data.ts`.
- **Nunca** ligar criação de admin ao seed nem a passo de deploy:
  `grant-platform-admin.ts` (concede `SUPER_ADMIN`/`SUPPORT` a um usuário que já
  se cadastrou, sem tocar credenciais) e `seed/demo-accounts.ts` (senhas
  conhecidas, só dev/demo) são **manuais de propósito**.
- Planos são linhas do banco criadas em `/admin/plans`, não objeto fixo.

## 7. Resetar dados de `User` (armadilha)

Zerar/truncar `User` sem limpar também as duas chaves do `AuthKV`
(`["email", email, "password"]` e `["users", email]`) gera split-brain: cadastro
novo falha com `email_taken` ou colide em `User_email_unique` (`23505`). Em
reset de dev, limpe as duas chaves de cada e-mail afetado na mesma passada (ou
todo o namespace de um stage descartável). Detalhes em
`$fireskill-specialist-openauth`.

## 8. Uso em runtime

- Aplicação: `useDB()` (por requisição, encerrado em `closeDB`) — ver
  `$fireskill-specialist-cloudflare-workers`.
- Workers puros: cliente criado por invocação a partir de
  `env.AppDB.connectionString`.
- Erro de unicidade: `error.code === "23505"` (postgres.js).
- Script de deploy (`seed`, `drizzle-kit`): conexão direta, `ssl: "require"`,
  `max: 1` (seed), pelas variáveis `DATABASE_*` — não passa por Hyperdrive.
- Para origem com pooler próprio, use a conexão **direta**: a Hyperdrive já faz
  pooling na borda. Misturar host de um modo com usuário de outro só falha
  quando a Cloudflare provisiona a Hyperdrive, com "Invalid database
  credentials" (erro 2013) que parece senha errada.

## 9. O que NÃO existe

- Suíte de teste de schema/queries. Os testes existentes cobrem cobrança,
  assentos de equipe e habilidades (RBAC), não o banco.
- Down-migrations, CI de migração, ORM alternativo.
