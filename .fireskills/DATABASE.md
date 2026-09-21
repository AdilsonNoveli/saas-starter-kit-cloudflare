# Banco de dados

Mapa de persistência do sistema.

## Fontes de dados

<!-- specsfy:database:start -->
| Fonte | Tecnologia/forma | Evidência |
| --- | --- | --- |
| Estrutura | Schema/migration | `apps/functions/src/database/migrations/0000_init.sql` |

## Estruturas detectadas

| Estrutura | Tipo | Campos | Relações | Fonte |
| --- | --- | --- | --- | --- |
| DeadLetterRecord | Tabela SQL | id:text, message:jsonb, error:text, teamId:text, created_at:timestamp, replayedAt:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Job | Tabela SQL | id:text, message:text, status:text, teamId:text, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Log | Tabela SQL | id:text, message:text, jobId:text, created_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| User | Tabela SQL | id:text, name:text, email:text, image:text, mfaSecret:text, mfaEnabledAt:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| WaitlistEmail | Tabela SQL | id:text, email:text, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| AuditLog | Tabela SQL | id:text, actorUserId:text, action:text, targetType:text, targetId:text, metadata:jsonb, ip:text, created_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| PlatformAdmin | Tabela SQL | id:text, userId:text, mfaSecret:text, mfaEnabledAt:timestamp, created_at:timestamp, revokedAt:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Benefit | Tabela SQL | id:text, name:text, data:jsonb, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| BenefitsOnPlan | Tabela SQL | planId:text, benefitId:text, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Plan | Tabela SQL | id:text, name:text, description:text, tier:text, price:text, period:text, provider:text, providerPriceId:text, providerProductId:text, unitAmount:integer, currency:text, maxSeats:integer, limits:jsonb, isArchived:boolean, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Subscription | Tabela SQL | id:text, teamId:text, status:text, provider:text, providerSubscriptionId:text, planId:text, currentPeriodStart:timestamp, currentPeriodEnd:timestamp, cancelAtPeriodEnd:boolean, providerMetadata:jsonb, customerEmail:text, lastPaymentDate:timestamp, nextPaymentDate:timestamp, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| KanbanBoard | Tabela SQL | id:text, teamId:text, name:text, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| KanbanCard | Tabela SQL | id:text, columnId:text, title:text, description:text, position:integer, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| KanbanColumn | Tabela SQL | id:text, boardId:text, name:text, position:integer, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Notification | Tabela SQL | id:text, title:text, message:text, userId:text, data:jsonb, read:boolean, created_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Permission | Tabela SQL | title:text, description:text, action:text, roleId:text, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Role | Tabela SQL | id:text, teamId:text, name:text, description:text, isSystemRole:boolean, isDefault:boolean, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| TeamInvite | Tabela SQL | id:text, email:text, teamId:text, invitedById:text, roleId:text, status:text, expiresAt:timestamp, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| TeamMembership | Tabela SQL | id:text, teamId:text, userId:text, roleId:text, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
| Team | Tabela SQL | id:text, name:text, slug:text, description:text, logo:text, status:text, planId:text, stripeCustomerId:text, created_at:timestamp, updated_at:timestamp | Não detectadas | `apps/functions/src/database/migrations/0000_init.sql` |
<!-- specsfy:database:end -->

## Decisões, ownership e retenção

Detalhe técnico: `fireskill-specialist-drizzle`.

### Fonte e convenções

- **PostgreSQL** por Cloudflare Hyperdrive (`infra/database.ts`); ORM Drizzle (`drizzle-orm/postgres-js`). PostGIS habilitado desde a migração inicial. O `apps/web` usa **D1** (`DB`) só para o `@nuxt/content`; não é dado da aplicação.
- Nome SQL em PascalCase; `id` `text` (cuid2; `User` usa `crypto.randomUUID()`); datas `timestamptz` com `created_at`/`updated_at`. Nomes de coluna misturam `camelCase` e `snake_case`: não normalizar (gera migração destrutiva).
- Não existe tabela de sessão: sessões e credenciais vivem no KV `AuthKV`.
- O barrel `apps/functions/src/database/schema.ts` reexporta o schema de cada layer. Desligar uma layer de feature **não apaga tabelas**.

### Relações e regras que não estão nos campos

- FKs no banco (14, todas em `0000_init.sql`): `Team.planId` → `Plan`; `Subscription` → `Team` e `Plan`; `Job`, `DeadLetterRecord` e `KanbanBoard` → `Team`; `KanbanColumn` → `KanbanBoard`; `KanbanCard` → `KanbanColumn`; `Permission` → `Role`; `TeamMembership.roleId` → `Role`; `TeamInvite` → `Team`, `Role` e `User` (`invitedById`); `PlatformAdmin` → `User`.
- Só a coluna, sem FK: `TeamMembership.teamId` e `userId`, `Role.teamId`, `BenefitsOnPlan.planId` e `benefitId`, `Log.jobId`, `AuditLog.actorUserId` (deliberado: o log sobrevive à exclusão do usuário) e `Notification.userId` (só `relations()` do Drizzle, para evitar ciclo de import).
- `PlatformAdmin.role` (enum `platform_role`: `SUPER_ADMIN`, `SUPPORT`) não aparece na lista detectada acima: o detector ignora colunas enum.
- Três ciclos de schema deliberados (core↔teams, teams↔billing, core↔notifications) só funcionam porque toda referência entre arquivos fica dentro de callback.
- `Role.teamId = null` = papel de sistema (Owner, Admin, Member), compartilhado.
  `Permission` tem chave composta `(action, roleId)`.
- `Team.status` é `text` (`ACTIVE` | `SUSPENDED`), não enum.
- `mfaSecret` (em `User` e `PlatformAdmin`) é sempre criptografado (AES-GCM) e
  nunca sai na sessão do cliente.
- Planos são linhas de banco criadas em `/admin/plans`; só o plano **Free** e os
  papéis de sistema são semeados (seed idempotente a cada deploy).

### Retenção e backup

- Retenção: não há política de retenção declarada no código. `Log` e `AuditLog` crescem sem expurgo automático; a auditoria é append-only por convenção. Decisão de retenção pendente.
- Backup: não há backup agendado do banco (verificado ausente).
