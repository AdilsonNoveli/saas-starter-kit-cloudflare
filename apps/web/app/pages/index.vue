<template>
  <div>
    <LandingHero />
    <LandingUseCases />
    <LandingArchitecture />
    <LandingComparisonTable />
    <LandingFeatureBadges />
    <div class="py-8">
      <LandingFAQs
        :title="t('landing.faqs.homeTitle')"
        :subtitle="t('landing.faqs.homeSubtitle')"
      />
    </div>
    <LandingTestimonials />
    <LandingPricing />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "page",
  auth: false,
});
const { t } = useI18n();
useSeoMeta({
  // Function form so the title re-resolves when the locale changes instead of
  // being frozen at setup time.
  title: () => t("landing.seoTitle"),
});
</script>
