<template>
  <section id="pricing" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative">
    <div class="mx-auto w-full max-w-6xl">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-success" />
              <span>{{ $t("landing.pricing.badge") }}</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          {{ $t("landing.pricing.title") }}
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          {{ $t("landing.pricing.subtitle") }}
        </p>
      </div>

      <!-- Masterpiece Unified Horizontal Pricing Card (Bento / Wide Architecture) -->
      <div class="pricing-card-animated max-w-6xl mx-auto">
        <div class="rounded-[22px] bg-elevated/95 dark:bg-night-950/95 backdrop-blur-xl p-6 sm:p-8 lg:p-10 w-full">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <!-- Left Column: Product Value & Feature Matrix (lg:col-span-7) -->
            <div class="lg:col-span-7 flex flex-col justify-between">
              <div>
                <!-- Top Badges -->
                <div class="flex flex-wrap items-center gap-2 mb-4">
                  <span class="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-success/10 text-success border border-success/30">
                    <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5" />
                    <span>Monorepo Enterprise</span>
                  </span>
                </div>

                <!-- Product Heading -->
                <h3 class="text-2xl sm:text-3xl font-black text-highlighted tracking-tight leading-tight mb-2">
                  {{ $t("landing.pricing.cardTitle") }}
                </h3>
                <p class="text-sm sm:text-base text-muted leading-relaxed mb-6">
                  {{ $t("landing.pricing.cardSubtitle") }}
                </p>

                <!-- 2-Column Feature Checklist -->
                <div>
                  <span class="text-xs font-mono font-bold uppercase tracking-wider text-dimmed block mb-3.5">
                    {{ $t("landing.pricing.includedTitle") }}
                  </span>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div
                      v-for="feature in includedFeatures"
                      :key="feature"
                      class="flex items-start gap-2.5"
                    >
                      <UIcon
                        name="i-lucide-check-circle-2"
                        class="w-4 h-4 text-success shrink-0 mt-0.5"
                      />
                      <span class="text-xs sm:text-[13px] text-default leading-snug">
                        <strong class="text-highlighted font-semibold">{{ t(`landing.pricing.features.${feature}.highlight`) }}</strong>
                        <span class="text-muted font-normal"> — {{ t(`landing.pricing.features.${feature}.text`) }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Checkout Box, Pricing, Bonus Callout & Darker Green CTA (lg:col-span-5) -->
            <div class="lg:col-span-5 rounded-2xl border border-success/30 bg-default/60 dark:bg-night-900/70 p-6 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <!-- Top decorative accent line -->
              <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-success/20 via-success to-success/20" />

              <div>
                <!-- Checkout Header -->
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30">
                    {{ $t("landing.pricing.earlyBirdBadge") }}
                  </span>
                  <span class="text-[11px] font-mono font-bold text-success uppercase tracking-wider">
                    {{ $t("landing.pricing.lifetimeAccess") }}
                  </span>
                </div>

                <!-- Price Numbers (temporarily commented out per request) -->
                <!--
                <div class="mb-4">
                  <div class="flex items-baseline gap-3">
                    <span class="text-2xl sm:text-3xl text-dimmed line-through font-bold">
                      $79
                    </span>
                    <span class="text-5xl sm:text-6xl font-black text-highlighted tracking-tight font-mono">
                      $49
                    </span>
                    <span class="text-base font-bold text-muted">
                      USD
                    </span>
                  </div>
                  <p class="text-xs text-muted mt-1 font-medium">
                    {{ $t("landing.pricing.oneTimePayment") }} • <span class="text-highlighted font-semibold">{{ $t("landing.pricing.neverMonthly") }}</span>
                  </p>
                  <p class="text-[11px] text-dimmed mt-0.5">
                    {{ $t("landing.pricing.earlyBirdNote") }}
                  </p>
                </div>
                -->

                <!-- High-Converting Clear & Optimized Bonus Callout Box -->
                <div class="mb-4 rounded-xl border border-warning/35 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-3 sm:p-3.5 transition-all shadow-2xs">
                  <div class="flex flex-wrap items-center justify-between gap-1.5">
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-lucide-crown" class="w-4 h-4 text-warning shrink-0" />
                      <span class="text-[11px] sm:text-xs font-black uppercase tracking-wider text-highlighted">
                        {{ $t("landing.pricing.bonusCallout.title") }}
                      </span>
                    </div>
                    <span class="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30 shrink-0">
                      {{ $t("landing.pricing.bonusCallout.badge") }}
                    </span>
                  </div>

                  <!-- Indicator button that opens the information -->
                  <button
                    type="button"
                    @click="isBonusInfoOpen = !isBonusInfoOpen"
                    class="mt-2.5 pt-2 border-t border-warning/20 w-full flex items-center justify-between text-left text-xs text-warning hover:text-warning/90 font-medium transition-colors cursor-pointer select-none group"
                    :aria-expanded="isBonusInfoOpen"
                  >
                    <span class="flex items-center gap-1.5 text-[11px] sm:text-xs">
                      <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5 text-warning shrink-0" />
                      <span>{{ $t("landing.pricing.bonusCallout.label") }}</span>
                    </span>
                    <span class="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted group-hover:text-default">
                      <span>{{ isBonusInfoOpen ? $t("landing.pricing.bonusCallout.hide") : $t("landing.pricing.bonusCallout.details") }}</span>
                      <UIcon
                        name="i-lucide-chevron-down"
                        class="w-3.5 h-3.5 transition-transform duration-200"
                        :class="{ 'rotate-180': isBonusInfoOpen }"
                      />
                    </span>
                  </button>

                  <!-- Expandable Bonus Details -->
                  <div
                    v-show="isBonusInfoOpen"
                    class="mt-2 pt-2 border-t border-warning/15 text-[11px] sm:text-xs text-muted leading-relaxed"
                  >
                    <p>
                      {{ $t("landing.pricing.bonusCallout.info") }}
                    </p>
                  </div>
                </div>

                <!-- Immediate Value Highlights -->
                <div class="space-y-2 py-3 border-y border-default mb-4 text-xs text-muted">
                  <div class="flex items-center gap-2.5">
                    <UIcon name="i-lucide-check" class="w-4 h-4 text-success shrink-0" />
                    <span class="text-highlighted font-medium">{{ $t("landing.pricing.checkmarks.sourceCode") }}</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <UIcon name="i-lucide-check" class="w-4 h-4 text-success shrink-0" />
                    <span class="text-highlighted font-medium">{{ $t("landing.pricing.checkmarks.instantDownload") }}</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <UIcon name="i-lucide-check" class="w-4 h-4 text-success shrink-0" />
                    <span class="text-highlighted font-medium">{{ $t("landing.pricing.checkmarks.noSubscription") }}</span>
                  </div>
                </div>

                <!-- Clean Direct Note Above CTA -->
                <div class="mb-4 text-left">
                  <h4 class="text-xs sm:text-sm font-bold text-highlighted leading-snug">
                    {{ $t("landing.pricing.groupCallout.headline") }}
                  </h4>
                  <p class="text-[11px] sm:text-xs text-muted mt-1 leading-relaxed">
                    {{ $t("landing.pricing.groupCallout.text") }}
                  </p>
                </div>
              </div>

              <!-- Solid Darker Green CTA Button + Guarantees -->
              <div>
                <!-- Solid Darker Green CTA Button -->
                <NuxtLink
                  :to="ctaUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group w-full py-3.5 sm:py-4 px-6 rounded-xl bg-success hover:bg-success/90 active:bg-success text-night-800 font-extrabold uppercase tracking-wider text-sm sm:text-base text-center shadow-lg shadow-success/25 hover:shadow-success/35 transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2.5 select-none"
                >
                  <span>{{ $t("landing.pricing.cta") }}</span>
                  <UIcon name="i-lucide-arrow-right" class="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                </NuxtLink>

                <!-- Guarantees -->
                <div class="mt-3.5 pt-3 border-t border-default text-center">
                  <div class="text-xs text-muted flex flex-col items-center justify-center gap-1.5">
                    <span class="inline-flex items-center gap-1.5 font-medium">
                      <UIcon name="i-lucide-code-2" class="w-4 h-4 text-success shrink-0" />
                      {{ $t("landing.pricing.guarantee.projects") }}
                    </span>
                    <span class="inline-flex items-center gap-1.5 font-medium">
                      <UIcon name="i-lucide-zap" class="w-4 h-4 text-success shrink-0" />
                      {{ $t("landing.pricing.guarantee.github") }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Post-Pricing Strategic Headline -->
      <div class="mt-12 lg:mt-16 text-center max-w-3xl mx-auto px-4">
        <p class="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-highlighted leading-relaxed">
          {{ $t("landing.pricing.closingHeadline") }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const config = useRuntimeConfig();
const ctaUrl = computed(() => t("landing.pricing.ctaUrl") || config.public.appUrl || localePath("/signup"));

const isBonusInfoOpen = ref(false);

// Key suffixes under `landing.pricing.features.*`; each resolves to a
// `{ highlight, text }` pair in the locale files.
const includedFeatures = [
  "monorepo",
  "multiTenancy",
  "auth",
  "realtime",
  "queues",
  "billing",
  "email",
  "admin",
  "database",
  "storage",
  "kanban",
  "updates",
];
</script>
