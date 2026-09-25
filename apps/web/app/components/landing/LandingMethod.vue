<script setup lang="ts">
const { t } = useI18n();

const steps = ["idea", "spec", "ship"];
const walkthrough = "/docs/fireskills/getting-started/workflow";
</script>

<template>
  <section aria-labelledby="landing-method" class="border-y border-default bg-elevated/40">
    <div class="container mx-auto max-w-6xl px-4 md:px-8 py-20 md:py-28">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-primary">{{ t("landing.method.eyebrow") }}</p>
        <h2 id="landing-method" class="mt-3 text-pretty text-4xl sm:text-5xl font-extrabold tracking-tight text-highlighted">
          {{ t("landing.method.title") }}
        </h2>
        <p class="mt-6 text-lg sm:text-xl leading-relaxed text-muted">
          {{ t("landing.method.body") }}
        </p>
      </div>
      <ol class="mt-16 grid gap-10 md:grid-cols-3 list-none p-0">
        <li v-for="(step, index) in steps" :key="step">
          <span class="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-white" aria-hidden="true">
            {{ index + 1 }}
          </span>
          <h3 class="mt-5 text-xl font-bold text-highlighted">
            {{ t(`landing.method.steps.${step}.title`) }}
          </h3>
          <p class="mt-2 text-base leading-relaxed text-muted">
            {{ t(`landing.method.steps.${step}.text`) }}
          </p>
        </li>
      </ol>
      <div class="mt-14 text-center">
        <UButton :to="walkthrough" color="neutral" variant="outline" size="lg" trailing-icon="i-lucide-arrow-right">
          {{ t("landing.method.cta") }}
        </UButton>
      </div>
    </div>
  </section>
</template>
