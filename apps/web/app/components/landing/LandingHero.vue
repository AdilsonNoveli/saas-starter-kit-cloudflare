<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const { hasCheckout, checkoutUrl, whatsapp } = useOffer();

const primary = computed(() => (hasCheckout.value ? { href: checkoutUrl.value } : { to: `${localePath("/")}#offer` }));
</script>

<template>
  <section class="relative overflow-hidden">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" aria-hidden="true" />

    <div class="relative container mx-auto max-w-5xl px-4 md:px-8 pt-16 pb-20 lg:pt-28 lg:pb-28 text-center flex flex-col items-center">
      <!-- Pill Badge -->
      <span class="inline-flex items-center gap-2 rounded-full border border-default bg-elevated/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted">
        <span class="size-1.5 rounded-full bg-success" aria-hidden="true" />
        {{ t("landing.hero.badge") }}
      </span>

      <!-- Main Headline (Centered) -->
      <h1 class="mt-6 text-pretty text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.06] text-highlighted max-w-4xl">
        {{ t("landing.hero.title") }}
      </h1>

      <!-- Subtitle (Centered) -->
      <p class="mt-6 text-base sm:text-lg lg:text-xl leading-relaxed text-muted max-w-3xl">
        {{ t("landing.hero.subtitle") }}
      </p>

      <!-- CTA Action Buttons (Equal size & balanced) -->
      <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
        <CTAButton
          v-bind="primary"
          color="green"
          size="md"
          radius="lg"
          trailing-icon="i-lucide-arrow-right"
          class="w-full sm:w-[240px] h-12 text-sm justify-center"
        >
          {{ t("landing.hero.cta") }}
        </CTAButton>
        <UButton
          :href="whatsapp(t('landing.offer.talkMessage'))"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="outline"
          size="lg"
          icon="i-lucide-message-circle"
          class="w-full sm:w-[240px] h-12 justify-center rounded-xl font-bold uppercase tracking-wider text-sm border-default hover:bg-elevated/80 transition-colors"
        >
          {{ t("landing.hero.ctaTalk") }}
        </UButton>
      </div>
    </div>
  </section>
</template>
