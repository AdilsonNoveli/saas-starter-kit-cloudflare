<script setup lang="ts">
import { themeColor as tokensThemeColor } from "@nuxfire/tokens";

const colorMode = useColorMode();
const themeColor = computed(() =>
  colorMode.value === "dark" ? tokensThemeColor.dark : tokensThemeColor.light,
);

useHead({
  link: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
  meta: [{ id: "theme-color", name: "theme-color", content: themeColor }],
});
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator :color="false" class="z-100 bg-primary" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
