<template>
  <!-- Lateral fade mask wraps the marquee so cards dissolve smoothly before reaching the corners -->
  <div class="testimonial-fade-mask relative overflow-hidden py-2">
    <UMarquee
      :reverse="direction === 'right'"
      pause-on-hover
      :overlay="false"
      :repeat="4"
      class="[--duration:38s] [--gap:1.5rem]"
    >
      <div
        v-for="testimonial in testimonials"
        :key="testimonial.name"
        class="w-[320px] sm:w-[360px] shrink-0"
      >
        <TestimonialCard v-bind="testimonial" />
      </div>
    </UMarquee>
  </div>
</template>

<script setup lang="ts">
interface Testimonial {
  testimonial: string;
  name: string;
  avatar: string;
  socialHandle: string;
  socialLink?: string;
}

defineProps<{
  testimonials: Testimonial[];
  direction: "left" | "right";
}>();
</script>

<style scoped>
/* Lateral fade mask: cards fade to 0% opacity within the outer 16% on left & right */
.testimonial-fade-mask {
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 16%,
    black 84%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 16%,
    black 84%,
    transparent 100%
  );
}
</style>
