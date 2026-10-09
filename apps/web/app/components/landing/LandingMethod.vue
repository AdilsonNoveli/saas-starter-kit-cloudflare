<script setup lang="ts">
const { t } = useI18n();

const steps = [
  { key: "idea", icon: "i-lucide-lightbulb" },
  { key: "spec", icon: "i-lucide-file-check-2" },
  { key: "ship", icon: "i-lucide-rocket" },
];
const walkthrough = "/docs/fireskills/getting-started/workflow";
</script>

<template>
  <section aria-labelledby="landing-method" class="bg-elevated/40">
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

      <!-- Enhanced Steps 1, 2, 3: Modern, Enterprise-Grade, Cardless/Clean-Border Flow -->
      <ol class="mt-16 grid gap-6 md:grid-cols-3 list-none p-0">
        <li
          v-for="(step, index) in steps"
          :key="step.key"
          class="relative flex flex-col p-6 sm:p-8 rounded-2xl border border-default/80 bg-elevated/50 hover:border-accented transition-colors duration-200"
        >
          <!-- Step indicator header -->
          <div class="flex items-center justify-between mb-6">
            <span class="inline-flex items-center justify-center size-11 rounded-xl border border-default bg-elevated font-mono text-sm font-bold text-highlighted">
              0{{ index + 1 }}
            </span>
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="step.icon" class="size-5" aria-hidden="true" />
            </div>
          </div>

          <!-- Step title & text -->
          <h3 class="text-xl font-bold text-highlighted tracking-tight">
            {{ t(`landing.method.steps.${step.key}.title`) }}
          </h3>
          <p class="mt-3 text-base leading-relaxed text-muted">
            {{ t(`landing.method.steps.${step.key}.text`) }}
          </p>
        </li>
      </ol>

      <div class="mt-14 text-center">
        <UButton
          :to="walkthrough"
          color="neutral"
          variant="outline"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          class="h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-sm border-default hover:bg-elevated/80 transition-colors"
        >
          {{ t("landing.method.cta") }}
        </UButton>
      </div>
    </div>
  </section>
</template>
