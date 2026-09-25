<script setup lang="ts">
const { t } = useI18n();

const steps = ["idea", "spec", "ship"];
const walkthrough = "/docs/fireskills/getting-started/workflow";
</script>

<template>
  <section aria-labelledby="landing-method" class="container mx-auto max-w-3xl px-4 md:px-8 py-16 md:py-24">
    <h2 id="landing-method" class="text-pretty text-3xl sm:text-4xl font-extrabold tracking-tight text-highlighted">
      {{ t("landing.method.title") }}
    </h2>
    <p class="mt-6 text-lg leading-relaxed text-muted">
      {{ t("landing.method.body") }}
    </p>
    <ol class="mt-12 space-y-8 list-none p-0">
      <li v-for="(step, index) in steps" :key="step" class="flex gap-5">
        <span
          class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-default text-sm font-semibold text-highlighted"
          aria-hidden="true"
        >
          {{ index + 1 }}
        </span>
        <div>
          <h3 class="text-xl font-bold text-highlighted">
            {{ t(`landing.method.steps.${step}.title`) }}
          </h3>
          <p class="mt-1 text-base leading-relaxed text-muted">
            {{ t(`landing.method.steps.${step}.text`) }}
          </p>
        </div>
      </li>
    </ol>
    <NuxtLink :to="walkthrough" class="mt-10 inline-block font-medium text-primary hover:underline">
      {{ t("landing.method.cta") }}
    </NuxtLink>
  </section>
</template>
