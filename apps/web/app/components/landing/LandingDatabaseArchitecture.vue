<template>
  <section id="database" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative overflow-hidden">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-database" class="w-4 h-4 text-emerald-400" />
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

      <!-- Hero Feature: Platform Admin Console & Tenant Governance -->
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

          <!-- Right: Interactive / High-Fidelity Admin Mockup -->
          <div class="lg:col-span-7">
            <div class="rounded-xl border border-default bg-night-950/90 shadow-2xl overflow-hidden font-mono text-xs">
              <!-- Mockup Window Header -->
              <div class="px-4 py-3 bg-muted/40 border-b border-default flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span class="ml-2 text-[11px] text-toned font-semibold">
                    {{ $t("landing.databaseArchitecture.adminConsole.mockup.heading") }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span class="text-[10px] uppercase text-emerald-400 font-bold tracking-wider">
                    MFA Elevated (30m)
                  </span>
                </div>
              </div>

              <!-- Table Mockup -->
              <div class="overflow-x-auto p-4">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-default/60 text-[11px] text-dimmed uppercase tracking-wider">
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colCompany") }}</th>
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colPlan") }}</th>
                      <th class="pb-2.5 font-medium text-center">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colMembers") }}</th>
                      <th class="pb-2.5 font-medium">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colStatus") }}</th>
                      <th class="pb-2.5 font-medium text-right">{{ $t("landing.databaseArchitecture.adminConsole.mockup.colAction") }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-default/40 text-[11px]">
                    <!-- Tenant Row 1 -->
                    <tr class="hover:bg-muted/30 transition-colors">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-emerald-400" />
                          <span>Acme Cloud Inc.</span>
                        </div>
                        <span class="text-[10px] text-muted font-normal block pl-5.5">acme-cloud</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                          PRO TIER
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-highlighted">14</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusActive") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnSuspend") }}
                        </button>
                      </td>
                    </tr>

                    <!-- Tenant Row 2 -->
                    <tr class="hover:bg-muted/30 transition-colors">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-emerald-400" />
                          <span>Globex Labs</span>
                        </div>
                        <span class="text-[10px] text-muted font-normal block pl-5.5">globex-labs</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                          ENTERPRISE
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-highlighted">58</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusActive") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnSuspend") }}
                        </button>
                      </td>
                    </tr>

                    <!-- Tenant Row 3 (Suspended) -->
                    <tr class="hover:bg-muted/30 transition-colors bg-amber-500/[0.03]">
                      <td class="py-3 font-semibold text-highlighted">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-lucide-building" class="w-3.5 h-3.5 text-dimmed" />
                          <span class="line-through text-muted">Initech Dev</span>
                        </div>
                        <span class="text-[10px] text-dimmed font-normal block pl-5.5">initech-dev</span>
                      </td>
                      <td class="py-3">
                        <span class="px-2 py-0.5 rounded bg-muted text-muted border border-default text-[10px]">
                          FREE TIER
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold text-muted">2</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.statusSuspended") }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button type="button" class="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-[10px] font-semibold">
                          {{ $t("landing.databaseArchitecture.adminConsole.mockup.btnReactivate") }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mockup Footer: Tracing & Audit Proof -->
              <div class="px-4 py-2.5 bg-muted/20 border-t border-default/60 flex items-center justify-between text-[10px] text-dimmed">
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-terminal" class="w-3 h-3 text-emerald-400" />
                  <code>useDB().select({ memberCount: count() }).groupBy()</code>
                </span>
                <span class="text-emerald-400 font-mono">
                  AuditLog: append-only
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4 Audited Domain Schema Cards -->
      <div class="max-w-7xl mx-auto">
        <div class="text-center max-w-3xl mx-auto mb-10">
          <h3 class="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-highlighted mb-2">
            {{ $t("landing.databaseArchitecture.domainsTitle") }}
          </h3>
          <p class="text-sm sm:text-base text-muted">
            {{ $t("landing.databaseArchitecture.domainsSubtitle") }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div
            v-for="domain in domainKeys"
            :key="domain.id"
            class="rounded-xl border border-default bg-elevated p-6 sm:p-7 flex flex-col justify-between hover:border-accented transition-colors shadow-xs"
          >
            <div>
              <div class="flex items-center justify-between gap-3 mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg border border-default bg-muted flex items-center justify-center shrink-0">
                    <UIcon :name="domain.icon" class="w-5 h-5" :class="domain.iconClass" />
                  </div>
                  <h4 class="text-base sm:text-lg font-bold text-highlighted">
                    {{ t(`landing.databaseArchitecture.domains.${domain.id}.title`) }}
                  </h4>
                </div>
                <span class="text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted border border-default text-muted">
                  {{ t(`landing.databaseArchitecture.domains.${domain.id}.tag`) }}
                </span>
              </div>

              <p class="text-xs sm:text-sm text-muted leading-relaxed mb-5">
                {{ t(`landing.databaseArchitecture.domains.${domain.id}.description`) }}
              </p>
            </div>

            <!-- Table Badges -->
            <div class="pt-4 border-t border-default mt-auto">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-dimmed block mb-2">
                SQL Tables:
              </span>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="tbl in getTablesList(domain.id)"
                  :key="tbl"
                  class="text-xs px-2.5 py-0.5 rounded-md bg-muted/80 border border-default text-highlighted font-mono font-medium"
                >
                  {{ tbl }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Closing Callout Bar -->
        <div class="rounded-xl border border-default bg-elevated/70 backdrop-blur-sm p-4 sm:p-6 text-center max-w-4xl mx-auto shadow-sm">
          <p class="text-sm sm:text-base leading-relaxed">
            <strong class="text-highlighted">{{ $t("landing.databaseArchitecture.summaryCallout.lead") }}</strong>
            <span class="text-muted">{{ $t("landing.databaseArchitecture.summaryCallout.tail") }}</span>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n();

const metricKeys = [
  { id: "tables", icon: "i-lucide-table-2" },
  { id: "hyperdrive", icon: "i-lucide-zap" },
  { id: "encryption", icon: "i-lucide-shield-check" },
  { id: "kvAuth", icon: "i-lucide-key" },
];

const domainKeys = [
  {
    id: "tenancy",
    icon: "i-lucide-users",
    iconClass: "text-blue-400",
  },
  {
    id: "billing",
    icon: "i-lucide-credit-card",
    iconClass: "text-emerald-400",
  },
  {
    id: "governance",
    icon: "i-lucide-shield-alert",
    iconClass: "text-amber-400",
  },
  {
    id: "jobs",
    icon: "i-lucide-cpu",
    iconClass: "text-purple-400",
  },
];

function getTablesList(domainId: string): string[] {
  const raw = t(`landing.databaseArchitecture.domains.${domainId}.tables`);
  return raw ? raw.split(",").map((s: string) => s.trim()) : [];
}
</script>
