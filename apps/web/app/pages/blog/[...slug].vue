<template>
  <LayoutContentPage type="blog" />
</template>

<script setup>
definePageMeta({
  layout: "page",
  auth: false,
  // English-only — same reasoning as pages/docs/[...slug].vue: a catch-all
  // route can't be expanded into prerenderable per-locale URLs, and
  // @nuxt/content has no runtime backend on Cloudflare to fall back to.
  i18n: false,
});
</script>
