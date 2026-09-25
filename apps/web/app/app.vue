<template>
  <UApp>
    <NuxtLoadingIndicator :color="false" class="z-100 bg-primary/80" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup>
const { locale } = useI18n();
// One cache entry per locale: switching the language reads (or fetches) the
// entry of the new locale instead of relying on a watcher.
const { data: navigation } = await useAsyncData(
  () => `navigation:${locale.value}`,
  () => queryDocsNavigation(locale.value),
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

// A blog post is written in one language that does not depend on the visitor's locale, so
// its page emits `lang`, `og:locale` and the hreflang cluster itself (use-content-seo.ts).
// Both sets of tags would otherwise be present and contradict each other.
const ownsLocaleHead = useState("seo:owns-locale-head", () => false);

useHead(() => ({
  htmlAttrs: ownsLocaleHead.value
    ? { dir: localeHead.value.htmlAttrs?.dir }
    : localeHead.value.htmlAttrs,
  link: [
    { href: "/svg/nuxfire.svg", rel: "icon", type: "image/svg+xml" },
    ...(localeHead.value.link ?? []),
  ],
  meta: ownsLocaleHead.value ? [] : (localeHead.value.meta ?? []),
}));

// Every page carries a social image unless it sets its own (Open Graph requires one).
useDefaultSocialMeta();
</script>
