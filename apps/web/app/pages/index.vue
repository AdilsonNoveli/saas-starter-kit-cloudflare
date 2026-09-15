<template>
  <div>
    <LandingHero />
    <LandingArchitecture />
    <LandingUseCases />
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
  // The landing page is dark-only by design (see ColorModeSwitch being
  // hidden on this route in NavigationBar.vue). Forcing it via route meta
  // only overrides the *applied* color mode for this route — it does not
  // touch `colorMode.preference`, so it never overwrites what the user
  // actually chose (persisted to cookie/localStorage) for the rest of the
  // site. Setting `colorMode.preference = "dark"` directly here was the bug:
  // that write persists, so visiting "/" after picking "light" elsewhere
  // silently forced dark mode everywhere else too.
  colorMode: "dark",
});
const { t } = useI18n();
useSeoMeta({
  // Function form so the title re-resolves when the locale changes instead of
  // being frozen at setup time.
  title: () => t("landing.seoTitle"),
});
</script>
