<template>
  <UApp>
    <NuxtLoadingIndicator :color="false" class="z-100 bg-primary/80" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup>
const { data: navigation } = await useAsyncData("navigation", () =>
  queryCollectionNavigation("docs"),
);
provide("navigation", navigation);

useHead({
  link: [{ href: "/favicon.ico", rel: "icon", type: "image/x-icon" }],
});
</script>
