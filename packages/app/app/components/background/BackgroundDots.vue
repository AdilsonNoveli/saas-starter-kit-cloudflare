<template>
  <div>
    <div id="dots" class="fixed dark:bg-gray-950 w-screen h-screen z-[-2]">
      <div
        id="overlay"
        :style="overlayVars"
        class="z-[-1] rounded-full fixed -translate-x-1/2 -translate-y-1/2 w-40 h-40"
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
  "--pos-x": `-${x.value}px`,
  "--pos-y": `-${y.value}px`,
}));
</script>

<style scoped>
#dots {
  background-image: radial-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 0);
  background-size: 20px 20px;
}

.dark #dots {
  background-image: radial-gradient(
    rgba(255, 255, 255, 0.1) 1px,
    transparent 0
  );
}

#overlay {
  background-image: radial-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 0);
  background-size: 20px 20px;
  background-position: var(--pos-x) var(--pos-y);
}

.dark #overlay {
  background-image: radial-gradient(
    rgba(255, 255, 255, 0.1) 1px,
    transparent 0
  );
}
</style>
