# Database

Persistence map of the system.

## Data Sources

<!-- specsfy:database:start -->
| Source | Technology/form | Evidence |
| --- | --- | --- |
| Structure | Schema/migration | `apps/functions/src/database/migrations/0000_init.sql` |
| Structure | Schema/migration | `layers/admin/migrations/0000_admin.sql` |
| Structure | Schema/migration | `layers/billing/migrations/0000_billing.sql` |
| Structure | Schema/migration | `layers/kanban/migrations/0000_kanban.sql` |
| Structure | Schema/migration | `layers/notifications/migrations/0000_notifications.sql` |
| Structure | Schema/migration | `layers/teams/migrations/0000_teams.sql` |

## Detected Structures

| Structure | Type | Fields | Relations | Source |
| --- | --- | --- | --- | --- |
| Log | SQL Table | id:text, message:text, jobId:text, created_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| MfaRecoveryCode | SQL Table | id:text, userId:text, scope:text, codeHash:text, usedAt:timestamp, created_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| User | SQL Table | id:text, name:text, email:text, image:text, mfaSecret:text, mfaEnabledAt:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| WaitlistEmail | SQL Table | id:text, email:text, created_at:timestamp, updated_at:timestamp | Not detected | `apps/functions/src/database/migrations/0000_init.sql` |
| DeadLetterRecord | SQL Table | id:text, message:jsonb, error:text, teamId:text, created_at:timestamp, replayedAt:timestamp | Not detected | `layers/teams/migrations/0000_teams.sql` |
| Job | SQL Table | id:text, message:text, status:text, teamId:text, created_at:timestamp, updated_at:timestamp | Not detected | `layers/teams/migrations/0000_teams.sql` |
| Permission | SQL Table | title:text, description:text, action:text, roleId:text, created_at:timestamp, updated_at:timestamp | Not detected | `layers/teams/migrations/0000_teams.sql` |
| Role | SQL Table | id:text, teamId:text, name:text, description:text, isSystemRole:boolean, isDefault:boolean, created_at:timestamp, updated_at:timestamp | Not detected | `layers/teams/migrations/0000_teams.sql` |
| TeamInvite | SQL Table | id:text, email:text, teamId:text, invitedById:text, roleId:text, status:text, expiresAt:timestamp, created_at:timestamp, updated_at:timestamp | Not detected | `layers/teams/migrations/0000_teams.sql` |
| TeamMembership | SQL Table | id:text, teamId:text, userId:text, roleId:text, created_at:timestamp, updated_at:timestamp | Not detected | `layers/teams/migrations/0000_teams.sql` |
| Team | SQL Table | id:text, name:text, slug:text, description:text, logo:text, status:text, planId:text, maxSeats:integer, stripeCustomerId:text, created_at:timestamp, updated_at:timestamp | Not detected | `layers/teams/migrations/0000_teams.sql` |
| AuditLog | SQL Table | id:text, actorUserId:text, action:text, targetType:text, targetId:text, metadata:jsonb, ip:text, created_at:timestamp | Not detected | `layers/admin/migrations/0000_admin.sql` |
| PlatformAdmin | SQL Table | id:text, userId:text, mfaSecret:text, mfaEnabledAt:timestamp, created_at:timestamp, revokedAt:timestamp | Not detected | `layers/admin/migrations/0000_admin.sql` |
| Benefit | SQL Table | id:text, name:text, data:jsonb, created_at:timestamp, updated_at:timestamp | Not detected | `layers/billing/migrations/0000_billing.sql` |
| BenefitsOnPlan | SQL Table | planId:text, benefitId:text, created_at:timestamp, updated_at:timestamp | Not detected | `layers/billing/migrations/0000_billing.sql` |
| PendingPurchase | SQL Table | id:text, email:text, planId:text, provider:text, providerCheckoutId:text, providerCustomerId:text, providerSubscriptionId:text, status:text, failureReason:text, claimEmailSentAt:timestamp, claimedAt:timestamp, claimedByUserId:text, resultTeamId:text, expiresAt:timestamp, created_at:timestamp, updated_at:timestamp | Not detected | `layers/billing/migrations/0000_billing.sql` |
| Plan | SQL Table | id:text, name:text, description:text, tier:text, price:text, period:text, provider:text, providerPriceId:text, providerProductId:text, unitAmount:integer, currency:text, maxSeats:integer, limits:jsonb, buyerTeamMode:text, buyerTeamId:text, isArchived:boolean, isPublicOffer:boolean, created_at:timestamp, updated_at:timestamp | Not detected | `layers/billing/migrations/0000_billing.sql` |
| Subscription | SQL Table | id:text, teamId:text, status:text, provider:text, providerSubscriptionId:text, planId:text, currentPeriodStart:timestamp, currentPeriodEnd:timestamp, cancelAtPeriodEnd:boolean, providerMetadata:jsonb, customerEmail:text, lastPaymentDate:timestamp, nextPaymentDate:timestamp, created_at:timestamp, updated_at:timestamp | Not detected | `layers/billing/migrations/0000_billing.sql` |
| KanbanBoard | SQL Table | id:text, teamId:text, name:text, created_at:timestamp, updated_at:timestamp | Not detected | `layers/kanban/migrations/0000_kanban.sql` |
| KanbanCard | SQL Table | id:text, columnId:text, title:text, description:text, position:integer, created_at:timestamp, updated_at:timestamp | Not detected | `layers/kanban/migrations/0000_kanban.sql` |
| KanbanColumn | SQL Table | id:text, boardId:text, name:text, position:integer, created_at:timestamp, updated_at:timestamp | Not detected | `layers/kanban/migrations/0000_kanban.sql` |
| Notification | SQL Table | id:text, title:text, message:text, userId:text, data:jsonb, read:boolean, created_at:timestamp | Not detected | `layers/notifications/migrations/0000_notifications.sql` |
<!-- specsfy:database:end -->

