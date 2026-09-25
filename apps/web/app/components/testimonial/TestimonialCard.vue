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
        <img
          v-if="avatar"
          :src="avatar"
          :alt="name"
          width="44"
          height="44"
          loading="lazy"
          decoding="async"
          class="size-11 shrink-0 rounded-full object-cover"
        />
        <span
          v-else
          class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          {{ initials }}
        </span>
        <div class="min-w-0">
          <p class="font-semibold text-xs sm:text-sm text-highlighted truncate">
            {{ name }}
          </p>
          <span class="text-xs text-muted block truncate">
            {{ socialHandle }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  testimonial: string;
  name: string;
  /** Photo of the person; empty when they have none, and the card shows their initials. */
  avatar?: string;
  socialHandle: string;
}>();

const initials = computed(() =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(""),
);
</script>
