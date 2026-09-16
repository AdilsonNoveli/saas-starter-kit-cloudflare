<template>
  <section id="use-cases" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative overflow-hidden">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-emerald-400" />
              <span>{{ $t("landing.useCases.badge") }}</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          {{ $t("landing.useCases.title") }}
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          {{ $t("landing.useCases.subtitle") }}
        </p>
      </div>

      <!-- Grid of 6 SaaS Application Archetypes -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-16">
        <div
          v-for="useCase in useCases"
          :key="useCase.id"
          class="flex flex-col justify-between rounded-xl border border-default bg-elevated p-6 sm:p-7 hover:border-accented transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 group"
        >
          <div>
            <!-- Top: Icon & Category Badge -->
            <div class="flex items-center justify-between gap-4 mb-4">
              <div
                class="w-12 h-12 rounded-lg flex items-center justify-center border transition-colors shrink-0"
                :class="useCase.iconContainerClass"
              >
                <UIcon :name="useCase.icon" class="w-6 h-6" :class="useCase.iconClass" />
              </div>
              <span class="text-[10px] sm:text-xs font-mono uppercase tracking-wider font-semibold px-2.5 py-1 rounded bg-muted border border-default text-muted">
                {{ t(`landing.useCases.items.${useCase.id}.category`) }}
              </span>
            </div>

            <!-- Title & Pitch -->
            <h3 class="text-lg sm:text-xl font-bold text-highlighted mb-2.5 group-hover:text-emerald-500 transition-colors">
              {{ t(`landing.useCases.items.${useCase.id}.title`) }}
            </h3>

            <p class="text-sm text-muted leading-relaxed mb-5">
              {{ t(`landing.useCases.items.${useCase.id}.description`) }}
            </p>

            <!-- Examples Pill List -->
            <div class="mb-5">
              <span class="text-xs font-semibold text-dimmed block mb-2 font-mono uppercase tracking-wider">
                {{ $t("landing.useCases.examplesLabel") }}
              </span>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="example in EXAMPLE_SLOTS"
                  :key="example"
                  class="text-xs px-2.5 py-0.5 rounded-full bg-muted border border-default text-toned font-medium"
                >
                  {{ t(`landing.useCases.items.${useCase.id}.examples.${example}`) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Superpower Box -->
          <div class="pt-4 border-t border-default mt-auto">
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-check-circle-2" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span class="text-xs font-semibold text-highlighted block">{{ $t("landing.useCases.superpowerLabel") }}</span>
                <span class="text-xs text-muted leading-tight block">{{ t(`landing.useCases.items.${useCase.id}.superpower`) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pre-banner Strategic Question -->
      <div class="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
        <h3 class="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-highlighted leading-snug">
          {{ $t("landing.useCases.banner.preTitle") }}
        </h3>
      </div>

      <!-- Trust & ROI Value Banner -->
      <div class="max-w-5xl mx-auto rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-elevated to-elevated dark:from-emerald-950/20 dark:via-night-900/60 dark:to-night-950 p-8 sm:p-10 text-center relative overflow-hidden shadow-xl shadow-emerald-500/5">
        <div class="relative z-10">
          <UBadge color="success" variant="subtle" size="md" class="mb-4">
            <span class="font-mono text-xs uppercase tracking-wider font-semibold">{{ $t("landing.useCases.banner.badge") }}</span>
          </UBadge>

          <h3 class="text-2xl sm:text-3xl font-extrabold text-highlighted mb-4">
            {{ $t("landing.useCases.banner.title") }}
          </h3>

          <p class="text-muted text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            {{ $t("landing.useCases.banner.descriptionLead") }}<strong class="text-highlighted">{{ $t("landing.useCases.banner.descriptionCost") }}</strong>{{ $t("landing.useCases.banner.descriptionTail") }}<br class="hidden sm:inline" />
            <code class="text-emerald-600 dark:text-emerald-400 font-mono text-xs bg-muted border border-default px-2 py-0.5 rounded whitespace-nowrap">$ bun run deploy</code>.
          </p>

          <!-- 2 Columns: Modo Stage vs. Modo Production (Clear & Clean) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-left mb-8 max-w-4xl mx-auto">
            <!-- Coluna 1: Modo Stage -->
            <div class="p-5 sm:p-6 rounded-xl bg-default/80 border border-default shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <h4 class="text-base font-bold text-highlighted font-mono">
                      {{ $t("landing.useCases.banner.environments.stage.title") }}
                    </h4>
                  </div>
                  <span class="text-[11px] font-mono text-amber-500/90 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    {{ $t("landing.useCases.banner.environments.stage.badge") }}
                  </span>
                </div>
                <p class="text-xs sm:text-sm text-muted leading-relaxed mb-4">
                  {{ $t("landing.useCases.banner.environments.stage.description") }}
                </p>
              </div>
              <div class="pt-3 border-t border-default/60 flex items-center gap-2 text-[11px] font-mono text-muted">
                <UIcon name="i-lucide-terminal" class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <code>{{ $t("landing.useCases.banner.environments.stage.command") }}</code>
              </div>
            </div>

            <!-- Coluna 2: Modo Production -->
            <div class="p-5 sm:p-6 rounded-xl bg-default/80 border border-emerald-500/30 shadow-xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <h4 class="text-base font-bold text-highlighted font-mono">
                      {{ $t("landing.useCases.banner.environments.prod.title") }}
                    </h4>
                  </div>
                  <span class="text-[11px] font-mono text-emerald-500/90 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {{ $t("landing.useCases.banner.environments.prod.badge") }}
                  </span>
                </div>
                <p class="text-xs sm:text-sm text-muted leading-relaxed mb-4">
                  {{ $t("landing.useCases.banner.environments.prod.description") }}
                </p>
              </div>
              <div class="pt-3 border-t border-default/60 flex items-center gap-2 text-[11px] font-mono text-muted">
                <UIcon name="i-lucide-terminal" class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <code>{{ $t("landing.useCases.banner.environments.prod.command") }}</code>
              </div>
            </div>
          </div>

          <!-- Bottom Action Button: Single prominent CTA to #pricing -->
          <div class="flex items-center justify-center">
            <CTAButton
              :to="`${localePath('/')}#pricing`"
              size="lg"
              radius="lg"
              trailing-icon="i-lucide-arrow-right"
              class="w-full sm:w-auto px-8"
            >
              {{ $t("landing.useCases.banner.ctaPrimary") }}
            </CTAButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

// Presentation only — every string lives under `landing.useCases.items.<id>.*`
// in the locale files, keyed by `id`.
const useCases = [
  {
    id: "b2b",
    icon: "i-lucide-building-2",
    iconContainerClass: "border-emerald-500/30 bg-emerald-500/10",
    iconClass: "text-emerald-400",
  },
  {
    id: "realtime",
    icon: "i-lucide-zap",
    iconContainerClass: "border-teal-500/30 bg-teal-500/10",
    iconClass: "text-teal-400",
  },
  {
    id: "ai",
    icon: "i-lucide-bot",
    iconContainerClass: "border-purple-500/30 bg-purple-500/10",
    iconClass: "text-purple-400",
  },
  {
    id: "micro",
    icon: "i-lucide-credit-card",
    iconContainerClass: "border-sky-500/30 bg-sky-500/10",
    iconClass: "text-sky-400",
  },
  {
    id: "enterprise",
    icon: "i-lucide-shield-check",
    iconContainerClass: "border-amber-500/30 bg-amber-500/10",
    iconClass: "text-amber-400",
  },
  {
    id: "api",
    icon: "i-lucide-activity",
    iconContainerClass: "border-orange-500/30 bg-orange-500/10",
    iconClass: "text-orange-400",
  },
];

// Each use case has exactly four product examples, stored as numbered keys
// (`examples.1` … `examples.4`) rather than a JSON array so that
// scripts/check-i18n-completeness.ts can diff them key-by-key across locales.
const EXAMPLE_SLOTS = ["1", "2", "3", "4"];
</script>
