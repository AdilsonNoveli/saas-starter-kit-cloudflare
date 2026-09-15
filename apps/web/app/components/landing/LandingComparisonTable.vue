<template>
  <section id="comparison" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-10 lg:mb-14">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-scale" class="w-4 h-4 text-emerald-400" />
              <span>{{ $t("landing.comparison.badge") }}</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          {{ $t("landing.comparison.title") }}
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          {{ $t("landing.comparison.subtitle") }}
        </p>
      </div>

      <!-- Quick Metrics Highlight Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
        <div class="p-4 rounded-lg bg-night-900/60 border border-night-800 text-center">
          <span class="block text-2xl lg:text-3xl font-extrabold text-emerald-400">{{ $t("landing.comparison.metrics.featuresValue") }}</span>
          <span class="text-xs sm:text-sm text-muted">{{ $t("landing.comparison.metrics.featuresLabel") }}</span>
        </div>
        <div class="p-4 rounded-lg bg-night-900/60 border border-night-800 text-center">
          <span class="block text-2xl lg:text-3xl font-extrabold text-highlighted">{{ $t("landing.comparison.metrics.timeValue") }}</span>
          <span class="text-xs sm:text-sm text-muted">{{ $t("landing.comparison.metrics.timeLabel") }}</span>
        </div>
        <div class="p-4 rounded-lg bg-night-900/60 border border-night-800 text-center">
          <span class="block text-2xl lg:text-3xl font-extrabold text-amber-400">{{ $t("landing.comparison.metrics.missingValue") }}</span>
          <span class="text-xs sm:text-sm text-muted">{{ $t("landing.comparison.metrics.missingLabel") }}</span>
        </div>
      </div>

      <!-- Centered & Long Search Input (Above Group Menus) -->
      <div class="w-full max-w-2xl mx-auto mb-6">
        <div class="relative w-full">
          <UIcon
            name="i-lucide-search"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="$t('landing.comparison.searchPlaceholder')"
            class="w-full bg-night-900/80 border border-neutral-700/90 ring-1 ring-white/10 hover:border-neutral-500/80 hover:ring-white/20 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/30 rounded-lg pl-12 pr-10 py-3 text-sm sm:text-base text-highlighted placeholder:text-muted/70 transition-all outline-none shadow-sm"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-highlighted p-1 cursor-pointer"
            :aria-label="$t('landing.comparison.clearSearch')"
            @click="searchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Group Menus in a Single Line -->
      <div class="w-full max-w-5xl mx-auto mb-8 overflow-x-auto no-scrollbar">
        <div class="flex flex-nowrap items-center justify-start md:justify-center gap-2 min-w-max px-2 py-1">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            :class="[
              'px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-all cursor-pointer',
              activeCategory === category.id && !searchQuery
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/50 shadow-sm font-semibold'
                : 'bg-night-900/50 text-muted hover:text-highlighted border border-night-800 hover:border-night-700'
            ]"
            @click="activeCategory = category.id; searchQuery = ''"
          >
            {{ t(`landing.comparison.categories.${category.id}`) }}
            <span class="ml-1.5 text-[11px] px-1.5 py-0.5 rounded bg-night-950/60 text-muted border border-night-800/80">
              {{ getCategoryCount(category.id) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Comparison Table Container -->
      <div class="overflow-hidden rounded-xl border border-night-800 bg-night-950/60 backdrop-blur-md shadow-2xl max-w-5xl mx-auto">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-night-800 bg-night-900/80">
                <th class="py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-muted uppercase tracking-wider w-1/2">
                  {{ $t("landing.comparison.columns.feature") }}
                </th>
                <th class="py-4 px-4 sm:px-6 text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider text-center bg-emerald-500/5 border-x border-emerald-500/20 w-1/4">
                  <div class="flex items-center justify-center gap-1.5">
                    <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-emerald-400" />
                    <span>{{ $t("landing.comparison.columns.nuxfire") }}</span>
                  </div>
                </th>
                <th class="py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-muted uppercase tracking-wider text-center w-1/4">
                  {{ $t("landing.comparison.columns.scratch") }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-night-800/60 text-sm">
              <template v-for="category in visibleCategories" :key="category.id">
                <!-- Category Section Header Row -->
                <tr class="bg-night-900/40">
                  <td colspan="3" class="py-2.5 px-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-night-400">
                    <div class="flex items-center gap-2">
                      <UIcon :name="category.icon" class="w-4 h-4 text-emerald-400" />
                      <span>{{ t(`landing.comparison.categories.${category.id}`) }}</span>
                    </div>
                  </td>
                </tr>

                <!-- Feature Rows -->
                <tr
                  v-for="item in getCategoryItems(category.id)"
                  :key="item.id"
                  class="hover:bg-night-900/30 transition-colors group"
                >
                  <!-- Feature Info -->
                  <td class="py-3.5 px-4 sm:px-6">
                    <div class="font-medium text-highlighted group-hover:text-white transition-colors">
                      {{ item.name }}
                    </div>
                    <div v-if="item.description" class="text-xs text-muted mt-0.5">
                      {{ item.description }}
                    </div>
                  </td>

                  <!-- NuxFire Column -->
                  <td class="py-3.5 px-4 sm:px-6 text-center bg-emerald-500/5 border-x border-emerald-500/20">
                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium text-xs">
                      <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-emerald-400" />
                      <span>{{ $t("landing.comparison.status.included") }}</span>
                    </div>
                  </td>

                  <!-- From Scratch Column -->
                  <td class="py-3.5 px-4 sm:px-6 text-center">
                    <!-- Ready -->
                    <div
                      v-if="item.scratch === 'ready'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-night-800/80 border border-night-700 text-night-300 font-medium text-xs"
                    >
                      <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-emerald-400" />
                      <span>{{ $t("landing.comparison.status.ready") }}</span>
                    </div>

                    <!-- Partial -->
                    <div
                      v-else-if="item.scratch === 'partial'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-medium text-xs"
                    >
                      <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5 text-amber-400" />
                      <span>{{ $t("landing.comparison.status.partial") }}</span>
                    </div>

                    <!-- Missing -->
                    <div
                      v-else
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-night-900/60 border border-night-800 text-night-500 font-medium text-xs"
                    >
                      <UIcon name="i-lucide-x" class="w-3.5 h-3.5 text-night-500" />
                      <span>{{ $t("landing.comparison.status.missing") }}</span>
                    </div>
                  </td>
                </tr>
              </template>

              <!-- Empty State when filtering returns nothing -->
              <tr v-if="filteredItemsCount === 0">
                <td colspan="3" class="py-12 text-center text-muted">
                  {{ $t("landing.comparison.empty", { query: searchQuery }) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Legend Footer -->
        <div class="py-3 px-6 bg-night-900/70 border-t border-night-800 flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-check" class="w-4 h-4 text-emerald-400" />
              <span>{{ $t("landing.comparison.legend.verified") }}</span>
            </span>
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-amber-400" />
              <span>{{ $t("landing.comparison.legend.basic") }}</span>
            </span>
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-x" class="w-4 h-4 text-night-500" />
              <span>{{ $t("landing.comparison.legend.custom") }}</span>
            </span>
          </div>
          <span class="text-night-500 text-[11px]">{{ $t("landing.comparison.legend.source") }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface FeatureItem {
  id: string;
  name: string;
  description: string;
  category: string;
  scratch: "ready" | "partial" | "missing";
}

const { t } = useI18n();

const activeCategory = ref("auth");
const searchQuery = ref("");

const categories = [
  { id: "auth", icon: "i-lucide-shield-check" },
  { id: "teams", icon: "i-lucide-users" },
  { id: "admin", icon: "i-lucide-crown" },
  { id: "billing", icon: "i-lucide-credit-card" },
  { id: "realtime", icon: "i-lucide-zap" },
  { id: "content", icon: "i-lucide-file-text" },
  { id: "infra", icon: "i-lucide-cpu" },
];

// Structure only: which category a feature belongs to and how hard it is to
// build from scratch. The visible name and description for each `id` live
// under `landing.comparison.features.<id>.{name,description}` in the locale
// files, so the 52 rows here stay a single flat list instead of 52 * 3
// duplicated copies of the same marketing copy.
const featureMeta: Omit<FeatureItem, "name" | "description">[] = [
  // 1. Auth & Security
  { id: "authPassword", category: "auth", scratch: "ready" },
  { id: "authOtp", category: "auth", scratch: "partial" },
  { id: "authOauth", category: "auth", scratch: "partial" },
  { id: "authRateLimit", category: "auth", scratch: "missing" },
  { id: "authSessions", category: "auth", scratch: "missing" },
  { id: "authRevoke", category: "auth", scratch: "missing" },
  { id: "authTotp", category: "auth", scratch: "missing" },
  { id: "authDeletion", category: "auth", scratch: "missing" },

  // 2. Teams, Workspaces & RBAC
  { id: "teamsMultiTenancy", category: "teams", scratch: "missing" },
  { id: "teamsSwitcher", category: "teams", scratch: "missing" },
  { id: "teamsCrud", category: "teams", scratch: "missing" },
  { id: "teamsLogo", category: "teams", scratch: "missing" },
  { id: "teamsDeletion", category: "teams", scratch: "partial" },
  { id: "teamsInvites", category: "teams", scratch: "partial" },
  { id: "teamsInviteLifecycle", category: "teams", scratch: "missing" },
  { id: "teamsMemberRoles", category: "teams", scratch: "partial" },
  { id: "teamsSeatLimits", category: "teams", scratch: "missing" },
  { id: "teamsRbac", category: "teams", scratch: "partial" },
  { id: "teamsSystemRoles", category: "teams", scratch: "missing" },

  // 3. Platform Admin Console
  { id: "adminConsole", category: "admin", scratch: "missing" },
  { id: "adminGate", category: "admin", scratch: "missing" },
  { id: "adminMetrics", category: "admin", scratch: "missing" },
  { id: "adminAccounts", category: "admin", scratch: "missing" },
  { id: "adminPlans", category: "admin", scratch: "missing" },
  { id: "adminJobs", category: "admin", scratch: "missing" },
  { id: "adminAudit", category: "admin", scratch: "missing" },
  { id: "adminAnnouncements", category: "admin", scratch: "missing" },

  // 4. Payments & Billing
  { id: "billingProviders", category: "billing", scratch: "missing" },
  { id: "billingPlanSync", category: "billing", scratch: "missing" },
  { id: "billingDbPlans", category: "billing", scratch: "missing" },
  { id: "billingQuotas", category: "billing", scratch: "missing" },
  { id: "billingCheckout", category: "billing", scratch: "partial" },
  { id: "billingWebhooks", category: "billing", scratch: "partial" },
  { id: "billingIdempotency", category: "billing", scratch: "missing" },
  { id: "billingPortal", category: "billing", scratch: "partial" },

  // 5. Realtime & Background Queues
  { id: "realtimeWebsockets", category: "realtime", scratch: "missing" },
  { id: "realtimeTickets", category: "realtime", scratch: "missing" },
  { id: "realtimeNotifications", category: "realtime", scratch: "missing" },
  { id: "realtimeQueues", category: "realtime", scratch: "missing" },
  { id: "realtimeDlq", category: "realtime", scratch: "missing" },
  { id: "realtimeCrons", category: "realtime", scratch: "partial" },

  // 6. CMS, Blog & Documentation
  { id: "contentCms", category: "content", scratch: "missing" },
  { id: "contentSearch", category: "content", scratch: "missing" },
  { id: "contentBlog", category: "content", scratch: "partial" },
  { id: "contentLegal", category: "content", scratch: "partial" },
  { id: "contentLanding", category: "content", scratch: "ready" },

  // 7. Engineering & Edge Infrastructure
  { id: "infraServerless", category: "infra", scratch: "missing" },
  { id: "infraIac", category: "infra", scratch: "missing" },
  { id: "infraDrizzle", category: "infra", scratch: "partial" },
  { id: "infraSeeding", category: "infra", scratch: "missing" },
  { id: "infraTypes", category: "infra", scratch: "partial" },
  { id: "infraPooling", category: "infra", scratch: "missing" },
];

// Resolved against the active locale so the free-text search below matches
// what the visitor actually sees, not the English source strings.
const features = computed<FeatureItem[]>(() =>
  featureMeta.map((meta) => ({
    ...meta,
    name: t(`landing.comparison.features.${meta.id}.name`),
    description: t(`landing.comparison.features.${meta.id}.description`),
  })),
);

const filteredFeatures = computed(() => {
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    return features.value.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q),
    );
  }
  return features.value.filter((f) => f.category === activeCategory.value);
});

const filteredItemsCount = computed(() => filteredFeatures.value.length);

const visibleCategories = computed(() => {
  if (searchQuery.value.trim()) {
    return categories.filter((c) => getCategoryItems(c.id).length > 0);
  }
  return categories.filter((c) => c.id === activeCategory.value);
});

function getCategoryItems(categoryId: string) {
  return filteredFeatures.value.filter((f) => f.category === categoryId);
}

function getCategoryCount(categoryId: string) {
  return featureMeta.filter((f) => f.category === categoryId).length;
}
</script>
