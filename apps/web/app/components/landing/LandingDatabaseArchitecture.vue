<template>
  <section id="database" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative overflow-hidden">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-database" class="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>{{ $t("landing.databaseArchitecture.badge") }}</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          {{ $t("landing.databaseArchitecture.title") }}
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          {{ $t("landing.databaseArchitecture.subtitle") }}
        </p>
      </div>

      <!-- 4 High-Impact Architecture Metrics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto mb-12 lg:mb-16">
        <div
          v-for="metric in metricKeys"
          :key="metric.id"
          class="rounded-xl border border-default bg-elevated/70 backdrop-blur-sm p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:border-emerald-500/40 transition-colors"
        >
          <div class="flex items-center justify-between gap-3 mb-3">
            <span class="text-2xl sm:text-3xl font-black font-mono tracking-tight text-highlighted">
              {{ t(`landing.databaseArchitecture.metrics.${metric.id}.value`) }}
            </span>
            <div class="w-9 h-9 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0">
              <UIcon :name="metric.icon" class="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          <div>
            <h3 class="text-sm font-bold text-highlighted mb-1">
              {{ t(`landing.databaseArchitecture.metrics.${metric.id}.label`) }}
            </h3>
            <p class="text-xs text-muted leading-relaxed">
              {{ t(`landing.databaseArchitecture.metrics.${metric.id}.description`) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Hero Feature: Platform Admin Console & Tenant Governance (Clean in both Light & Dark modes) -->
      <div class="max-w-7xl mx-auto rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-elevated to-elevated dark:from-emerald-950/25 dark:via-night-900/60 dark:to-night-950 p-6 sm:p-8 lg:p-10 mb-16 shadow-xl shadow-emerald-500/5">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <!-- Left: Value Proposition & Feature Points -->
          <div class="lg:col-span-5">
            <UBadge color="success" variant="subtle" size="md" class="mb-3.5">
              <span class="font-mono text-xs uppercase tracking-wider font-semibold">
                {{ $t("landing.databaseArchitecture.adminConsole.badge") }}
              </span>
            </UBadge>

            <h3 class="text-2xl sm:text-3xl font-extrabold text-highlighted tracking-tight mb-3">
              {{ $t("landing.databaseArchitecture.adminConsole.title") }}
            </h3>

            <p class="text-xs sm:text-sm text-muted leading-relaxed mb-6">
              {{ $t("landing.databaseArchitecture.adminConsole.description") }}
            </p>

            <div class="space-y-3.5">
              <div
                v-for="featureKey in ['1', '2', '3', '4']"
                :key="featureKey"
                class="flex items-start gap-3"
              >
                <div class="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-semibold text-highlighted">
                    {{ t(`landing.databaseArchitecture.adminConsole.features.${featureKey}.title`) }}
                  </h4>
                  <p class="text-xs text-muted leading-relaxed">
                    {{ t(`landing.databaseArchitecture.adminConsole.features.${featureKey}.description`) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: High-Fidelity Admin Mockup (Clear in Light and Dark Mode) -->
          <div class="lg:col-span-7">
            <div class="rounded-xl border border-slate-200 dark:border-default bg-white dark:bg-night-950/95 shadow-xl overflow-hidden font-mono text-xs transition-colors">
              <!-- Mockup Window Header -->
              <div class="px-4 py-3 bg-slate-50 dark:bg-muted/40 border-b border-slate-200 dark:border-default flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span class="ml-2 text-[11px] text-slate-800 dark:text-toned font-semibold">
                    {{ $t("landing.databaseArchitecture.adminConsole.mockup.heading") }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  <span class="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold tracking-wider">
                    MFA Elevated (30m)
                  </span>
                </div>
              </div>

              <!-- Table Mockup -->
              <div class="overflow-x-auto p-4">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-200 dark:border-default/60 text-[11px] text-slate-500 dark:text-dimmed uppercase tracking-wider">
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colCompany") }}</th>
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colPlan") }}</th>
                      <th class="pb-2.5 font-medium text-center">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colMembers") }}</th>
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colStatus") }}</th>
                      <th class="pb-2.5 font-medium text-right">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colAction") }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-default/40 text-[11px]">
                    <!-- Tenant Row 1 -->
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-muted/30 transition-colors">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Acme Cloud Inc.</span>
                        </div>
                        <span class="text-[10px] text-muted font-normal block pl-5.5">acme-cloud</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          PRO TIER
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-highlighted">14</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusActive") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnSuspend") }}
                        </button>
                      </td>
                    </tr>

                    <!-- Tenant Row 2 -->
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-muted/30 transition-colors">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Globex Labs</span>
                        </div>
                        <span class="text-[10px] text-muted font-normal block pl-5.5">globex-labs</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-semibold">
                          ENTERPRISE
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-highlighted">58</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusActive") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnSuspend") }}
                        </button>
                      </td>
                    </tr>

                    <!-- Tenant Row 3 (Suspended) -->
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-muted/30 transition-colors bg-amber-500/[0.04] dark:bg-amber-500/[0.03]">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-muted" />
                          <span class="line-through text-muted">Initech Dev</span>
                        </div>
                        <span class="text-[10px] text-dimmed font-normal block pl-5.5">initech-dev</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-muted text-muted border border-slate-200 dark:border-default text-[10px]">
                          FREE TIER
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-muted">2</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusSuspended") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnReactivate") }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mockup Footer: Tracing & Audit Proof -->
              <div class="px-4 py-2.5 bg-slate-50 dark:bg-muted/20 border-t border-slate-200 dark:border-default/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-dimmed">
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-terminal" class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <code>useDB().select({ memberCount: count() }).groupBy()</code>
                </span>
                <span class="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  AuditLog: append-only
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Clean Visual Relationship Diagram (ERD) -->
      <div class="max-w-7xl mx-auto mb-16">
        <div class="text-center max-w-3xl mx-auto mb-10">
          <div class="inline-flex items-center justify-center mb-2">
            <UBadge color="primary" variant="subtle" size="sm">
              <span class="font-mono text-xs uppercase font-semibold">ERD ARCHITECTURE</span>
            </UBadge>
          </div>
          <h3 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-highlighted mb-2">
            {{ $t("landing.databaseArchitecture.diagramTitle") }}
          </h3>
          <p class="text-sm sm:text-base text-muted">
            {{ $t("landing.databaseArchitecture.diagramSubtitle") }}
          </p>
        </div>

        <!-- Visual Entity-Relationship Map -->
        <div class="rounded-2xl border border-default bg-elevated/70 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
          <!-- Top Tier: Platform Authority -->
          <div class="mb-8">
            <div class="flex items-center justify-between border-b border-default pb-3 mb-4">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-shield-alert" class="w-4 h-4 text-amber-500" />
                <span class="text-xs font-mono font-bold uppercase tracking-wider text-highlighted">
                  {{ $t("landing.databaseArchitecture.diagramClusters.governance.title") }}
                </span>
              </div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-default text-muted">
                {{ $t("landing.databaseArchitecture.diagramClusters.governance.badge") }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
                <div>
                  <div class="font-mono font-bold text-sm text-highlighted">PlatformAdmin</div>
                  <div class="text-xs text-muted">SUPER_ADMIN | SUPPORT • TOTP MFA</div>
                </div>
                <div class="text-xs font-mono px-2 py-1 rounded bg-muted border border-default text-toned">
                  1:1 User.id
                </div>
              </div>

              <div class="p-4 rounded-xl border border-default bg-muted/40 flex items-center justify-between">
                <div>
                  <div class="font-mono font-bold text-sm text-highlighted">AuditLog</div>
                  <div class="text-xs text-muted">Append-only • actorUserId, IP, targetId, JSON</div>
                </div>
                <div class="text-xs font-mono px-2 py-1 rounded bg-muted border border-default text-muted">
                  Immutable
                </div>
              </div>
            </div>
          </div>

          <!-- Central Pivot: The Multi-Tenant Core (Team) -->
          <div class="p-5 sm:p-6 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 mb-8">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-emerald-500/20">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <UIcon name="i-lucide-building-2" class="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <span class="font-mono font-black text-base text-highlighted">Team (Company / Tenant Root)</span>
                  <span class="text-xs text-muted block">Status: ACTIVE | SUSPENDED • planId • stripeCustomerId</span>
                </div>
              </div>
              <span class="text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">
                Anchor of all Tenant Relations
              </span>
            </div>

            <!-- Branches Out of Team -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Branch 1: RBAC & Members -->
              <div class="p-3.5 rounded-lg border border-default bg-elevated/90">
                <div class="flex items-center gap-1.5 text-xs font-mono font-bold text-highlighted mb-2">
                  <UIcon name="i-lucide-users" class="w-3.5 h-3.5 text-blue-500" />
                  <span>TeamMembership & Roles</span>
                </div>
                <div class="space-y-1 text-xs text-muted font-mono">
                  <div class="p-1.5 rounded bg-muted/60">↳ TeamMembership (teamId, userId)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ Role (System / Custom)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ Permission (action, roleId)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ TeamInvite (30-day token)</div>
                </div>
              </div>

              <!-- Branch 2: Billing & Plans -->
              <div class="p-3.5 rounded-lg border border-default bg-elevated/90">
                <div class="flex items-center gap-1.5 text-xs font-mono font-bold text-highlighted mb-2">
                  <UIcon name="i-lucide-credit-card" class="w-3.5 h-3.5 text-emerald-500" />
                  <span>Billing & Subscriptions</span>
                </div>
                <div class="space-y-1 text-xs text-muted font-mono">
                  <div class="p-1.5 rounded bg-muted/60">↳ Subscription (Stripe / Paddle)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ Plan (Free / Pro / Ent.)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ BenefitsOnPlan (N:M join)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ Benefit (Entitlements)</div>
                </div>
              </div>

              <!-- Branch 3: Async Processing & DLQ -->
              <div class="p-3.5 rounded-lg border border-default bg-elevated/90">
                <div class="flex items-center gap-1.5 text-xs font-mono font-bold text-highlighted mb-2">
                  <UIcon name="i-lucide-cpu" class="w-3.5 h-3.5 text-purple-500" />
                  <span>Queues & Background</span>
                </div>
                <div class="space-y-1 text-xs text-muted font-mono">
                  <div class="p-1.5 rounded bg-muted/60">↳ Job (teamId, status)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ Log (jobId, execution traces)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ DeadLetterRecord (DLQ Replay)</div>
                </div>
              </div>

              <!-- Branch 4: Productivity -->
              <div class="p-3.5 rounded-lg border border-default bg-elevated/90">
                <div class="flex items-center gap-1.5 text-xs font-mono font-bold text-highlighted mb-2">
                  <UIcon name="i-lucide-kanban" class="w-3.5 h-3.5 text-cyan-500" />
                  <span>Productivity Layer</span>
                </div>
                <div class="space-y-1 text-xs text-muted font-mono">
                  <div class="p-1.5 rounded bg-muted/60">↳ KanbanBoard (teamId)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ KanbanColumn (boardId)</div>
                  <div class="p-1.5 rounded bg-muted/60">↳ KanbanCard (columnId)</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Tier: Identity & Messaging (User + AuthKV + Notification) -->
          <div>
            <div class="flex items-center justify-between border-b border-default pb-3 mb-4">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-user-check" class="w-4 h-4 text-emerald-500" />
                <span class="text-xs font-mono font-bold uppercase tracking-wider text-highlighted">
                  {{ $t("landing.databaseArchitecture.diagramClusters.identity.title") }}
                </span>
              </div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-default text-muted">
                {{ $t("landing.databaseArchitecture.diagramClusters.identity.badge") }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="p-4 rounded-xl border border-default bg-elevated">
                <div class="font-mono font-bold text-sm text-highlighted">User</div>
                <div class="text-xs text-muted">crypto.randomUUID() • MFA TOTP (AES-GCM)</div>
              </div>

              <div class="p-4 rounded-xl border border-default bg-elevated">
                <div class="font-mono font-bold text-sm text-highlighted">Notification</div>
                <div class="text-xs text-muted">userId • read boolean • Live WebSocket dispatch</div>
              </div>

              <div class="p-4 rounded-xl border border-default bg-elevated">
                <div class="font-mono font-bold text-sm text-highlighted">WaitlistEmail</div>
                <div class="text-xs text-muted">Landing page pre-launch campaign leads</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Complete 20-Table Database Dictionary (Interactive / Clean Filterable) -->
      <div class="max-w-7xl mx-auto mb-16">
        <div class="text-center max-w-3xl mx-auto mb-8">
          <h3 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-highlighted mb-2">
            {{ $t("landing.databaseArchitecture.tableDictionaryTitle") }}
          </h3>
          <p class="text-sm sm:text-base text-muted">
            {{ $t("landing.databaseArchitecture.tableDictionarySubtitle") }}
          </p>
        </div>

        <!-- Category Filters -->
        <div class="flex flex-wrap justify-center items-center gap-2 mb-8">
          <button
            v-for="cat in categoryFilters"
            :key="cat.id"
            type="button"
            class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="selectedCategory === cat.id
              ? 'bg-emerald-500 text-white font-semibold shadow-xs'
              : 'bg-elevated border border-default text-muted hover:text-highlighted hover:border-accented'"
            @click="selectedCategory = cat.id"
          >
            {{ cat.label }} ({{ cat.count }})
          </button>
        </div>

        <!-- 20-Table Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="tableKey in filteredTableKeys"
            :key="tableKey"
            class="rounded-xl border border-default bg-elevated p-5 flex flex-col justify-between hover:border-accented transition-colors shadow-xs"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-2.5">
                <span class="font-mono font-extrabold text-sm text-highlighted">
                  {{ t(`landing.databaseArchitecture.tablesList.${tableKey}.name`) }}
                </span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-default text-muted font-semibold">
                  {{ t(`landing.databaseArchitecture.tablesList.${tableKey}.domain`) }}
                </span>
              </div>

              <p class="text-xs text-muted leading-relaxed mb-4">
                {{ t(`landing.databaseArchitecture.tablesList.${tableKey}.role`) }}
              </p>
            </div>

            <div class="pt-3 border-t border-default/70 mt-auto text-[11px] font-mono text-dimmed flex items-center justify-between">
              <span class="font-semibold text-slate-500 dark:text-muted">FKs:</span>
              <span class="text-highlighted text-right truncate pl-2">
                {{ t(`landing.databaseArchitecture.tablesList.${tableKey}.fks`) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Closing Callout Bar -->
      <div class="rounded-xl border border-default bg-elevated/70 backdrop-blur-sm p-5 sm:p-7 text-center max-w-4xl mx-auto shadow-sm">
        <p class="text-sm sm:text-base leading-relaxed">
          <strong class="text-highlighted">{{ $t("landing.databaseArchitecture.summaryCallout.lead") }}</strong>
          <span class="text-muted">{{ $t("landing.databaseArchitecture.summaryCallout.tail") }}</span>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const { t } = useI18n();

const metricKeys = [
  { id: "tables", icon: "i-lucide-table-2" },
  { id: "hyperdrive", icon: "i-lucide-zap" },
  { id: "encryption", icon: "i-lucide-shield-check" },
  { id: "kvAuth", icon: "i-lucide-key" },
];

const allTableKeys = [
  "team",
  "teamMembership",
  "teamInvite",
  "role",
  "permission",
  "plan",
  "subscription",
  "benefit",
  "benefitsOnPlan",
  "platformAdmin",
  "auditLog",
  "user",
  "job",
  "log",
  "deadLetterRecord",
  "waitlistEmail",
  "notification",
  "kanbanBoard",
  "kanbanColumn",
  "kanbanCard",
];

const selectedCategory = ref("all");

const categoryFilters = computed(() => [
  { id: "all", label: "All Tables", count: 20 },
  { id: "tenancy", label: "Multi-Tenancy", count: 5 },
  { id: "billing", label: "Billing", count: 4 },
  { id: "governance", label: "Governance", count: 2 },
  { id: "async", label: "Async & Jobs", count: 3 },
  { id: "core", label: "Core & Realtime", count: 6 },
]);

const filteredTableKeys = computed(() => {
  if (selectedCategory.value === "all") {
    return allTableKeys;
  }
  if (selectedCategory.value === "tenancy") {
    return ["team", "teamMembership", "teamInvite", "role", "permission"];
  }
  if (selectedCategory.value === "billing") {
    return ["plan", "subscription", "benefit", "benefitsOnPlan"];
  }
  if (selectedCategory.value === "governance") {
    return ["platformAdmin", "auditLog"];
  }
  if (selectedCategory.value === "async") {
    return ["job", "log", "deadLetterRecord"];
  }
  if (selectedCategory.value === "core") {
    return ["user", "waitlistEmail", "notification", "kanbanBoard", "kanbanColumn", "kanbanCard"];
  }
  return allTableKeys;
});
</script>
