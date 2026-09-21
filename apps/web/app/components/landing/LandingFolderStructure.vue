<template>
  <section class="container mx-auto px-4 md:px-8 py-16 lg:py-24 max-w-6xl">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
      <!-- Left: Persuasive Enterprise Delivery Copy -->
      <div class="lg:col-span-6 flex flex-col justify-between space-y-6">
        <div class="space-y-4">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
            <UIcon name="i-lucide-package-check" class="w-4 h-4" />
            <span>{{ $t("landing.showcase.badge") }}</span>
          </div>

          <!-- Title -->
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-highlighted tracking-tight leading-[1.18em]">
            {{ $t("landing.showcase.title") }}
          </h2>

          <!-- Subtitle -->
          <p class="text-muted text-base sm:text-lg leading-relaxed">
            {{ $t("landing.showcase.subtitle") }}
          </p>
        </div>

        <!-- Feature List: Clean Checkpoints without bulky cards -->
        <div class="space-y-6 pt-1">
          <!-- Item 1: Immediate access to your Members Area -->
          <div class="space-y-2.5">
            <div class="flex items-center gap-2.5">
              <UIcon name="i-lucide-circle-check" class="w-5 h-5 text-success shrink-0" />
              <h4 class="text-base font-bold text-highlighted">
                {{ $t("landing.showcase.features.membersArea.title") }}
              </h4>
            </div>
            <ul class="pl-7 space-y-1.5 text-xs sm:text-sm text-muted leading-relaxed">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
                <span>{{ $t("landing.showcase.features.membersArea.point1") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
                <span>{{ $t("landing.showcase.features.membersArea.point2") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
                <span>{{ $t("landing.showcase.features.membersArea.point3") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
                <span>{{ $t("landing.showcase.features.membersArea.point4") }}</span>
              </li>
              <li class="flex items-center gap-2 font-medium text-highlighted">
                <span class="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                <span>{{ $t("landing.showcase.features.membersArea.point5") }}</span>
              </li>
            </ul>
          </div>

          <!-- Item 2: 15,000+ lines of tested senior engineering -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2.5">
              <UIcon name="i-lucide-circle-check" class="w-5 h-5 text-success shrink-0" />
              <h4 class="text-base font-bold text-highlighted">
                {{ $t("landing.showcase.features.engineering.title") }}
              </h4>
            </div>
            <p class="pl-7 text-xs sm:text-sm text-muted leading-relaxed">
              {{ $t("landing.showcase.features.engineering.desc") }}
            </p>
          </div>
        </div>

        <!-- CTA -->
        <div class="pt-2">
          <CTAButton
            :to="`${localePath('/')}#pricing`"
            size="md"
            radius="lg"
            trailing-icon="i-lucide-arrow-right"
            class="w-full sm:w-auto justify-center whitespace-nowrap text-xs sm:text-sm font-bold tracking-wide sm:tracking-wider px-6 sm:px-8 py-3.5"
          >
            {{ $t("landing.showcase.cta") }}
          </CTAButton>
        </div>
      </div>

      <!-- Right: Interactive Folder Structure IDE Window -->
      <div class="lg:col-span-6 flex flex-col rounded-2xl border border-default bg-elevated/90 shadow-xl overflow-hidden backdrop-blur-md">
        <!-- Window Header Bar -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-muted/40 select-none">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-error/80 inline-block" />
            <span class="w-3 h-3 rounded-full bg-warning/80 inline-block" />
            <span class="w-3 h-3 rounded-full bg-success/80 inline-block" />
            <span class="ml-2 font-mono text-xs text-muted font-medium">nuxfire — Bun Monorepo</span>
          </div>
          <div class="flex items-center gap-1.5">
            <UBadge color="neutral" variant="subtle" size="xs" class="font-mono text-[10px]">
              Nuxt 4 + SST v4
            </UBadge>
          </div>
        </div>

        <!-- Window Content: Real Monorepo Folder Tree from Docs -->
        <div class="p-3 sm:p-4 flex-1 font-mono text-xs sm:text-[13px]">
          <FolderTree class="!bg-transparent !p-0" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const localePath = useLocalePath();
</script>
