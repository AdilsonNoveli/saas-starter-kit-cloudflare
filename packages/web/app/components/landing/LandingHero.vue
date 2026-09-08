<script setup>
const badgeText = ref("Modern SaaS Starter Kit");
const heroTitle = ref("Build Your SaaS Product Faster");
const heroSubtitle = ref(
  h("span", [
    "A complete starter kit with everything you need to ",
    h(
      "span",
      { class: "px-1 font-bold bg-fire-500 text-night-950 rounded" },
      "launch your SaaS in days, not months",
    ),
    ".",
  ]),
);
const featureBadges = ref([
  { text: "Modern Stack" },
  { text: "Type-Safe" },
  { text: "Payment Ready" },
  { text: "Cloud Ready" },
  { text: "Authentication" },
  { text: "Team Features" },
  { text: "Email System" },
  { text: "Testing Setup" },
  { text: "Flexible Deployment" },
  { text: "Database Ready" },
  { text: "Background Jobs" },
  { text: "API Framework" },
  { text: "ORM Included" },
  { text: "Email Templates" },
  { text: "Social Auth" },
  { text: "Role-Based Access" },
  { text: "Team Management" },
  { text: "Subscription System" },
  { text: "Modern UI" },
  { text: "SEO Ready" },
  { text: "Multi-language" },
]);
</script>

<template>
  <div
    class="container mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12 justify-center items-center py-10 lg:py-20 xl:py-24 px-4 md:px-8"
  >
    <div class="flex flex-col min-w-[40%]">
      <div class="flex items-center justify-center lg:justify-start mb-4">
        <UBadge color="neutral" variant="solid" size="md" class="lg:text-lg">
          <div class="flex gap-2 items-center">
            <UIcon name="i-lucide-box" size="3xs" />
            <span>{{ badgeText }}</span>
          </div>
        </UBadge>
      </div>
      <div class="text-center lg:text-left mb-10">
        <h1
          class="mb-6 text-pretty text-3xl font-bold lg:text-5xl lg:leading-[1.1em]"
        >
          {{ heroTitle }}
        </h1>
        <p class="text-muted text-2xl lg:text-3xl">
          <component :is="heroSubtitle" />
        </p>
      </div>
      <CTAButton
        to="/docs"
        size="lg"
        radius="lg"
        trailing-icon="i-lucide-arrow-right"
      >
        Get Started
      </CTAButton>
      <div class="w-full flex justify-center">
        <UButton
          icon="i-lucide-info"
          variant="link"
          color="neutral"
          size="xl"
          to="/docs"
        >
          View Documentation
        </UButton>
      </div>
      <LandingAvatars />
    </div>
    <div class="flex flex-col gap-8">
      <div class="flex flex-wrap justify-center items-center gap-1 lg:gap-3">
        <UBadge
          v-for="(badge, index) in featureBadges"
          :key="index"
          color="primary"
          variant="subtle"
          size="md"
        >
          <div class="flex gap-1 items-center text-xs lg:text-sm">
            <UIcon class="w-6 h-6" name="i-lucide-circle-check" />
            <span>{{ badge.text }}</span>
          </div>
        </UBadge>
      </div>
      <LandingPageLogos />
    </div>
  </div>
</template>
