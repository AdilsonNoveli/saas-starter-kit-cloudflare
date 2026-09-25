<script setup lang="ts">
const { t } = useI18n();

// Quotes as the people gave them; the ledger holds the owner's statement for each (SPEC-0003 DEC-008).
// A photo is shown once: two people cannot share one, so the second use of a file shows initials.
const items = [
  { key: "item1", avatar: "/static/xZ4wg2Xj.webp" },
  { key: "item2", avatar: "/static/FJkauyEa.webp" },
  { key: "item3", avatar: "/static/KtCFjlD4.webp" },
  { key: "item4", avatar: "/static/N4aA96n.webp" },
  { key: "item5", avatar: "/static/AVQ0V28X.webp" },
  { key: "item6", avatar: "/static/VUMBKh1U.webp" },
  { key: "item7", avatar: "" },
  { key: "item8", avatar: "" },
];

const card = (item: { key: string; avatar: string }) => ({
  testimonial: t(`landing.testimonials.items.${item.key}.quote`),
  name: t(`landing.testimonials.items.${item.key}.name`),
  avatar: item.avatar,
  socialHandle: t(`landing.testimonials.items.${item.key}.role`),
});

const firstRow = computed(() => items.slice(0, 4).map(card));
const secondRow = computed(() => items.slice(4).map(card));
</script>

<template>
  <section aria-labelledby="landing-proof" class="overflow-hidden py-20 md:py-28">
    <div class="container mx-auto max-w-3xl px-4 md:px-8 text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-primary">{{ t("landing.testimonials.eyebrow") }}</p>
      <h2 id="landing-proof" class="mt-3 text-pretty text-4xl sm:text-5xl font-extrabold tracking-tight text-highlighted">
        {{ t("landing.testimonials.title") }}
      </h2>
      <p class="mt-5 text-lg text-muted">
        {{ t("landing.testimonials.subtitle") }}
      </p>
    </div>
    <div class="container mx-auto mt-14 max-w-5xl px-4 sm:px-6 space-y-6">
      <TestimonialRow :testimonials="firstRow" direction="left" />
      <TestimonialRow :testimonials="secondRow" direction="right" />
    </div>
  </section>
</template>
