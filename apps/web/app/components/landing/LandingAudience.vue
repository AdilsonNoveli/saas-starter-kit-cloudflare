<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <section aria-labelledby="landing-audience" class="container mx-auto max-w-3xl px-4 md:px-8 py-16 md:py-24">
    <h2 id="landing-audience" class="text-pretty text-3xl sm:text-4xl font-extrabold tracking-tight text-highlighted">
      {{ t("landing.audience.title") }}
    </h2>
    <div class="mt-10 space-y-8">
      <div>
        <h3 class="text-xl font-bold text-highlighted">{{ t("landing.audience.forTitle") }}</h3>
        <p class="mt-2 text-base leading-relaxed text-muted">{{ t("landing.audience.forText") }}</p>
      </div>
      <div>
        <h3 class="text-xl font-bold text-highlighted">{{ t("landing.audience.notTitle") }}</h3>
        <p class="mt-2 text-base leading-relaxed text-muted">{{ t("landing.audience.notText") }}</p>
      </div>
    </div>
  </section>
</template>
