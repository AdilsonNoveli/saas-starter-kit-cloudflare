<template>
  <div class="container mx-auto max-w-5xl px-4 md:px-8 py-8">
    <div class="flex flex-wrap justify-center items-center gap-2 sm:gap-3 max-w-4xl mx-auto">
      <UBadge
        v-for="badge in featureBadges"
        :key="badge"
        color="neutral"
        variant="subtle"
        size="md"
        class="border border-night-700/60 bg-night-900/40 text-muted hover:text-highlighted hover:border-night-600 transition-colors py-1.5 px-3"
      >
        <div class="flex gap-1.5 items-center text-xs sm:text-sm font-medium">
          <UIcon class="w-4 h-4 text-emerald-500" name="i-lucide-circle-check" />
          <span>{{ t(`landing.badges.${badge}`) }}</span>
        </div>
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

// Key suffixes under `landing.badges.*` — the display text lives in the locale
// files so the order here stays the single place that controls the layout.
const featureBadges = [
  "modernStack",
  "typeSafe",
  "paymentReady",
  "cloudReady",
  "authentication",
  "teamFeatures",
  "emailSystem",
  "testingSetup",
  "flexibleDeployment",
  "databaseReady",
  "backgroundJobs",
  "apiFramework",
  "ormIncluded",
  "emailTemplates",
  "socialAuth",
  "roleBasedAccess",
  "teamManagement",
  "subscriptionSystem",
  "modernUi",
  "seoReady",
  "multiLanguage",
];
</script>
