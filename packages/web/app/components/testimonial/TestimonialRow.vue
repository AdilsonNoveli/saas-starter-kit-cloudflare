<template>
  <!-- fade-mask wraps the scroll row with left/right fade using mask-image -->
  <div class="testimonial-fade-mask relative flex overflow-hidden">
    <div
      :class="[
        direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right',
        'scroll-track flex shrink-0 gap-10',
      ]"
    >
      <!-- Original set -->
      <div
        v-for="testimonial in testimonials"
        :key="testimonial.name"
        class="w-[400px] shrink-0"
      >
        <TestimonialCard v-bind="testimonial" />
      </div>
      <!-- Exact duplicate for seamless loop -->
      <div
        v-for="testimonial in testimonials"
        :key="`dup-${testimonial.name}`"
        class="w-[400px] shrink-0"
      >
        <TestimonialCard v-bind="testimonial" />
      </div>
    </div>
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
/* ------------------------------------------------------------------
   Layout
   - Each card is 400px wide with 40px (gap-10) between cards.
   - One "set" of 3 cards = (3 × 400px) + (2 × 40px gaps) = 1280px.
   - The track holds 2 sets end-to-end = 2560px total.
   - To loop seamlessly, we translate exactly −1280px (one full set).
     translateX(−50%) of the track is exactly −1280px when 2 sets
     are identical, so the browser never sees a jump.
   ------------------------------------------------------------------ */

.scroll-track {
  will-change: transform;
}

/* Lateral fade — works in both light and dark mode */
.testimonial-fade-mask {
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 10%,
    black 90%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 10%,
    black 90%,
    transparent 100%
  );
}

/* ---- Left scroll ---- */
.animate-scroll-left {
  animation: scroll-left 35s linear infinite;
}

@keyframes scroll-left {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* ---- Right scroll ---- */
.animate-scroll-right {
  animation: scroll-right 35s linear infinite;
}

@keyframes scroll-right {
  from { transform: translateX(-50%); }
  to   { transform: translateX(0); }
}

/* Pause on hover for readability */
.animate-scroll-left:hover,
.animate-scroll-right:hover {
  animation-play-state: paused;
}
</style>
