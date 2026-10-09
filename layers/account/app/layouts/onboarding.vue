<script setup lang="ts">
// The onboarding shell (SPEC-0010, FR-004, AC-044): a split screen with the
// brand on a solid ink panel and the step form beside it. On a phone the panel
// becomes a band at the top. No sidebar, no menu: the step indicator is the
// only navigation. The panel is ink in both themes (`bg-inverted` in light,
// the raised surface in dark), so the logo for dark backgrounds always fits,
// and the lime appears once, as a highlighter carrying ink text.
const { t } = useI18n();
const { brandName } = useRuntimeConfig().public;
</script>

<template>
  <div class="min-h-dvh bg-default lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <aside
      class="flex flex-col gap-4 px-4 py-6 sm:px-8 sm:py-8 lg:sticky lg:top-0 lg:h-dvh lg:gap-0 lg:px-12 lg:py-12 bg-inverted text-inverted dark:bg-elevated dark:text-highlighted lg:border-r lg:border-default"
    >
      <img
        src="/logo-dark.svg"
        width="500"
        height="150"
        :alt="brandName"
        class="h-7 w-auto self-start lg:h-8"
      />

      <div class="max-w-md space-y-3 lg:my-auto lg:space-y-6">
        <h1 class="text-2xl font-bold leading-tight lg:text-4xl">
          <mark class="rounded-xs bg-highlight px-1.5 text-on-highlight">{{
            t("account.onboarding.brand.title")
          }}</mark>
        </h1>
        <p class="hidden text-base leading-relaxed sm:block lg:text-lg">
          {{ t("account.onboarding.brand.lead") }}
        </p>
      </div>

      <p class="hidden text-sm lg:block dark:text-muted">
        {{ t("account.onboarding.brand.later") }}
      </p>
    </aside>

    <main class="flex justify-center px-4 py-8 sm:px-8 lg:items-center lg:px-12 lg:py-12">
      <div class="w-full max-w-xl">
        <slot />
      </div>
    </main>
  </div>
</template>
