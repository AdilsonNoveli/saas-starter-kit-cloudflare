<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <section aria-labelledby="landing-audience" class="container mx-auto max-w-5xl px-4 md:px-8 py-20 md:py-28">
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-primary">{{ t("landing.audience.eyebrow") }}</p>
      <h2 id="landing-audience" class="mt-3 text-pretty text-4xl sm:text-5xl font-extrabold tracking-tight text-highlighted">
        {{ t("landing.audience.title") }}
      </h2>
    </div>
    <div class="mt-14 grid gap-6 md:grid-cols-2">
      <div class="rounded-2xl border border-success/40 bg-success/5 p-8">
        <UIcon name="i-lucide-circle-check" class="size-7 text-success" aria-hidden="true" />
        <h3 class="mt-4 text-xl font-bold text-highlighted">{{ t("landing.audience.forTitle") }}</h3>
        <p class="mt-3 text-base leading-relaxed text-muted">{{ t("landing.audience.forText") }}</p>
      </div>
      <div class="rounded-2xl border border-default bg-elevated/50 p-8">
        <UIcon name="i-lucide-circle-x" class="size-7 text-muted" aria-hidden="true" />
        <h3 class="mt-4 text-xl font-bold text-highlighted">{{ t("landing.audience.notTitle") }}</h3>
        <p class="mt-3 text-base leading-relaxed text-muted">{{ t("landing.audience.notText") }}</p>
      </div>
    </div>
  </section>
</template>
