<template>
  <section id="architecture" class="py-12 md:py-20 px-4 sm:px-6 lg:px-8 xl:px-40">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-8 lg:mb-12">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-layers" class="w-4 h-4" />
              <span>Edge Architecture</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl font-bold lg:text-5xl lg:leading-[1.1em] text-highlighted mb-4">
          Engineered for Global Scale
        </h2>

        <p class="text-muted text-lg lg:text-xl">
          100% serverless, zero cold-starts, globally distributed on Cloudflare Workers and PostgreSQL.
        </p>
      </div>

      <!-- Diagram SVG Container (Transparent, Clean, Responsive) -->
      <div class="w-full overflow-hidden flex justify-center items-center py-2">
        <img
          src="/svg/architecture_diagram.svg"
          alt="NuxFire Architecture Diagram"
          class="w-full h-auto max-h-[900px] object-contain block mx-auto"
          loading="lazy"
        />
      </div>

      <!-- Callout -->
      <div class="mt-8 lg:mt-12 text-center max-w-3xl mx-auto">
        <p class="text-lg sm:text-xl lg:text-2xl font-medium tracking-tight text-highlighted">
          Complicated? Perhaps. <span class="text-muted font-normal">We've already handled the hard parts so you can focus on building your idea.</span>
        </p>
      </div>

      <!-- Nuxt & SST Logos between Callout and Comparison Table -->
      <div class="mt-12 lg:mt-16 pt-8 border-t border-night-800/60 max-w-4xl mx-auto">
        <LandingPageLogos />
      </div>
    </div>
  </section>
</template>
