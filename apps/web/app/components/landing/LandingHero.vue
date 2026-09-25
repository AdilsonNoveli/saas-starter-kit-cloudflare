<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const { params, hasCheckout, checkoutUrl, whatsapp } = useOffer();

// The real structure of the repository and the real deploy command (layers/, apps/, `bun run deploy`).
const tree = ["layers/", "  admin/  billing/  kanban/", "  notifications/  teams/", "apps/", "  web/  app/  login/  functions/", "", "$ bun run deploy"];

const primary = computed(() => (hasCheckout.value ? { href: checkoutUrl.value } : { to: `${localePath("/")}#offer` }));
</script>

<template>
  <section class="container mx-auto max-w-5xl px-4 md:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
    <div class="grid gap-12 lg:grid-cols-5 lg:gap-16 items-center">
      <div class="lg:col-span-3">
        <h1 class="text-pretty text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-highlighted">
          {{ t("landing.hero.title") }}
        </h1>
        <p class="mt-6 text-lg sm:text-xl leading-relaxed text-muted max-w-2xl">
          {{ t("landing.hero.subtitle") }}
        </p>
        <div class="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <CTAButton v-bind="primary" size="lg" radius="lg" trailing-icon="i-lucide-arrow-right">
            {{ t("landing.hero.cta") }}
          </CTAButton>
          <UButton
            :href="whatsapp(t('landing.offer.talkMessage'))"
            target="_blank"
            rel="noopener"
            color="neutral"
            variant="ghost"
            size="xl"
            icon="i-lucide-message-circle"
          >
            {{ t("landing.hero.ctaTalk") }}
          </UButton>
        </div>
        <p class="mt-6 text-sm text-muted">
          {{ t("landing.hero.priceLine", params) }}
        </p>
      </div>

      <figure class="lg:col-span-2 m-0">
        <pre
          class="rounded-lg border border-default bg-elevated p-5 text-sm leading-relaxed text-default overflow-x-auto"
        ><code>{{ tree.join("\n") }}</code></pre>
        <figcaption class="mt-3 text-xs text-muted">
          {{ t("landing.hero.visualLabel") }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>
