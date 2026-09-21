<template>
  <UApp>
    <NuxtLoadingIndicator :color="false" class="z-100 bg-primary/80" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <ConfirmDialog />
  </UApp>
</template>

<script setup lang="ts">
import { themeColor as tokensThemeColor } from "@nuxfire/tokens";

const colorMode = useColorMode();
const appConfig = useAppConfig();

const themeColor = computed(() =>
  colorMode.value === "dark" ? tokensThemeColor.dark : tokensThemeColor.light,
);

useHead({
  link: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
  meta: [{ id: "theme-color", name: "theme-color", content: themeColor }],
});

useSeoMeta({
  titleTemplate: (title) =>
    title ? `${title} · ${appConfig.site.name}` : appConfig.site.name,
  description: appConfig.site.description,
  ogSiteName: appConfig.site.name,
  ogTitle: appConfig.site.name,
  ogDescription: appConfig.site.description,
});
</script>
