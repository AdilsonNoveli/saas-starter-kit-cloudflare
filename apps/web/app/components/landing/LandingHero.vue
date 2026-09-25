<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const { params, hasCheckout, checkoutUrl, whatsapp } = useOffer();

// The real structure of the repository and the real deploy command (layers/, apps/, `bun run deploy`).
// Each line is [text, tone]: the tone only colors it.
const lines: [string, "dim" | "dir" | "cmd" | "plain"][] = [
  ["layers/", "dir"],
  ["  admin/  billing/  kanban/", "plain"],
  ["  notifications/  teams/", "plain"],
  ["apps/", "dir"],
  ["  web/  app/  login/  functions/", "plain"],
  ["", "plain"],
  ["$ bun run deploy", "cmd"],
];
const tone = { dim: "text-muted", dir: "text-primary", cmd: "text-success", plain: "text-default" };

const primary = computed(() => (hasCheckout.value ? { href: checkoutUrl.value } : { to: `${localePath("/")}#offer` }));
</script>

<template>
  <section class="relative overflow-hidden">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-primary/10 via-transparent to-transparent" aria-hidden="true" />
    <div class="relative container mx-auto max-w-6xl px-4 md:px-8 pt-16 pb-24 lg:pt-28 lg:pb-32">
      <div class="grid gap-14 lg:grid-cols-12 lg:gap-12 items-center">
        <div class="lg:col-span-7">
          <span class="inline-flex items-center gap-2 rounded-full border border-default bg-elevated/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted">
            <span class="size-1.5 rounded-full bg-success" aria-hidden="true" />
            {{ t("landing.hero.badge") }}
          </span>
          <h1 class="mt-6 text-pretty text-5xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.04] text-highlighted">
            {{ t("landing.hero.title") }}
          </h1>
          <p class="mt-8 text-lg sm:text-xl leading-relaxed text-muted max-w-2xl">
            {{ t("landing.hero.subtitle") }}
          </p>
          <div class="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
            <CTAButton v-bind="primary" size="xl" radius="lg" trailing-icon="i-lucide-arrow-right">
              {{ t("landing.hero.cta") }}
            </CTAButton>
            <UButton
              :href="whatsapp(t('landing.offer.talkMessage'))"
              target="_blank"
              rel="noopener"
              color="neutral"
              variant="outline"
              size="xl"
              icon="i-lucide-message-circle"
            >
              {{ t("landing.hero.ctaTalk") }}
            </UButton>
          </div>
          <p class="mt-8 inline-flex rounded-full border border-default bg-elevated/70 px-4 py-2 text-sm text-muted">
            {{ t("landing.hero.priceLine", params) }}
          </p>
        </div>

        <figure class="lg:col-span-5 m-0">
          <div class="overflow-hidden rounded-xl border border-default bg-elevated shadow-2xl shadow-primary/10">
            <div class="flex items-center gap-2 border-b border-default bg-muted/40 px-4 py-3" aria-hidden="true">
              <span class="size-3 rounded-full bg-error/70" />
              <span class="size-3 rounded-full bg-warning/70" />
              <span class="size-3 rounded-full bg-success/70" />
            </div>
            <pre class="m-0 px-6 py-6 text-sm sm:text-base leading-loose overflow-x-auto"><code><span v-for="(line, index) in lines" :key="index" :class="tone[line[1]]" class="block min-h-[1.6em]">{{ line[0] }}</span></code></pre>
          </div>
          <figcaption class="mt-4 text-xs text-muted">
            {{ t("landing.hero.visualLabel") }}
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
