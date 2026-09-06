<template>
  <div class="relative p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
    <div class="absolute -top-4 -left-2">
      <UIcon
        name="i-carbon-quotes"
        class="w-8 h-8 text-primary-500 dark:text-primary-400"
      />
    </div>

    <div class="space-y-6">
      <p class="text-gray-700 dark:text-gray-300 relative z-10">
        {{ testimonial }}
      </p>

      <!-- Author info -->
      <div class="flex items-center gap-4">
        <UAvatar :src="avatar" :alt="name" size="lg" />
        <div>
          <h4 class="font-medium text-gray-900 dark:text-white">
            {{ name }}
          </h4>
          <a
            :href="socialLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
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
