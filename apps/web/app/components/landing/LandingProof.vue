<script setup lang="ts">
const { t } = useI18n();

// Quotes as the people gave them; the ledger holds the owner's statement for each (SPEC-0003 DEC-008).
const quotes = ["item1", "item3", "item4"];
</script>

<template>
  <section aria-labelledby="landing-proof" class="container mx-auto max-w-3xl px-4 md:px-8 py-16 md:py-24">
    <h2 id="landing-proof" class="text-pretty text-3xl sm:text-4xl font-extrabold tracking-tight text-highlighted">
      {{ t("landing.testimonials.title") }}
    </h2>
    <p class="mt-4 text-lg text-muted">
      {{ t("landing.testimonials.subtitle") }}
    </p>
    <div class="mt-12 space-y-12">
      <figure v-for="quote in quotes" :key="quote" class="m-0">
        <blockquote class="m-0 text-xl leading-relaxed text-default">
          {{ t(`landing.testimonials.items.${quote}.quote`) }}
        </blockquote>
        <figcaption class="mt-3 text-sm text-muted">
          <span class="font-semibold text-highlighted">{{ t(`landing.testimonials.items.${quote}.name`) }}</span>
          · {{ t(`landing.testimonials.items.${quote}.role`) }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>
