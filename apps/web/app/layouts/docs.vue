<template>
  <BackgroundDots>
    <DocsHeader />
    <!-- TODO: add option for pages without sidebar -->
    <div class="pt-6 pb-16">
      <div
        class="lg:mx-auto container flex-1 items-start px-4 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10"
      >
        <aside
          class="z-30 -ml-2 hidden h-[calc(100vh-6rem)] w-full shrink-0 overflow-y-auto no-scrollbar sticky top-[80px] lg:block"
        >

          <DocsSidebar :is-mobile="false" />
        </aside>
        <NuxtPage />
      </div>
    </div>
    <DocsFooter />
  </BackgroundDots>
</template>

<script setup lang="ts">
const {
  docs: { description },
} = useAppConfig();
useSeoMeta({
  description: description,
});
</script>
