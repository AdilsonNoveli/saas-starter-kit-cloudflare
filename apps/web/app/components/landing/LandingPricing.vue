<template>
  <section id="pricing" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative">
    <div class="mx-auto w-full max-w-5xl">
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

      <!-- Modern Enterprise Pricing Card -->
      <div class="max-w-xl mx-auto rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-elevated via-elevated to-muted/40 dark:from-night-900 dark:via-night-950 dark:to-night-950 p-7 sm:p-10 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
        <!-- Top Accent Glow Line -->
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />

        <!-- Card Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 class="text-2xl font-black text-highlighted tracking-tight">
              {{ $t("landing.pricing.cardTitle") }}
            </h3>
            <p class="text-sm text-muted mt-1">
              {{ $t("landing.pricing.cardSubtitle") }}
            </p>
          </div>
          <span class="inline-flex items-center text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
            {{ $t("landing.pricing.lifetimeAccess") }}
          </span>
        </div>

        <!-- Price Display with Transparent Early Bird Justification -->
        <div class="p-5 rounded-xl bg-muted/40 border border-default mb-8 flex flex-col sm:flex-row items-baseline justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {{ $t("landing.pricing.earlyBirdBadge") }}
              </span>
            </div>
            <div class="flex items-baseline gap-3">
              <span class="text-2xl sm:text-3xl text-neutral-400 dark:text-neutral-500 line-through font-bold">
                $79
              </span>
              <span class="text-5xl sm:text-6xl font-black text-highlighted tracking-tight">
                $49
              </span>
              <span class="text-sm font-semibold text-muted">
                USD
              </span>
            </div>
          </div>
          <div class="text-left sm:text-right">
            <span class="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold block">
              {{ $t("landing.pricing.oneTimePayment") }}
            </span>
            <span class="text-[11px] text-muted block">
              {{ $t("landing.pricing.neverMonthly") }}
            </span>
            <span class="text-[10px] text-dimmed block mt-0.5">
              {{ $t("landing.pricing.earlyBirdNote") }}
            </span>
          </div>
        </div>

        <!-- What You Get (Clean, High-Value Checklist) -->
        <div class="space-y-3.5 mb-8">
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-dimmed block mb-4">
            {{ $t("landing.pricing.includedTitle") }}
          </span>

          <div
            v-for="feature in includedFeatures"
            :key="feature"
            class="flex items-start gap-3"
          >
            <UIcon
              name="i-lucide-check"
              class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
            />
            <span class="text-sm text-default font-medium leading-tight">
              <strong class="text-highlighted font-semibold">{{ t(`landing.pricing.features.${feature}.highlight`) }}</strong>
              <span class="text-muted font-normal"> — {{ t(`landing.pricing.features.${feature}.text`) }}</span>
            </span>
          </div>
        </div>

        <!-- CTA Action Button (Existing Model Button) -->
        <div class="mb-5">
          <CTAButton
            :to="signupUrl"
            size="lg"
            radius="lg"
            block
            trailing-icon="i-lucide-arrow-right"
          >
            {{ $t("landing.pricing.cta") }}
          </CTAButton>
        </div>

        <!-- Trust Badges / Guarantees -->
        <div class="pt-4 border-t border-default text-center">
          <p class="text-xs text-muted flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5 text-emerald-500" />
              {{ $t("landing.pricing.guarantee.refund") }}
            </span>
            <span class="hidden sm:inline">•</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-code-2" class="w-3.5 h-3.5 text-emerald-500" />
              {{ $t("landing.pricing.guarantee.projects") }}
            </span>
            <span class="hidden sm:inline">•</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-zap" class="w-3.5 h-3.5 text-emerald-500" />
              {{ $t("landing.pricing.guarantee.github") }}
            </span>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const config = useRuntimeConfig();
const signupUrl = computed(() => config.public.appUrl || localePath("/signup"));

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
