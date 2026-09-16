<template>
  <section id="pricing" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative">
    <div class="mx-auto w-full max-w-6xl">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-tag" class="w-4 h-4 text-emerald-400" />
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
            <!-- Left Column: Product Value, Feature Matrix & Embedded Club Bonus (lg:col-span-7) -->
            <div class="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div>
                <!-- Top Badges -->
                <div class="flex flex-wrap items-center gap-2 mb-4">
                  <span class="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5" />
                    <span>Monorepo Enterprise</span>
                  </span>
                  <span class="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <UIcon name="i-lucide-crown" class="w-3.5 h-3.5 text-amber-500" />
                    <span>Club Nuxfire Incluso</span>
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
                        class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                      />
                      <span class="text-xs sm:text-[13px] text-default leading-snug">
                        <strong class="text-highlighted font-semibold">{{ t(`landing.pricing.features.${feature}.highlight`) }}</strong>
                        <span class="text-muted font-normal"> — {{ t(`landing.pricing.features.${feature}.text`) }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Embedded Club Nuxfire Golden Bonus Box (Seamless, Clean & Integrated) -->
              <div class="rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 relative overflow-hidden shadow-xs">
                <!-- Subtle gold ambient glow -->
                <div class="absolute -right-10 -bottom-10 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div class="relative z-10">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div class="flex items-center gap-2">
                      <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <UIcon name="i-lucide-crown" class="w-4 h-4 text-amber-500" />
                      </span>
                      <h4 class="text-sm sm:text-base font-black text-highlighted uppercase tracking-wide">
                        {{ $t("landing.pricing.bonus.title") }}
                      </h4>
                    </div>
                    <span class="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 self-start sm:self-auto">
                      {{ $t("landing.pricing.bonus.badge") }} • 12 Meses
                    </span>
                  </div>

                  <p class="text-xs sm:text-sm text-muted leading-relaxed mb-3.5">
                    {{ $t("landing.pricing.bonus.descriptionLead") }}<strong class="text-highlighted">{{ $t("landing.pricing.bonus.descriptionStrong") }}</strong>{{ $t("landing.pricing.bonus.descriptionTail") }}
                  </p>

                  <!-- Bonus Deliverables (Tags / Chips) -->
                  <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-3.5">
                    <span
                      v-for="itemKey in bonusItems"
                      :key="itemKey"
                      class="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-elevated/80 border border-amber-500/25 text-highlighted flex items-center gap-1.5 shadow-2xs"
                    >
                      <span class="text-amber-500 text-[10px] font-bold">→</span>
                      <span :class="itemKey === 'more' ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''">{{ t(`landing.pricing.bonus.items.${itemKey}`) }}</span>
                    </span>
                  </div>

                  <!-- Footer Note: Ongoing Build -->
                  <div class="pt-2.5 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-muted">
                    <span>{{ $t("landing.pricing.bonus.ongoingDesc") }}</span>
                    <strong class="text-amber-600 dark:text-amber-400 font-semibold">{{ $t("landing.pricing.bonus.closingStrong") }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Checkout Box, Pricing, Solid Green CTA (lg:col-span-5) -->
            <div class="lg:col-span-5 rounded-2xl border border-emerald-500/30 bg-default/60 dark:bg-night-900/70 p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <!-- Top decorative accent line -->
              <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-400 to-emerald-500/20" />

              <div>
                <!-- Checkout Header -->
                <div class="flex items-center justify-between gap-2 mb-4">
                  <span class="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {{ $t("landing.pricing.earlyBirdBadge") }}
                  </span>
                  <span class="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {{ $t("landing.pricing.lifetimeAccess") }}
                  </span>
                </div>

                <!-- Price Numbers -->
                <div class="mb-6">
                  <div class="flex items-baseline gap-3">
                    <span class="text-2xl sm:text-3xl text-neutral-400 dark:text-neutral-500 line-through font-bold">
                      $79
                    </span>
                    <span class="text-5xl sm:text-6xl font-black text-highlighted tracking-tight font-mono">
                      $49
                    </span>
                    <span class="text-base font-bold text-muted">
                      USD
                    </span>
                  </div>
                  <p class="text-xs text-muted mt-1.5 font-medium">
                    {{ $t("landing.pricing.oneTimePayment") }} • <span class="text-highlighted font-semibold">{{ $t("landing.pricing.neverMonthly") }}</span>
                  </p>
                  <p class="text-[11px] text-dimmed mt-0.5">
                    {{ $t("landing.pricing.earlyBirdNote") }}
                  </p>
                </div>

                <!-- Immediate Value Highlights -->
                <div class="space-y-2.5 py-4 border-y border-default mb-6 text-xs text-muted">
                  <div class="flex items-center gap-2.5">
                    <UIcon name="i-lucide-check" class="w-4 h-4 text-emerald-500 shrink-0" />
                    <span class="text-highlighted font-medium">Acesso vitalício ao código-fonte completo</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <UIcon name="i-lucide-check" class="w-4 h-4 text-emerald-500 shrink-0" />
                    <span class="text-highlighted font-medium">1 ano de Club Nuxfire ativado automaticamente</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <UIcon name="i-lucide-check" class="w-4 h-4 text-emerald-500 shrink-0" />
                    <span class="text-highlighted font-medium">Download imediato na Área de Membros</span>
                  </div>
                </div>
              </div>

              <!-- Solid Green CTA Button + Guarantees -->
              <div>
                <!-- Solid Green CTA Button -->
                <NuxtLink
                  :to="signupUrl"
                  class="group w-full py-4 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-extrabold uppercase tracking-wider text-sm sm:text-base text-center shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2.5 select-none"
                >
                  <span>{{ $t("landing.pricing.cta") }}</span>
                  <UIcon name="i-lucide-arrow-right" class="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                </NuxtLink>

                <!-- Guarantees -->
                <div class="mt-4 pt-3.5 border-t border-default text-center">
                  <div class="text-xs text-muted flex flex-col items-center justify-center gap-2">
                    <span class="inline-flex items-center gap-1.5 font-medium">
                      <UIcon name="i-lucide-code-2" class="w-4 h-4 text-emerald-500 shrink-0" />
                      {{ $t("landing.pricing.guarantee.projects") }}
                    </span>
                    <span class="inline-flex items-center gap-1.5 font-medium">
                      <UIcon name="i-lucide-zap" class="w-4 h-4 text-emerald-500 shrink-0" />
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
const signupUrl = computed(() => config.public.appUrl || localePath("/signup"));

// Keys for bonus list
const bonusItems = [
  "modules",
  "updates",
  "apps",
  "prompts",
  "templates",
  "uiux",
  "resources",
  "more",
];

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
