<template>
  <div
    class="relative p-6 bg-default rounded-xl shadow-sm border border-default"
  >
    <div class="absolute -top-4 -left-2">
      <UIcon
        name="i-carbon-quotes"
        class="w-8 h-8 text-primary"
      />
    </div>

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
