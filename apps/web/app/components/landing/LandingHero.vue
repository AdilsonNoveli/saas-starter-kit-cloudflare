<script setup>
const localePath = useLocalePath();
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Section 1: Centered Headline & Actions -->
    <section
      class="container mx-auto flex flex-col justify-center items-center text-center pt-12 pb-14 lg:pt-18 lg:pb-20 px-4 md:px-8 max-w-5xl"
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
            <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-success" />
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
    </section>
  </div>
</template>
