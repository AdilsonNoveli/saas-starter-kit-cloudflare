<script setup lang="ts">
const colorMode = useColorMode();
colorMode.preference = "dark";
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator :color="false" class="z-100 bg-primary" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
