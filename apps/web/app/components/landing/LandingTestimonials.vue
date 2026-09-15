<template>
  <section class="w-full overflow-hidden py-16">
    <div class="container mx-auto max-w-5xl px-4 md:px-8 mb-12 text-center">
      <h2 class="text-3xl sm:text-4xl font-bold text-highlighted">
        {{ $t("landing.testimonials.title") }}
      </h2>
      <LandingAvatars class="my-3" />
      <p class="mt-3 text-lg text-muted max-w-2xl mx-auto">
        {{ $t("landing.testimonials.subtitle") }}
      </p>
    </div>

    <!-- Centralized & Narrower Container for Testimonials -->
    <div class="container mx-auto max-w-5xl px-4 sm:px-6 space-y-6">
      <TestimonialRow :testimonials="firstRowTestimonials" direction="left" />
      <TestimonialRow :testimonials="secondRowTestimonials" direction="right" />
    </div>
  </section>
</template>

<script setup lang="ts">
interface Testimonial {
  testimonial: string;
  name: string;
  avatar: string;
  socialHandle: string;
  socialLink?: string;
}

const { t } = useI18n();

const firstRowTestimonials = computed<Testimonial[]>(() => [
  {
    testimonial: t("landing.testimonials.items.item1.quote"),
    name: t("landing.testimonials.items.item1.name"),
    avatar: "/static/xZ4wg2Xj.jpeg",
    socialHandle: t("landing.testimonials.items.item1.role"),
  },
  {
    testimonial: t("landing.testimonials.items.item2.quote"),
    name: t("landing.testimonials.items.item2.name"),
    avatar: "/static/FJkauyEa.jpeg",
    socialHandle: t("landing.testimonials.items.item2.role"),
  },
  {
    testimonial: t("landing.testimonials.items.item3.quote"),
    name: t("landing.testimonials.items.item3.name"),
    avatar: "/static/KtCFjlD4.jpg",
    socialHandle: t("landing.testimonials.items.item3.role"),
  },
  {
    testimonial: t("landing.testimonials.items.item4.quote"),
    name: t("landing.testimonials.items.item4.name"),
    avatar: "/static/N4aA96n.jpg",
    socialHandle: t("landing.testimonials.items.item4.role"),
  },
]);

const secondRowTestimonials = computed<Testimonial[]>(() => [
  {
    testimonial: t("landing.testimonials.items.item5.quote"),
    name: t("landing.testimonials.items.item5.name"),
    avatar: "/static/AVQ0V28X.jpeg",
    socialHandle: t("landing.testimonials.items.item5.role"),
  },
  {
    testimonial: t("landing.testimonials.items.item6.quote"),
    name: t("landing.testimonials.items.item6.name"),
    avatar: "/static/VUMBKh1U.jpg",
    socialHandle: t("landing.testimonials.items.item6.role"),
  },
  {
    testimonial: t("landing.testimonials.items.item7.quote"),
    name: t("landing.testimonials.items.item7.name"),
    avatar: "/static/KtCFjlD4.jpg",
    socialHandle: t("landing.testimonials.items.item7.role"),
  },
  {
    testimonial: t("landing.testimonials.items.item8.quote"),
    name: t("landing.testimonials.items.item8.name"),
    avatar: "/static/xZ4wg2Xj.jpeg",
    socialHandle: t("landing.testimonials.items.item8.role"),
  },
]);
</script>

