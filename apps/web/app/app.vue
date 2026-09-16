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

// `useLocaleHead()` (the current @nuxtjs/i18n v10 API — `$localeHead` is
// deprecated in favour of it) returns a reactive bag of `htmlAttrs` (lang/dir),
// `link` (canonical + one `rel="alternate" hreflang="..."` per locale) and
// `meta` (`og:locale` / `og:locale:alternate`). Wiring it here, in the single
// root entry point, means every route in every locale emits them without each
// page repeating the call. Passing the ref through a getter keeps `useHead()`
// tracking it when the locale changes.
const localeHead = useLocaleHead({ seo: true });

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  link: [
    { href: "/svg/nuxfire.svg", rel: "icon", type: "image/svg+xml" },
    ...(localeHead.value.link ?? []),
  ],
  meta: localeHead.value.meta ?? [],
}));
</script>
