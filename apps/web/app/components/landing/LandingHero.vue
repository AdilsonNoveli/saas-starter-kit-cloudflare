<script setup>
const localePath = useLocalePath();
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Section 1: Centered Headline & Actions -->
    <section
      class="container mx-auto flex flex-col justify-center items-center text-center pt-14 pb-8 lg:pt-20 lg:pb-12 px-4 md:px-8 max-w-5xl"
    >
      <!-- Badge -->
      <div class="flex items-center justify-center mb-6">
        <UBadge
          color="neutral"
          variant="subtle"
          size="md"
          class="border border-default bg-elevated/80 text-muted px-4 py-1.5 shadow-sm"
        >
          <div class="flex gap-2 items-center text-xs lg:text-sm font-semibold tracking-wider uppercase">
            <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-emerald-500" />
            <span>{{ $t("landing.hero.badge") }}</span>
          </div>
        </UBadge>
      </div>

      <!-- Headline -->
      <h1
        class="mb-6 text-pretty text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12em] text-highlighted max-w-4xl"
      >
        {{ $t("landing.hero.title") }}
      </h1>

      <!-- Subtitle -->
      <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed max-w-3xl mb-8">
        {{ $t("landing.hero.subtitleLead") }} <strong class="font-semibold text-highlighted">{{ $t("landing.hero.subtitleStrong") }}</strong>
      </p>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row items-center gap-4 justify-center">
        <CTAButton
          :to="`${localePath('/')}#pricing`"
          size="lg"
          radius="lg"
          trailing-icon="i-lucide-arrow-right"
        >
          {{ $t("landing.hero.ctaPrimary") }}
        </CTAButton>

        <UButton
          icon="i-lucide-book-open"
          variant="ghost"
          color="neutral"
          size="xl"
          :to="localePath('/docs')"
          class="text-muted hover:text-highlighted"
        >
          {{ $t("landing.hero.ctaDocs") }}
        </UButton>
      </div>

      <!-- Vibe Coding & AI Builders Highlight -->
      <div class="mt-8 max-w-2xl mx-auto">
        <div class="inline-flex flex-col sm:flex-row items-center gap-2.5 px-4 py-3 rounded-xl border border-default bg-elevated/70 shadow-sm text-xs sm:text-sm text-center sm:text-left backdrop-blur-sm">
          <div class="flex items-center gap-2 shrink-0">
            <span class="inline-flex items-center gap-1 font-mono font-bold text-[10px] sm:text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <UIcon name="i-lucide-bot" class="w-3.5 h-3.5" />
              <span>Vibe Coding &amp; AI</span>
            </span>
          </div>
          <p class="text-muted leading-relaxed">
            <strong class="font-semibold text-highlighted">{{ $t("landing.hero.vibeCodingLead") }}</strong>
            <span> {{ $t("landing.hero.vibeCodingRest") }}</span>
          </p>
        </div>
      </div>
    </section>

    <!-- Section 2: Centered Large Video with Fine Border -->
    <section class="container mx-auto px-4 md:px-8 pb-16 lg:pb-24 max-w-5xl">
      <!-- Fine border outer container separating from background -->
      <div
        class="relative w-full rounded-2xl p-1.5 sm:p-2.5 bg-elevated/80 border border-default shadow-xl shadow-black/5 dark:shadow-black/60"
      >
        <!-- Inner video player preview without green border on hover -->
        <a
          href="#"
          class="group relative w-full aspect-video rounded-xl overflow-hidden border border-default bg-night-950 flex flex-col justify-between p-4 sm:p-6 md:p-8 transition-all duration-300"
        >
          <!-- Background Ambient Glow & Subtle Pattern -->
          <div class="absolute inset-0 bg-gradient-to-tr from-emerald-950/20 via-night-950/80 to-sky-950/15 pointer-events-none" />
          <div class="absolute inset-0 bg-[radial-gradient(#333333_1px,transparent_1px)] [background-size:20px_20px] opacity-35 pointer-events-none" />

          <!-- Video Top Header Bar -->
          <div class="relative z-10 flex items-center justify-between">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-white/10 backdrop-blur-md">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span class="text-xs sm:text-sm font-medium text-neutral-200">{{ $t("landing.hero.videoLabel") }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-neutral-400 text-xs sm:text-sm px-3 py-1 rounded-md bg-black/60 border border-white/10">
              <UIcon name="i-lucide-clock" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>2:15</span>
            </div>
          </div>

          <!-- Center Play Button (Pulse Only, No Green Drop-Shadow) -->
          <div class="relative z-10 flex flex-col items-center justify-center my-auto">
            <div class="relative flex items-center justify-center">
              <!-- Pulsing outer ring -->
              <div class="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
              <!-- Play button circle (no shadow-emerald) -->
              <div
                class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 text-night-950 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              >
                <UIcon name="i-lucide-play" class="w-7 h-7 sm:w-9 sm:h-9 fill-night-950 ml-1" />
              </div>
            </div>
            <span class="mt-4 text-xs sm:text-sm md:text-base font-semibold text-neutral-200 tracking-wide">
              {{ $t("landing.hero.videoWatch") }}
            </span>
          </div>

          <!-- Video Bottom Player Bar Mockup: Loading bar expands on hover -->
          <div class="relative z-10 flex items-center gap-4 pt-3">
            <div class="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden border border-white/10">
              <div class="h-full w-1/3 bg-emerald-400 rounded-full group-hover:w-2/3 transition-all duration-700 ease-out" />
            </div>
            <span class="text-xs sm:text-sm font-mono text-neutral-400">0:45 / 2:15</span>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>
