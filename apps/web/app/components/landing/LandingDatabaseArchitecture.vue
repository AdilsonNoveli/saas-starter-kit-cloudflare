<template>
  <section id="database" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative overflow-hidden">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          {{ $t("landing.databaseArchitecture.title") }}
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          {{ $t("landing.databaseArchitecture.subtitle") }}
        </p>
      </div>

      <!-- Unified Enterprise Architecture & Governance Structure (Single Master Card) -->
      <div class="max-w-7xl mx-auto rounded-2xl border border-success/30 bg-gradient-to-b from-success/10 via-elevated to-elevated dark:from-success/25 dark:via-night-900/60 dark:to-night-950 p-6 sm:p-8 lg:p-10 shadow-xl shadow-success/5">
        <!-- Part 1: Platform Admin Console & Multi-Tenancy Governance -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pb-8 lg:pb-12 border-b border-default">
          <!-- Left: Value Proposition & 4 Core Pillars -->
          <div class="lg:col-span-5">
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
                <div class="w-6 h-6 rounded-full bg-success/15 border border-success/30 flex items-center justify-center shrink-0 mt-0.5">
                  <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-success" />
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

          <!-- Right: High-Fidelity Admin Mockup (Adaptive in Light and Dark Mode) -->
          <div class="lg:col-span-7">
            <div class="rounded-xl border border-default bg-white dark:bg-night-950/95 shadow-xl overflow-hidden font-mono text-xs transition-colors">
              <!-- Mockup Window Header -->
              <div class="px-4 py-3 bg-muted dark:bg-muted/40 border-b border-default flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-error/80" />
                  <span class="w-2.5 h-2.5 rounded-full bg-warning/80" />
                  <span class="w-2.5 h-2.5 rounded-full bg-success/80" />
                  <span class="ml-2 text-[11px] text-highlighted dark:text-toned font-semibold">
                    {{ $t("landing.databaseArchitecture.adminConsole.mockup.heading") }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-success dark:bg-success animate-pulse" />
                  <span class="text-[10px] uppercase text-success font-bold tracking-wider">
                    MFA Elevated (30m)
                  </span>
                </div>
              </div>

              <!-- Table Mockup -->
              <div class="overflow-x-auto p-4">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-default dark:border-default/60 text-[11px] text-muted dark:text-dimmed uppercase tracking-wider">
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colCompany") }}</th>
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colPlan") }}</th>
                      <th class="pb-2.5 font-medium text-center">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colMembers") }}</th>
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colStatus") }}</th>
                      <th class="pb-2.5 font-medium text-right">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colAction") }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-default dark:divide-default/40 text-[11px]">
                    <!-- Tenant Row 1 -->
                    <tr class="hover:bg-muted/80 dark:hover:bg-muted/30 transition-colors">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-success" />
                          <span>Acme Cloud Inc.</span>
                        </div>
                        <span class="text-[10px] text-muted font-normal block pl-5.5">acme-cloud</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-success/10 text-success border border-success/20 text-[10px] font-semibold">
                          PRO TIER
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-highlighted">14</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-success">
                          <span class="w-1.5 h-1.5 rounded-full bg-success dark:bg-success" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusActive") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2.5 py-1 rounded bg-warning/10 border border-warning/30 text-warning hover:bg-warning/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnSuspend") }}
                        </button>
                      </td>
                    </tr>

                    <!-- Tenant Row 2 -->
                    <tr class="hover:bg-muted/80 dark:hover:bg-muted/30 transition-colors">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-primary" />
                          <span>Globex Labs</span>
                        </div>
                        <span class="text-[10px] text-muted font-normal block pl-5.5">globex-labs</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold">
                          ENTERPRISE
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-highlighted">58</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-success">
                          <span class="w-1.5 h-1.5 rounded-full bg-success dark:bg-success" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusActive") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2.5 py-1 rounded bg-warning/10 border border-warning/30 text-warning hover:bg-warning/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnSuspend") }}
                        </button>
                      </td>
                    </tr>

                    <!-- Tenant Row 3 (Suspended) -->
                    <tr class="hover:bg-muted/80 dark:hover:bg-muted/30 transition-colors bg-warning/[0.04] dark:bg-warning/[0.03]">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-muted" />
                          <span class="line-through text-muted">Initech Dev</span>
                        </div>
                        <span class="text-[10px] text-dimmed font-normal block pl-5.5">initech-dev</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-accented dark:bg-muted text-muted border border-default text-[10px]">
                          FREE TIER
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-muted">2</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-warning">
                          <span class="w-1.5 h-1.5 rounded-full bg-warning dark:bg-warning" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusSuspended") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2.5 py-1 rounded bg-success/10 border border-success/30 text-success hover:bg-success/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnReactivate") }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mockup Footer: Tracing & Audit Proof -->
              <div class="px-4 py-2.5 bg-muted dark:bg-muted/20 border-t border-default dark:border-default/60 flex items-center justify-between text-[10px] text-muted dark:text-dimmed">
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-terminal" class="w-3 h-3 text-success" />
                  <code>useDB().select({ memberCount: count() }).groupBy()</code>
                </span>
                <span class="text-success font-mono font-semibold">
                  AuditLog: append-only
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Part 2: Audited Domain Architecture (The 20 Tables Unified Matrix) -->
        <div class="pt-8 lg:pt-10">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-default/70">
            <div>
              <h3 class="text-xl sm:text-2xl font-bold tracking-tight text-highlighted mb-1">
                {{ $t("landing.databaseArchitecture.domainsTitle") }}
              </h3>
              <p class="text-xs sm:text-sm text-muted">
                {{ $t("landing.databaseArchitecture.domainsSubtitle") }}
              </p>
            </div>
            <span class="text-xs font-mono font-bold px-3 py-1 rounded-md bg-success/10 border border-success/20 text-success shrink-0 self-start sm:self-center">
              20 PostgreSQL Tables • Drizzle ORM
            </span>
          </div>

          <!-- Unified Responsive Table / Matrix -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-default text-[11px] font-mono text-muted uppercase tracking-wider">
                  <th class="py-3 pr-4 font-semibold">{{ $t("landing.databaseArchitecture.tableHeaders.domain") }}</th>
                  <th class="py-3 px-4 font-semibold">{{ $t("landing.databaseArchitecture.tableHeaders.table") }}</th>
                  <th class="py-3 pl-4 font-semibold">{{ $t("landing.databaseArchitecture.tableHeaders.purpose") }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default/50 text-xs sm:text-sm">
                <tr
                  v-for="domain in domainRows"
                  :key="domain.id"
                  class="hover:bg-muted/30 transition-colors"
                >
                  <!-- Domain Column -->
                  <td class="py-3.5 pr-4 align-top">
                    <div class="flex items-center gap-2 font-bold text-highlighted">
                      <UIcon :name="domain.icon" class="w-4 h-4 shrink-0" :class="domain.iconColor" />
                      <span class="whitespace-nowrap">{{ domain.name }}</span>
                    </div>
                    <span class="text-[10px] font-mono text-muted block pl-6">
                      {{ domain.count }}
                    </span>
                  </td>

                  <!-- Tables List Column -->
                  <td class="py-3.5 px-4 align-top">
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="tbl in domain.tables"
                        :key="tbl"
                        class="text-xs px-2 py-0.5 rounded bg-muted/80 border border-default text-highlighted font-mono font-medium"
                      >
                        {{ tbl }}
                      </span>
                    </div>
                  </td>

                  <!-- Purpose Column -->
                  <td class="py-3.5 pl-4 align-top text-muted leading-relaxed text-xs sm:text-sm">
                    {{ domain.purpose }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

const { t } = useI18n();

const domainRows = computed(() => [
  {
    id: "tenancy",
    name: t("landing.databaseArchitecture.diagramClusters.tenancy.title"),
    count: "5 tables",
    icon: "i-lucide-users",
    iconColor: "text-info",
    tables: ["Team", "TeamMembership", "TeamInvite", "Role", "Permission"],
    purpose: t("landing.databaseArchitecture.domains.tenancy.description"),
  },
  {
    id: "billing",
    name: t("landing.databaseArchitecture.diagramClusters.billing.title"),
    count: "4 tables",
    icon: "i-lucide-credit-card",
    iconColor: "text-success",
    tables: ["Plan", "Subscription", "Benefit", "BenefitsOnPlan"],
    purpose: t("landing.databaseArchitecture.domains.billing.description"),
  },
  {
    id: "governance",
    name: t("landing.databaseArchitecture.diagramClusters.governance.title"),
    count: "2 tables",
    icon: "i-lucide-shield-alert",
    iconColor: "text-warning",
    tables: ["PlatformAdmin", "AuditLog"],
    purpose: t("landing.databaseArchitecture.domains.governance.description"),
  },
  {
    id: "async",
    name: t("landing.databaseArchitecture.diagramClusters.async.title"),
    count: "3 tables",
    icon: "i-lucide-cpu",
    iconColor: "text-primary",
    tables: ["Job", "Log", "DeadLetterRecord"],
    purpose: t("landing.databaseArchitecture.domains.jobs.description"),
  },
  {
    id: "identity",
    name: t("landing.databaseArchitecture.diagramClusters.identity.title"),
    count: "3 tables",
    icon: "i-lucide-user-check",
    iconColor: "text-info",
    tables: ["User", "Notification", "WaitlistEmail"],
    purpose: t("landing.databaseArchitecture.tablesList.user.role"),
  },
  {
    id: "productivity",
    name: "Kanban & Productivity",
    count: "3 tables",
    icon: "i-lucide-kanban",
    iconColor: "text-info",
    tables: ["KanbanBoard", "KanbanColumn", "KanbanCard"],
    purpose: t("landing.databaseArchitecture.tablesList.kanbanBoard.role"),
  },
]);
</script>
