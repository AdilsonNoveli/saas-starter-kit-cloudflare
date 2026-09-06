<template>
  <!-- fade-mask wraps the scroll row with left/right fade using mask-image -->
  <div class="testimonial-fade-mask relative flex overflow-hidden">
    <div
      ref="scrollRef"
      :class="[
        direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right',
        'flex flex-shrink gap-[40px]',
      ]"
    >
      <div
        v-for="testimonial in testimonials"
        :key="testimonial.name"
        class="w-[400px] shrink-0"
      >
        <TestimonialCard v-bind="testimonial" />
      </div>
      <!-- Duplicate for seamless loop -->
      <div
        v-for="testimonial in testimonials"
        :key="`duplicate-${testimonial.name}`"
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

const scrollRef = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

function onMouseMove(_e: MouseEvent) {
  if (!isDragging.value || !scrollRef.value) return;
}

function stopDragging() {
  if (!scrollRef.value) return;
  isDragging.value = false;
}
</script>

<style scoped>
/* Fade lateral — funciona em light e dark mode usando mask-image */
.testimonial-fade-mask {
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 12%,
    black 88%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 12%,
    black 88%,
    transparent 100%
  );
}

.animate-scroll-left {
  animation: scroll-left 30s linear infinite;
}

.animate-scroll-right {
  animation: scroll-right 30s linear infinite;
}

@keyframes scroll-left {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-50% - 20px));
  }
}

@keyframes scroll-right {
  0% {
    transform: translateX(calc(-50% - 20px));
  }
  100% {
    transform: translateX(0);
  }
}

/* Pause animation on hover */
.animate-scroll-left:hover,
.animate-scroll-right:hover {
  animation-play-state: paused;
}
</style>

