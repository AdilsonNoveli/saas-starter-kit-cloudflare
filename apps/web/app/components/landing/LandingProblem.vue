<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <section aria-labelledby="landing-problem" class="container mx-auto max-w-3xl px-4 md:px-8 py-16 md:py-24">
    <h2 id="landing-problem" class="text-pretty text-3xl sm:text-4xl font-extrabold tracking-tight text-highlighted">
      {{ t("landing.problem.title") }}
    </h2>
    <p class="mt-6 text-lg leading-relaxed text-muted">
      {{ t("landing.problem.body") }}
    </p>
  </section>
</template>
