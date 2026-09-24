# Database

Persistence map of the system.

## Data Sources

<!-- specsfy:database:start -->
| Source | Technology/form | Evidence |
| --- | --- | --- |
| Structure | Schema/migration | `apps/functions/src/database/migrations/0000_init.sql` |

## Detected Structures

| Structure | Type | Fields | Relations | Source |
| --- | --- | --- | --- | --- |
| DeadLetterRecord | SQL Table | id:text, message:jsonb, error:text, teamId:text, created_at:timestamp, replayedAt:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Job | SQL Table | id:text, message:text, status:text, teamId:text, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Log | SQL Table | id:text, message:text, jobId:text, created_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| User | SQL Table | id:text, name:text, email:text, image:text, mfaSecret:text, mfaEnabledAt:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| WaitlistEmail | SQL Table | id:text, email:text, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| AuditLog | SQL Table | id:text, actorUserId:text, action:text, targetType:text, targetId:text, metadata:jsonb, ip:text, created_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| PlatformAdmin | SQL Table | id:text, userId:text, mfaSecret:text, mfaEnabledAt:timestamp, created_at:timestamp, revokedAt:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Benefit | SQL Table | id:text, name:text, data:jsonb, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| BenefitsOnPlan | SQL Table | planId:text, benefitId:text, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Plan | SQL Table | id:text, name:text, description:text, tier:text, price:text, period:text, provider:text, providerPriceId:text, providerProductId:text, unitAmount:integer, currency:text, maxSeats:integer, limits:jsonb, isArchived:boolean, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Subscription | SQL Table | id:text, teamId:text, status:text, provider:text, providerSubscriptionId:text, planId:text, currentPeriodStart:timestamp, currentPeriodEnd:timestamp, cancelAtPeriodEnd:boolean, providerMetadata:jsonb, customerEmail:text, lastPaymentDate:timestamp, nextPaymentDate:timestamp, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| KanbanBoard | SQL Table | id:text, teamId:text, name:text, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| KanbanCard | SQL Table | id:text, columnId:text, title:text, description:text, position:integer, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| KanbanColumn | SQL Table | id:text, boardId:text, name:text, position:integer, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Notification | SQL Table | id:text, title:text, message:text, userId:text, data:jsonb, read:boolean, created_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Permission | SQL Table | title:text, description:text, action:text, roleId:text, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Role | SQL Table | id:text, teamId:text, name:text, description:text, isSystemRole:boolean, isDefault:boolean, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| TeamInvite | SQL Table | id:text, email:text, teamId:text, invitedById:text, roleId:text, status:text, expiresAt:timestamp, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| TeamMembership | SQL Table | id:text, teamId:text, userId:text, roleId:text, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| Team | SQL Table | id:text, name:text, slug:text, description:text, logo:text, status:text, planId:text, stripeCustomerId:text, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| MfaRecoveryCode | SQL Table | id:text, userId:text, scope:text, codeHash:text, usedAt:timestamp, created_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
<!-- specsfy:database:end -->

## Decisions, Ownership, and Retention

Technical details: `fireskill-specialist-drizzle`.

### Sources and Conventions

- **PostgreSQL** via Cloudflare Hyperdrive (`infra/database.ts`); Drizzle ORM (`drizzle-orm/postgres-js`). PostGIS enabled since initial migration. `apps/web` uses **D1** (`DB`) exclusively for `@nuxt/content`; it is not application data.
- SQL identifiers in PascalCase; `id` is `text` (cuid2; `User` uses `crypto.randomUUID()`); timestamps are `timestamptz` with `created_at`/`updated_at`. Column names mix `camelCase` and `snake_case`: do not normalize (causes destructive migrations).
- No session table exists: sessions and credentials live in the KV store `AuthKV`.
- The barrel `apps/functions/src/database/schema.ts` re-exports each layer's schema. Disabling a feature layer **does not drop tables**.

### Relations and Rules Not Expressed in Schema Columns

- Foreign keys in database (15, all in `0000_init.sql`): `MfaRecoveryCode.userId` → `User` (`ON DELETE CASCADE`); `Team.planId` → `Plan`; `Subscription` → `Team` and `Plan`; `Job`, `DeadLetterRecord`, and `KanbanBoard` → `Team`; `KanbanColumn` → `KanbanBoard`; `KanbanCard` → `KanbanColumn`; `Permission` → `Role`; `TeamMembership.roleId` → `Role`; `TeamInvite` → `Team`, `Role`, and `User` (`invitedById`); `PlatformAdmin` → `User`.
- Column only, without FK: `TeamMembership.teamId` and `userId`, `Role.teamId`, `BenefitsOnPlan.planId` and `benefitId`, `Log.jobId`, `AuditLog.actorUserId` (deliberate: log persists after user deletion), and `Notification.userId` (Drizzle `relations()` only, to avoid circular import).
- `PlatformAdmin.role` (enum `platform_role`: `SUPER_ADMIN`, `SUPPORT`) does not appear in detected list above: scanner ignores enum columns.
- Three deliberate schema cycles (core↔teams, teams↔billing, core↔notifications) work solely because all cross-file references reside inside callbacks.
- `Role.teamId = null` = shared system role (Owner, Admin, Member). `Permission` has composite key `(action, roleId)`.
- `Team.status` is `text` (`ACTIVE` | `SUSPENDED`), not an enum.
- `MfaRecoveryCode`: single-use recovery codes, one set per `(userId, scope)` where `scope` is `user` (backs `User.mfaSecret`) or `platform` (backs `PlatformAdmin.mfaSecret`). Only an HMAC-SHA256 of the code is stored (keyed with the factor's own encryption key, bound to scope and user); `usedAt` is set atomically on redemption. Unique on `(userId, scope, codeHash)`; regenerating or disabling MFA deletes the whole set. Set/replace logic: `apps/app/server/utils/mfa-recovery.ts`; manual reset: `apps/functions/src/database/reset-mfa.ts`.
- `mfaSecret` (on `User` and `PlatformAdmin`) is always encrypted (AES-GCM) and never exposed in client sessions.
- Plans are database rows created in `/admin/plans`; only the **Free** plan and system roles are seeded (idempotent seed on each deploy).

### Retention and Backup

- Retention: no retention policy declared in code. `Log` and `AuditLog` grow without automated purge; audit logging is append-only by convention. Retention decision pending.
- Backup: no scheduled database backup exists (verified absent).
