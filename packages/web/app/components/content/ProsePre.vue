<template>
  <UCard
    :ui="{ body: 'px-0 py-0 sm:p-0' }"
    class="relative overflow-hidden [&:not(:first-child)]:mt-5 [&:not(:last-child)]:mb-5"
  >
    <div
      v-if="filename"
      class="flex items-center border-b border-gray-200 dark:border-gray-800 px-3 py-2 font-mono text-sm"
    >
      {{ filename }}
      <CodeCopy :code class="ml-auto" />
    </div>

    <span v-else class="absolute right-2 top-2 z-10">
      <CodeCopy :code />
    </span>
    <div class="bg-primary-50/5 dark:bg-primary-950/5">
      <div
        class="overflow-x-auto py-3 text-sm"
        :class="[!filename && 'inline-copy', !language && 'pl-3']"
      >
        <pre :class="$props.class" :style="style"><slot /></pre>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { BuiltinLanguage } from "shiki";

defineProps({
  code: {
    type: String,
    default: "",
  },
  language: {
    type: String as PropType<BuiltinLanguage>,
    default: null,
  },
  filename: {
    type: String,
    default: null,
  },
  highlights: {
    type: Array as () => number[],
    default: () => [],
  },
  meta: {
    type: String,
    default: null,
  },
  class: {
    type: String,
    default: null,
  },
  style: {
    type: [String, Object],
    default: null,
  },
});
</script>

<style>
pre code .line {
  display: block;
  min-height: 1rem;
}

.fade-enter-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.shiki .line.highlight {
  background-color: hsl(var(--muted) / 0.8);
}

.shiki .line {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.inline-copy .line {
  padding-right: 2.75rem;
}
</style>
