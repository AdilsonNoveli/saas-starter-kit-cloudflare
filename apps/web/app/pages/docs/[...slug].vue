<template>
  <div v-if="!page?.body" class="flex h-full items-center justify-center">
    <h3
      class="scroll-m-20 border-r border-default px-4 py-3 text-2xl font-semibold"
    >
      404
    </h3>
    <span class="scroll-m-20 px-4"> This page could not be found. </span>
  </div>

  <main
    v-else
    class="relative py-2"
    :class="['lg:grid lg:grid-cols-[1fr_220px] lg:gap-14']"
  >
    <div class="mx-auto w-full min-w-0 space-y-4">
      <UBreadcrumb :items="breadcrumbLinks" />
      <div class="mb-6">
        <ProseH1>
          {{ page?.title }}
        </ProseH1>
        <p class="pt-1 text-lg text-muted">
          {{ page?.description }}
        </p>
        <!-- TODO: badges and other features? -->
      </div>

      <UAlert
        v-if="page?.body?.value?.length === 0"
        title="Empty Page"
        icon="i-lucide-circle-x"
      >
        Start writing in
        <ProseCodeInline>content{{ page?.path }}.md</ProseCodeInline> to see
        this page taking shape.
      </UAlert>

      <ContentRenderer
        v-else
        :key="page?.id"
        :value="page || undefined"
        class="docs-content"
      />

      <!-- TODO: footer links, surround -->
    </div>
    <div
      v-show="page?.body?.toc?.links?.length"
      class="hidden text-sm lg:block"
    >
      <div
        class="fixed top-[70px] h-[calc(100vh-3.5rem)] overflow-hidden space-y-2"
      >
        <div class="flex items-center gap-2 py-2">
          <UIcon name="i-lucide-align-left" />
          <span class="text-md font-medium">On This Page</span>
        </div>
        <DocsTocTree :links="page?.body?.toc?.links || []" :level="0" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const page = await usePage();
const {
  docs: { name },
} = useAppConfig();

const breadcrumbLinks = await useBreadcrumb();

useSeoMeta({
  title: `${page.value?.title ?? "404"} - ${name}`,
  ogTitle: page.value?.title,
  description: page.value?.description,
  ogDescription: page.value?.description,
  twitterCard: "summary_large_image",
});

definePageMeta({
  layout: "docs",
  auth: false,
  // English-only, deliberately excluded from locale prefixing. @nuxt/content
  // has no live backend on Cloudflare here (no D1/Postgres — see the
  // prerender comment in nuxt.config.ts), so every docs URL has to be
  // prerendered from the explicit `docsRoutes()` list or it fails at runtime
  // rather than falling back to a dynamic query. A catch-all route can't be
  // expanded into concrete /pt-br/... and /es/... URLs by that list, so
  // localizing it would create prefixed routes with nothing prerendered
  // behind them. `i18n: false` is read by @nuxtjs/i18n via Nuxt's
  // `experimental.extraPageMetaExtractionKeys` (the module registers the
  // `i18n` key itself) and short-circuits route localization for this page in
  // every `customRoutes` mode. The docs body is English-only for now anyway —
  // translating @nuxt/content markdown is a separate round.
  i18n: false,
});
</script>
