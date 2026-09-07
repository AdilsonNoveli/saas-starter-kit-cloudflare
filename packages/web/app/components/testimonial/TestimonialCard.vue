<template>
  <div
    class="relative p-6 bg-default rounded-xl shadow-sm border border-default"
  >
    <!-- Typographic opening quote mark -->
    <span
      class="absolute -top-3 left-3 text-5xl font-serif leading-none text-flame-600 select-none pointer-events-none"
      aria-hidden="true"
    >&#8220;</span>

    <div class="space-y-6">
      <p class="text-toned relative z-10">
        {{ testimonial }}
      </p>

      <!-- Author info -->
      <div class="flex items-center gap-4">
        <UAvatar :src="avatar" :alt="name" size="lg" />
        <div>
          <h4 class="font-medium text-highlighted">
            {{ name }}
          </h4>
          <a
            :href="socialLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-muted hover:text-primary transition-colors"
          >
            {{ socialHandle }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  testimonial: string;
  name: string;
  avatar: string;
  socialHandle: string;
  socialLink?: string;
}>();
</script>