## Decisions, Ownership, and Retention

Technical details: `fireskill-specialist-drizzle`.

### Sources and Conventions

- **PostgreSQL** via Cloudflare Hyperdrive (`infra/database.ts`); Drizzle ORM (`drizzle-orm/postgres-js`). PostGIS enabled since initial migration. `apps/web` uses **D1** (`DB`) exclusively for `@nuxt/content`; it is not application data.
- SQL identifiers in PascalCase; `id` is `text` (cuid2; `User` uses `crypto.randomUUID()`); timestamps are `timestamptz` with `created_at`/`updated_at`. Column names mix `camelCase` and `snake_case`: do not normalize (causes destructive migrations).
- No session table exists: sessions and credentials live in the KV store `AuthKV`.
- The barrel `apps/functions/src/database/schema.ts` re-exports each layer's schema unconditionally (typed client only — no query cost, since a disabled layer's router is never mounted). Migrations (SPEC-0006, 2026-09-28, extended same-day to admin/notifications/teams): **six independent histories**, not one gated array — base (`apps/functions`, only `core-schema.ts` now: `User`, `MfaRecoveryCode`, `WaitlistEmail`, `Log`) plus one per layer that owns tables and has its own `drizzle.config.ts`: `layers/admin`, `layers/notifications`, `layers/teams` (all `layers.core`, always applied), `layers/kanban`, `layers/billing` (both `layers.features`, gated). `teams` got its own history last: moving `Job`/`DeadLetterRecord` into `layers/teams/server/database/schema.ts` (their FKs to `Team` were the base's only physical dependency on teams) turned the previous bidirectional cycle with `core-schema.ts` into a one-directional one (`TeamInvite.invitedById` → `User`), the same shape every other split layer already had. Applied via `scripts/run-migrations.mjs` in `infra/utils/nuxt.ts` — every `layers.core` layer with its own history unconditionally, every `layers.features` layer with its own history gated on `config.ts`. A feature that is `false` never runs its migration at deploy time — its tables never exist in that database, not even empty. See `apps/functions/src/database/MIGRATIONS.md`.
- **Base migration history consolidated (2026-09-28, two rounds)**: `apps/functions/src/database/migrations/0000_init.sql` was regenerated from scratch twice the same day — first to drop the old `0000_init.sql`/`0001_pending_purchase.sql`/`0002_plan_public_offer.sql`/`0003_team_plan_nullable_and_billing_feature.sql` history in favor of a single clean file scoped to `layers.core`, then again after `admin`/`notifications`/`teams` each split out their own tables, leaving the base with only `User`, `MfaRecoveryCode`, `WaitlistEmail`, `Log` — every table now has exactly one `CREATE TABLE` source, no dual provenance. Safe only because this project is a SaaS kit forked fresh by third parties (the one environment developed against was reset, not bootstrapped, each time); see `apps/functions/src/database/MIGRATIONS.md`'s consolidation notes before repeating this against a fork with real data.

### Relations and Rules Not Expressed in Schema Columns

- Foreign keys, split by history (2026-09-28, three consolidation rounds): base `apps/functions/src/database/migrations/0000_init.sql` has 1 — `MfaRecoveryCode.userId` → `User` (`ON DELETE CASCADE`). Teams `layers/teams/migrations/0000_teams.sql` has 6 — `Job`, `DeadLetterRecord` → `Team`; `Permission` → `Role`; `TeamMembership.roleId` → `Role`; `TeamInvite` → `Team`, `Role`, and `User` (`invitedById`, the layer's only physical FK back into base). Admin `layers/admin/migrations/0000_admin.sql` adds `PlatformAdmin` → `User`. Notifications `layers/notifications/migrations/0000_notifications.sql` adds none (`Notification.userId` is relation-only, no physical FK). Billing `layers/billing/migrations/0000_billing.sql` adds `Plan.buyerTeamId` → `Team` (`ON DELETE SET NULL`), `Subscription` → `Team` and `Plan`, `PendingPurchase.planId` → `Plan`, `PendingPurchase.claimedByUserId` → `User`, `PendingPurchase.resultTeamId` → `Team` (`ON DELETE SET NULL`). Kanban `layers/kanban/migrations/0000_kanban.sql` adds `KanbanBoard` → `Team`, `KanbanColumn` → `KanbanBoard`, `KanbanCard` → `KanbanColumn`.
- Column only, without FK: `TeamMembership.teamId` and `userId`, `Role.teamId`, `BenefitsOnPlan.planId` and `benefitId`, `Log.jobId`, `AuditLog.actorUserId` (deliberate: log persists after user deletion), `Notification.userId` (Drizzle `relations()` only, to avoid circular import), and, since SPEC-0005, `Team.planId` (no relation on the `teams` side either — the query relation lives in billing's own schema.ts, since `teams` must never import a feature layer) and `Team.maxSeats` (denormalized by billing, `null` = unlimited).
- `PlatformAdmin.role` (enum `platform_role`: `SUPER_ADMIN`, `SUPPORT`) does not appear in detected list above: scanner ignores enum columns.
- Two deliberate schema cycles remain (core↔teams, core↔notifications), both relation-only now — no physical FK crosses either boundary in either direction except `TeamInvite.invitedById` → `User` (teams→base, one-directional). `core-schema.ts`'s `logRelations` imports `jobs` back from `layers/teams` (SPEC-0006, teams split, 2026-09-28) purely for a Drizzle relation (`Log.jobId` has no `.references()`), the same shape as its `usersRelations` → `notifications` import. Both work solely because all cross-file references reside inside callbacks. `teams↔billing` was a third cycle until SPEC-0005 made it one-directional (billing→teams only).
- `Role.teamId = null` = shared system role (Owner, Admin, Member). `Permission` has composite key `(action, roleId)`.
- `Team.status` is `text` (`ACTIVE` | `SUSPENDED`), not an enum.
- `MfaRecoveryCode`: single-use recovery codes, one set per `(userId, scope)` where `scope` is `user` (backs `User.mfaSecret`) or `platform` (backs `PlatformAdmin.mfaSecret`). Only an HMAC-SHA256 of the code is stored (keyed with the factor's own encryption key, bound to scope and user); `usedAt` is set atomically on redemption. Unique on `(userId, scope, codeHash)`; regenerating or disabling MFA deletes the whole set. Set/replace logic: `apps/app/server/utils/mfa-recovery.ts`; manual reset: `apps/functions/src/database/reset-mfa.ts`.
- `mfaSecret` (on `User` and `PlatformAdmin`) is always encrypted (AES-GCM) and never exposed in client sessions.
- Plans are database rows created in `/admin/plans`; only the **Free** plan and system roles are seeded (idempotent seed on each deploy).
- `Plan.buyerTeamMode` (`NEW_TEAM` default, or `EXISTING_TEAM`) and `Plan.buyerTeamId` record, per plan, where a buyer lands after paying: a team of their own (as Owner) or the existing team named by `buyerTeamId` (required, and only meaningful, for `EXISTING_TEAM`). Set in `/admin/plans`.
- `PendingPurchase` (SPEC-0004): a buyer with no team pays before creating an account; this row holds the checkout until an authenticated claim resolves `Plan.buyerTeamMode` into a real team/membership. `providerCheckoutId` is unique (Stripe Checkout Session id, or `paddle:<id>` for Paddle, which has no server-created session); `providerSubscriptionId`/`providerCustomerId` stay null until the provider confirms the subscription. `status` (`PENDING` | `CLAIMED` | `EXPIRED` | `REJECTED`) is text, like every other status-like column in this schema. `claimedByUserId` → `User`, `resultTeamId` → `Team` (`ON DELETE SET NULL`, like `Plan.buyerTeamId`). Expiry (30 days) is computed lazily on read (`getPendingPurchase`), not swept by a cron job. Indexed on `email` and `status`.

### Retention and Backup

- Retention: no retention policy declared in code. `Log` and `AuditLog` grow without automated purge; audit logging is append-only by convention. Retention decision pending.
- Backup: no scheduled database backup exists (verified absent).
