<template>
  <div class="overflow-x-clip min-h-screen">
    <div id="dots" class="fixed inset-0 w-full h-full bg-default z-[-2] pointer-events-none">
      <div
        id="overlay"
        :style="overlayVars"
        class="z-[-1] rounded-full fixed -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none blur-xl"
      />
    </div>
    <div class="px-2 lg:px-0">
      <slot />
    </div>
  </div>
</template>

<script setup>
const { x, y } = usePointer();
const overlayVars = computed(() => ({
  display: !x.value && !y.value ? "none" : undefined,
  left: `${x.value}px`,
  top: `${y.value}px`,
}));
</script>

<style scoped>
#dots {
  background-image: radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 0);
  background-size: 20px 20px;
}

.dark #dots {
  background-image: radial-gradient(
    rgba(255, 255, 255, 0.07) 1px,
    transparent 0
  );
}

#overlay {
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--color-fire-500) 9%, transparent) 0%,
    color-mix(in srgb, var(--color-fire-700) 4%, transparent) 45%,
    transparent 70%
  );
}
</style>

