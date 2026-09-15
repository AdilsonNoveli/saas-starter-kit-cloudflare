<template>
  <div
    class="relative p-5 sm:p-6 bg-elevated rounded-xl border border-default h-full min-h-[195px] flex flex-col justify-between"
  >
    <div class="space-y-4 flex-1 flex flex-col justify-between">
      <p class="text-toned text-xs sm:text-sm leading-relaxed relative z-10 line-clamp-4">
        "{{ testimonial }}"
      </p>

      <!-- Author info -->
      <div class="flex items-center gap-3.5 pt-2 border-t border-default/40">
        <UAvatar :src="avatar" :alt="name" size="md" />
        <div class="min-w-0">
          <h4 class="font-semibold text-xs sm:text-sm text-highlighted truncate">
            {{ name }}
          </h4>
          <a
            v-if="socialLink"
            :href="socialLink"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-muted hover:text-primary transition-colors block truncate"
          >
            {{ socialHandle }}
          </a>
          <span v-else class="text-xs text-muted block truncate">
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
