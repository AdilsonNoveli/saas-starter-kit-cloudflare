<template>
  <div v-if="!page?.body" class="flex h-full items-center justify-center">
    <h3
      class="scroll-m-20 border-r border-default px-4 py-3 text-2xl font-semibold"
    >
      404
    </h3>
    <span class="scroll-m-20 px-4"> {{ $t("docs.notFound") }} </span>
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
        :title="$t('docs.emptyPage.title')"
        icon="i-lucide-circle-x"
      >
        <template #description>
          <i18n-t keypath="docs.emptyPage.description" tag="span">
            <template #path>
              <ProseCodeInline>content{{ page?.path }}.md</ProseCodeInline>
            </template>
          </i18n-t>
        </template>
      </UAlert>

      <ContentRenderer
        v-else
        :key="page?.id"
        :value="page || undefined"
        class="docs-content"
      />

      <!-- Strategic Documentation CTA Banner -->
      <div class="mt-12 pt-8 border-t border-default">
        <div class="rounded-2xl border border-default bg-elevated/70 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 backdrop-blur-md shadow-sm">
          <div class="space-y-1.5 flex-1">
            <div class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <UIcon name="i-lucide-package-check" class="w-4 h-4" />
              <span>{{ $t("docs.banner.badge") }}</span>
            </div>
            <h4 class="font-extrabold text-highlighted text-lg sm:text-xl tracking-tight">
              {{ $t("docs.banner.title") }}
            </h4>
            <p class="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
              {{ $t("docs.banner.description") }}
            </p>
          </div>
          <div class="shrink-0">
            <CTAButton
              :to="`${localePath('/')}#offer`"
              size="md"
              radius="lg"
              trailing-icon="i-lucide-arrow-right"
              class="whitespace-nowrap text-xs sm:text-sm font-bold tracking-wider px-6 py-3.5"
            >
              {{ $t("docs.banner.cta") }}
            </CTAButton>
          </div>
        </div>
      </div>
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
          <span class="text-md font-medium">{{ $t("docs.onThisPage") }}</span>
        </div>
        <DocsTocTree :links="page?.body?.toc?.links || []" :level="0" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { contentNotFound } from "~/utils/seo/content-seo";

const page = await usePage();
const {
  docs: { name, description },
} = useAppConfig();

const localePath = useLocalePath();
const breadcrumbLinks = await useBreadcrumb();

const route = useRoute();

// The page renders its own "not found" state, but the response must say 404 as well:
// status 200 on a page with nothing in it is a soft 404 that search engines index.
if (contentNotFound(page.value, { path: route.path, requireBody: true })) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 404);
}

usePageSeo({
  path: route.path,
  title: `${page.value?.title ?? "404"} - ${name}`,
  socialTitle: page.value?.title ?? "404",
  description: page.value?.description || description,
  kind: "docs",
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
