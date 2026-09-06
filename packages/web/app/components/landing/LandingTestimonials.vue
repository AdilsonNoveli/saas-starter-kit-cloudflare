<template>
  <section class="w-full overflow-hidden py-16">
    <div class="container mx-auto max-w-5xl px-4 md:px-8 mb-12 text-center">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Trusted by Teams Worldwide
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        Developers and founders rely on NuxFire to ship production-grade products faster.
      </p>
    </div>

    <div class="space-y-8">
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

const firstRowTestimonials: Testimonial[] = [
  {
    testimonial:
      "Example of how customer testimonials can be displayed. Features responsive design and smooth animations.",
    name: "Demo User 1",
    avatar: "/static/xZ4wg2Xj.jpg",
    socialHandle: "@demo_user1",
  },
  {
    testimonial:
      "Showcase your customer reviews with customizable avatars, social handles, and multi-line testimonials.",
    name: "Demo User 2",
    avatar: "/static/FJkauyEa.jpg",
    socialHandle: "@demo_user2",
  },
  {
    testimonial:
      "Add social proof to your landing page with this easy-to-customize testimonials component.",
    name: "Demo User 3",
    avatar: "/static/KtCFjlD4.jpg",
    socialHandle: "@demo_user3",
  },
];

const secondRowTestimonials: Testimonial[] = [
  {
    testimonial:
      "Multiple row support with alternating scroll directions for visual interest.",
    name: "Demo User 4",
    avatar: "/static/N4aA96n.jpg",
    socialHandle: "@demo_user4",
  },
  {
    testimonial:
      "Fully typed TypeScript component with customizable styling and layout options.",
    name: "Demo User 5",
    avatar: "/static/AVQ0V28X.jpg",
    socialHandle: "@demo_user5",
  },
  {
    testimonial:
      "Mobile-responsive design with optional social links and flexible content structure.",
    name: "Demo User 6",
    avatar: "/static/VUMBKh1U.jpg",
    socialHandle: "@demo_user6",
  },
];
</script>

