<template>
  <div class="container mx-auto max-w-5xl px-4 md:px-8 py-8">
    <div class="flex flex-wrap justify-center items-center gap-2 sm:gap-3 max-w-4xl mx-auto">
      <UBadge
        v-for="(badge, index) in featureBadges"
        :key="index"
        color="neutral"
        variant="subtle"
        size="md"
        class="border border-night-700/60 bg-night-900/40 text-muted hover:text-highlighted hover:border-night-600 transition-colors py-1.5 px-3"
      >
        <div class="flex gap-1.5 items-center text-xs sm:text-sm font-medium">
          <UIcon class="w-4 h-4 text-emerald-500" name="i-lucide-circle-check" />
          <span>{{ badge.text }}</span>
        </div>
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
const featureBadges = [
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
];
</script>
