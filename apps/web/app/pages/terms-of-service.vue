<template>
  <LayoutContentPage />
</template>

<script setup>
definePageMeta({
  layout: "page",
  auth: false,
  // English-only, like the docs and the blog: the legal text exists in one language, so
  // localized routes would serve an empty page (there is no /pt-br/... document to query).
  // `i18n: false` is read by @nuxtjs/i18n and skips route localization for this page;
  // the old /pt-br/... and /es/... URLs redirect here (routeRules in nuxt.config.ts).
  i18n: false,
});
</script>
