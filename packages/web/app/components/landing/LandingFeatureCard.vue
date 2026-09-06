<template>
  <div
    ref="target"
    :style="cssVars"
    :class="['rounded-[15px] p-[2px] shine', props.class || '']"
  >
    <div
      class="rounded-[13px] w-full h-full bg-gradient-to-br from-gray-200/90 to-gray-300/90 dark:from-gray-950/90 dark:to-gray-800/90 p-6"
    >
      <div class="flex flex-col h-full">
        <div class="mb-4">
          <UIcon :name="icon" class="w-8 h-8" />
        </div>
        <h3 class="text-gray-700 dark:text-gray-300 text-xl font-bold mb-2">
          {{ title }}
        </h3>
        <p
          class="text-gray-600 dark:text-gray-400 text-base mb-4 whitespace-pre-line max-w-[400px]"
        >
          {{ description }}
        </p>
        <ul v-if="subfeatures" class="space-y-2">
          <li
            v-for="feature in subfeatures"
            :key="feature.text"
            class="flex items-start"
          >
            <UIcon
              name="i-lucide-check"
              class="w-5 h-5 text-primary mr-2 flex-shrink-0"
            />
            <span
              class="text-base font-semibold text-gray-600 dark:text-gray-400"
              >{{ feature.text }}</span
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Subfeature {
  text: string;
}

const props = defineProps<{
  class?: string;
  icon: string;
  title: string;
  description: string;
  subfeatures?: Subfeature[];
}>();
const target = ref(null);
const { elementX, elementY } = useMouseInElement(target);
const cssVars = computed(() => ({
  "--x": `${target.value ? elementX.value : -100000}px`,
  "--y": `${target.value ? elementY.value : -100000}px`,
}));
</script>

<style scoped>
.shine {
  background-image: radial-gradient(
    300px circle at var(--x) var(--y),
    var(--ui-primary) 0,
    transparent 100%
  );
}
</style>
