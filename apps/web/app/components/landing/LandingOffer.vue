<script setup lang="ts">
const { t } = useI18n();
const { params, hasCheckout, checkoutUrl, whatsapp } = useOffer();

const included = ["source", "teams", "auth", "billing", "realtime", "admin", "kanban", "docs"];
const questions = ["needs", "commercial", "updates", "contact", "pay"];
</script>

<template>
  <section id="offer" aria-labelledby="landing-offer" class="container mx-auto max-w-3xl px-4 md:px-8 py-16 md:py-24 scroll-mt-16">
    <h2 id="landing-offer" class="text-pretty text-3xl sm:text-4xl font-extrabold tracking-tight text-highlighted">
      {{ t("landing.offer.title") }}
    </h2>

    <div class="mt-10 rounded-xl border border-default bg-elevated p-6 sm:p-10">
      <p class="text-sm font-semibold uppercase tracking-wider text-primary">
        {{ t("landing.offer.launchLabel", params) }}
      </p>
      <p class="mt-2 text-5xl sm:text-6xl font-extrabold tracking-tight text-highlighted">
        {{ params.launch }}
      </p>
      <p class="mt-2 text-base text-muted">
        {{ t("landing.offer.regularLabel", params) }} · {{ t("landing.offer.payOnce") }} · {{ t("landing.offer.updates", params) }}
      </p>

      <h3 class="mt-10 text-lg font-bold text-highlighted">
        {{ t("landing.offer.includedTitle") }}
      </h3>
      <ul class="mt-4 grid gap-3 sm:grid-cols-2 list-none p-0">
        <li v-for="item in included" :key="item" class="flex gap-3 text-base text-default">
          <UIcon name="i-lucide-check" class="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
          <span>{{ t(`landing.offer.included.${item}`) }}</span>
        </li>
      </ul>

      <div class="mt-10">
        <CTAButton v-if="hasCheckout" :href="checkoutUrl" size="lg" radius="lg" trailing-icon="i-lucide-arrow-right">
          {{ t("landing.offer.cta", params) }}
        </CTAButton>
        <p v-else class="text-base font-semibold text-muted" role="status">
          {{ t("landing.offer.ctaSoon") }}
        </p>
        <p class="mt-4 text-sm text-muted">{{ t("landing.offer.payment") }}</p>
      </div>
    </div>

    <p class="mt-8 text-sm leading-relaxed text-muted">
      {{ t("landing.offer.license") }}
      <NuxtLink to="/license" class="font-medium text-primary hover:underline">{{ t("landing.offer.licenseLink") }}</NuxtLink>
    </p>
    <p class="mt-3 text-sm leading-relaxed text-muted">
      {{ t("landing.offer.refund") }}
    </p>

    <div class="mt-16">
      <h3 class="text-2xl font-bold text-highlighted">{{ t("landing.offer.talkTitle") }}</h3>
      <p class="mt-2 text-base leading-relaxed text-muted">{{ t("landing.offer.talkText") }}</p>
      <UButton
        :href="whatsapp(t('landing.offer.talkMessage'))"
        target="_blank"
        rel="noopener"
        color="neutral"
        variant="outline"
        size="lg"
        icon="i-lucide-message-circle"
        class="mt-5"
      >
        {{ t("landing.offer.talkCta") }}
      </UButton>
    </div>

    <div class="mt-20">
      <h3 class="text-2xl font-bold text-highlighted">{{ t("landing.faq.title") }}</h3>
      <div class="mt-6 divide-y divide-default border-y border-default">
        <details v-for="question in questions" :key="question" class="group py-4">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-base sm:text-lg font-medium text-highlighted">
            <span>{{ t(`landing.faq.items.${question}.question`) }}</span>
            <UIcon name="i-lucide-plus" class="size-5 shrink-0 text-muted group-open:rotate-45 transition-transform" aria-hidden="true" />
          </summary>
          <p class="mt-3 text-base leading-relaxed text-muted">
            {{ t(`landing.faq.items.${question}.answer`, params) }}
          </p>
        </details>
      </div>
    </div>
  </section>
</template>
