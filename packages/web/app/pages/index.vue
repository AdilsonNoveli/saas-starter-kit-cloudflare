<template>
  <div>
    <LandingHero />
    <LandingArchitecture />
    <LandingFeatures />
    <div class="py-8">
      <LandingFAQs
        title="Common Questions"
        subtitle="Learn more about this SaaS starter kit and how to customize it for your needs."
      />
    </div>
    <LandingTestimonials />
    <LandingCTA
      title="Your Next SaaS Project Starts Here"
      description="A complete starter kit with everything you need to launch and scale your SaaS in record time."
      cta="Get Started"
    />
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
</script>
