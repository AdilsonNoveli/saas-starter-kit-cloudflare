<template>
  <section id="architecture" class="py-12 md:py-20 px-4 sm:px-6 lg:px-8 xl:px-40">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-8 lg:mb-12">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-layers" class="w-4 h-4" />
              <span>{{ $t("landing.architecture.badge") }}</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl font-bold lg:text-5xl lg:leading-[1.1em] text-highlighted mb-4">
          {{ $t("landing.architecture.title") }}
        </h2>

        <p class="text-muted text-lg lg:text-xl">
          {{ $t("landing.architecture.subtitle") }}
        </p>
      </div>

      <!-- Translation / Reassuring Note for Vibe Coders & Senior Devs -->
      <div class="max-w-3xl mx-auto mb-8">
        <div class="rounded-xl border border-default bg-elevated/70 backdrop-blur-sm p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
          <UIcon name="i-lucide-sparkles" class="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div class="text-sm sm:text-base leading-relaxed">
            <span class="font-semibold text-highlighted">
              {{ $t("landing.architecture.translationLead") }}
            </span>
            <span class="text-muted">
              {{ $t("landing.architecture.translationRest") }}
            </span>
          </div>
        </div>
      </div>

      <!-- Diagram SVG Container (Clean, Elevated, Responsive) -->
      <div class="w-full overflow-hidden flex justify-center items-center py-4 px-2 sm:px-6 rounded-2xl border border-default bg-elevated/40 shadow-sm">
        <!-- Light Mode Diagram -->
        <img
          src="/svg/architecture_diagram_white.svg"
          :alt="$t('landing.architecture.diagramAlt')"
          class="w-full h-auto max-h-[700px] object-contain block dark:hidden mx-auto"
          loading="lazy"
        />
        <!-- Dark Mode Diagram -->
        <img
          src="/svg/architecture_diagram_darck.svg"
          :alt="$t('landing.architecture.diagramAlt')"
          class="w-full h-auto max-h-[700px] object-contain hidden dark:block mx-auto"
          loading="lazy"
        />
      </div>

      <!-- Callout -->
      <div class="mt-8 lg:mt-12 text-center max-w-3xl mx-auto">
        <p class="text-lg sm:text-xl lg:text-2xl font-medium tracking-tight text-highlighted">
          {{ $t("landing.architecture.calloutLead") }} <span class="text-muted font-normal">{{ $t("landing.architecture.calloutRest") }}</span>
        </p>
      </div>

      <!-- Enterprise Tech Stack Slanted Ribbon -->
      <div class="mt-12 lg:mt-16 w-full">
        <LandingPageLogos />
      </div>
    </div>
  </section>
</template>
