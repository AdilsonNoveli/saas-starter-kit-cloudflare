<template>
  <div>
    <LandingHero />
    <LandingArchitecture />
    <LandingUseCases />
    <LandingComparisonTable />
    <LandingFeatureBadges />
    <div class="py-8">
      <LandingFAQs
        title="Common Questions"
        subtitle="Learn more about this SaaS starter kit and how to customize it for your needs."
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
useSeoMeta({
  title: "Demo SaaS",
});
const colorMode = useColorMode();
colorMode.preference = "dark";
</script>
