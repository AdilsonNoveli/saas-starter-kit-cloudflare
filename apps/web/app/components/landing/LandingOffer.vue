<script setup lang="ts">
const { t } = useI18n();
const { params, hasCheckout, checkoutUrl, whatsapp } = useOffer();

const included = ["source", "teams", "auth", "billing", "realtime", "admin", "kanban", "docs"];
const questions = ["needs", "commercial", "updates", "contact", "pay"];
</script>

<template>
  <section id="offer" aria-labelledby="landing-offer" class="bg-elevated/40 scroll-mt-16">
    <div class="container mx-auto max-w-6xl px-4 md:px-8 py-20 md:py-28">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-primary">{{ t("landing.offer.eyebrow") }}</p>
        <h2 id="landing-offer" class="mt-3 text-pretty text-4xl sm:text-5xl font-extrabold tracking-tight text-highlighted">
          {{ t("landing.offer.title") }}
        </h2>
      </div>

      <div class="pricing-card-animated mx-auto mt-14 max-w-5xl">
        <div class="rounded-[22px] bg-default p-6 sm:p-10 lg:p-12">
          <div class="grid gap-12 lg:grid-cols-12 lg:gap-14">
            <div class="lg:col-span-7">
              <h3 class="text-lg font-bold text-highlighted">
                {{ t("landing.offer.includedTitle") }}
              </h3>
              <ul class="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 list-none p-0">
                <li v-for="item in included" :key="item" class="flex gap-3 text-base text-default">
                  <UIcon name="i-lucide-circle-check" class="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                  <span>{{ t(`landing.offer.included.${item}`) }}</span>
                </li>
              </ul>
              <p class="mt-8 text-sm leading-relaxed text-muted">
                {{ t("landing.offer.license") }}
                <NuxtLink to="/license" class="font-medium text-primary hover:underline">{{ t("landing.offer.licenseLink") }}</NuxtLink>
              </p>
            </div>

            <div class="lg:col-span-5 lg:border-l lg:border-default lg:pl-12">
              <p class="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                {{ t("landing.offer.launchLabel", params) }}
              </p>
              <p class="mt-5 text-6xl font-extrabold tracking-tight text-highlighted">
                {{ params.launch }}
              </p>
              <p class="mt-2 text-base text-muted">
                {{ t("landing.offer.regularLabel", params) }}
              </p>
              <p class="mt-1 text-base text-muted">
                {{ t("landing.offer.payOnce") }} · {{ t("landing.offer.updates", params) }}
              </p>

              <div class="mt-8">
                <CTAButton v-if="hasCheckout" :href="checkoutUrl" size="xl" radius="lg" block trailing-icon="i-lucide-arrow-right">
                  {{ t("landing.offer.cta", params) }}
                </CTAButton>
                <p
                  v-else
                  class="rounded-lg border border-default bg-elevated px-5 py-4 text-center text-base font-semibold text-muted"
                  role="status"
                >
                  {{ t("landing.offer.ctaSoon") }}
                </p>
                <p class="mt-4 text-sm text-muted">{{ t("landing.offer.payment") }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p class="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-muted">
        {{ t("landing.offer.refund") }}
      </p>

      <div class="mx-auto mt-20 grid max-w-5xl gap-14 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <h3 class="text-2xl font-bold text-highlighted">{{ t("landing.offer.talkTitle") }}</h3>
          <p class="mt-3 text-base leading-relaxed text-muted">{{ t("landing.offer.talkText") }}</p>
          <UButton
            :href="whatsapp(t('landing.offer.talkMessage'))"
            target="_blank"
            rel="noopener"
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-lucide-message-circle"
            class="mt-6 h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-sm border-default hover:bg-elevated/80 transition-colors"
          >
            {{ t("landing.offer.talkCta") }}
          </UButton>
        </div>

        <div class="lg:col-span-7">
          <h3 class="text-2xl font-bold text-highlighted">{{ t("landing.faq.title") }}</h3>
          <div class="mt-6 divide-y divide-default border-y border-default">
            <details v-for="question in questions" :key="question" class="group py-4">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-base sm:text-lg font-medium text-highlighted">
                <span>{{ t(`landing.faq.items.${question}.question`) }}</span>
                <UIcon name="i-lucide-plus" class="size-5 shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p class="mt-3 text-base leading-relaxed text-muted">
                {{ t(`landing.faq.items.${question}.answer`, params) }}
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
