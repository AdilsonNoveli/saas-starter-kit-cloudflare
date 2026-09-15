<template>
  <div
    class="relative p-6 bg-elevated rounded-xl border border-default"
  >
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
            v-if="socialLink"
            :href="socialLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-muted hover:text-primary transition-colors"
          >
            {{ socialHandle }}
          </a>
          <span v-else class="text-sm text-muted">
            {{ socialHandle }}
          </span>
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
