<template>
  <section class="w-full overflow-hidden py-16">
    <div class="container mx-auto max-w-5xl px-4 md:px-8 mb-12 text-center">
      <h2 class="text-3xl sm:text-4xl font-bold text-highlighted">
        Trusted by Teams Worldwide
      </h2>
      <LandingAvatars class="my-3" />
      <p class="mt-3 text-lg text-muted max-w-2xl mx-auto">
        Developers and founders rely on NuxFire to ship production-grade products faster.
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

const firstRowTestimonials: Testimonial[] = [
  {
    testimonial:
      "Setting up auth with multi-tenancy and Stripe webhooks usually takes me 3 to 4 weeks on every project. With NuxFire, I had the entire billing and team management live on Cloudflare Workers in a single weekend.",
    name: "Alex Rivera",
    avatar: "/static/xZ4wg2Xj.jpg",
    socialHandle: "@alexrivera_dev",
  },
  {
    testimonial:
      "The Cloudflare Workers + Hyperdrive Postgres setup is insanely fast. 0ms cold starts across global edges, and the SST deployment pipeline worked on the first try. Genuinely enterprise grade.",
    name: "Marcus Vance",
    avatar: "/static/FJkauyEa.jpg",
    socialHandle: "@marcusvance",
  },
  {
    testimonial:
      "Most boilerplates give you half-baked code that breaks when you add real users. NuxFire actually has proper RBAC, invite flows, and audit logs already wired up. Saved me at least 2 months of work.",
    name: "Elena Rostova",
    avatar: "/static/KtCFjlD4.jpg",
    socialHandle: "@elena_codes",
  },
  {
    testimonial:
      "I was skeptical about running Nuxt 4 and Drizzle on edge Workers, but the architecture here is brilliant. Clean separation between the Web, App, and Auth workers without unnecessary complexity.",
    name: "Liam O'Connor",
    avatar: "/static/N4aA96n.jpg",
    socialHandle: "@liam_builds",
  },
];

const secondRowTestimonials: Testimonial[] = [
  {
    testimonial:
      "The real-time WebSocket Durable Objects and background queue setup out of the box is what sold me. We replaced our old Redis BullMQ setup and cut our server bills to almost zero.",
    name: "Sofia Mendes",
    avatar: "/static/AVQ0V28X.jpg",
    socialHandle: "@sofiamendes_tech",
  },
  {
    testimonial:
      "Nuxt UI v4 components plus the D1 content docs and Stripe customer portal integration made launching our B2B app feel effortless. It feels like a platform built by senior engineers.",
    name: "Daniel Zhao",
    avatar: "/static/VUMBKh1U.jpg",
    socialHandle: "@dzhao_eng",
  },
  {
    testimonial:
      "The type-safety end-to-end between Drizzle ORM and tRPC is immaculate. Refactoring schemas doesn't cause hidden runtime bugs. Easily the best Nuxt starter on the market.",
    name: "Kavita Patel",
    avatar: "/static/KtCFjlD4.jpg",
    socialHandle: "@kavitadev",
  },
  {
    testimonial:
      "Stop wasting time building auth and team permissions from scratch. We migrated our MVP to NuxFire and shipped our first paid subscriptions 48 hours later. Worth every penny.",
    name: "Jordan Blake",
    avatar: "/static/xZ4wg2Xj.jpg",
    socialHandle: "@jblake_io",
  },
];
</script>

