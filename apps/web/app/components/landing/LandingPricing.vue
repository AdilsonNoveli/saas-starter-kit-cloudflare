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

      <!-- Twin Cards Container: Bonus Card (Left, Colado Atrás, Amarelo Ouro) & Pricing Card (Right, Emerald, Focal) -->
      <div class="flex flex-col lg:flex-row items-center lg:items-stretch justify-center max-w-6xl mx-auto gap-6 lg:gap-0">
        <!-- Left: Bonus Card - Club Nuxfire (Golden Yellow, Tucked Behind) -->
        <div class="w-full lg:w-[480px] xl:w-[500px] rounded-2xl border border-amber-500/40 dark:border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-elevated to-muted/40 dark:from-amber-950/25 dark:via-night-900/90 dark:to-night-950 p-6 sm:p-8 lg:p-9 shadow-xl shadow-amber-500/5 relative lg:z-0 lg:-mr-6 lg:my-6 flex flex-col justify-between overflow-hidden">
          <!-- Top Accent Glow Line -->
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500/20 via-amber-400 to-amber-500/20" />

          <div>
            <!-- Badge & Crown Icon -->
            <div class="flex items-center justify-between gap-3 mb-4">
              <span class="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <UIcon name="i-lucide-crown" class="w-4 h-4 text-amber-500" />
                {{ $t("landing.pricing.bonus.badge") }}
              </span>
              <span class="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                12 Meses
              </span>
            </div>

            <!-- Title -->
            <h3 class="text-xl sm:text-2xl font-black text-highlighted tracking-tight leading-tight">
              {{ $t("landing.pricing.bonus.title") }}
            </h3>

            <!-- Intro / Description -->
            <p class="text-sm font-semibold text-highlighted mt-2.5">
              {{ $t("landing.pricing.bonus.subtitle") }}
            </p>
            <p class="text-xs sm:text-sm text-muted leading-relaxed mt-1">
              {{ $t("landing.pricing.bonus.descriptionLead") }}<strong class="text-highlighted">{{ $t("landing.pricing.bonus.descriptionStrong") }}</strong>{{ $t("landing.pricing.bonus.descriptionTail") }}
            </p>

            <!-- Access List -->
            <div class="mt-5 pt-4 border-t border-amber-500/20">
              <span class="text-xs font-bold font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-2.5">
                {{ $t("landing.pricing.bonus.accessTitle") }}
              </span>
              <ul class="space-y-1.5 text-xs sm:text-[13px] text-muted">
                <li v-for="itemKey in bonusItems" :key="itemKey" class="flex items-center gap-2">
                  <span class="text-amber-500 font-bold shrink-0">→</span>
                  <span :class="itemKey === 'more' ? 'font-semibold text-amber-600 dark:text-amber-400' : 'font-medium text-highlighted'">
                    {{ t(`landing.pricing.bonus.items.${itemKey}`) }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Bottom Value Callout: O conteúdo continua sendo construído -->
          <div class="mt-6 pt-3.5 border-t border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-500/20">
            <span class="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-0.5">
              {{ $t("landing.pricing.bonus.bestPart") }}
            </span>
            <h4 class="text-xs sm:text-sm font-bold text-highlighted">
              {{ $t("landing.pricing.bonus.ongoingTitle") }}
            </h4>
            <p class="text-[11px] sm:text-xs text-muted mt-1 leading-relaxed">
              {{ $t("landing.pricing.bonus.ongoingDesc") }}
            </p>
            <p class="text-xs font-semibold text-highlighted mt-2">
              {{ $t("landing.pricing.bonus.timeline") }}
            </p>
            <p class="text-[11px] text-muted mt-0.5">
              {{ $t("landing.pricing.bonus.closingLead") }}<strong class="text-amber-600 dark:text-amber-400">{{ $t("landing.pricing.bonus.closingStrong") }}</strong>
            </p>
          </div>
        </div>

        <!-- Right: Modern Enterprise Pricing Card (Focal, Elevated, Forward) -->
        <div class="w-full lg:w-[500px] xl:w-[520px] rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-b from-elevated via-elevated to-muted/40 dark:from-night-900 dark:via-night-950 dark:to-night-950 p-7 sm:p-10 shadow-2xl shadow-emerald-500/15 relative z-10 overflow-hidden flex flex-col justify-between">
          <!-- Top Accent Glow Line -->
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />

          <div>
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
          </div>

          <!-- Bottom CTA & Trust Badges -->
          <div>
            <!-- CTA Action Button -->
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
