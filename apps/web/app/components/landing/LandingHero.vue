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
    </section>

    <!-- Section 2: Enterprise Monorepo Codebase Showcase (2 Columns) -->
    <section class="container mx-auto px-4 md:px-8 pb-16 lg:pb-24 max-w-6xl">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        <!-- Left: Interactive Folder Structure IDE Window -->
        <div class="lg:col-span-6 flex flex-col rounded-2xl border border-default bg-elevated/90 shadow-xl overflow-hidden backdrop-blur-md">
          <!-- Window Header Bar -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-default bg-muted/40 select-none">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span class="ml-2 font-mono text-xs text-muted font-medium">nuxfire — Bun Monorepo</span>
            </div>
            <div class="flex items-center gap-1.5">
              <UBadge color="neutral" variant="subtle" size="xs" class="font-mono text-[10px]">
                Nuxt 4 + SST v4
              </UBadge>
            </div>
          </div>

          <!-- Window Content: Curated & Stylized Folder Tree -->
          <div class="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto flex-1 flex flex-col justify-between space-y-1.5">
            <!-- apps/ -->
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-highlighted font-bold">
                <UIcon name="i-lucide-folder-open" class="w-4 h-4 text-primary" />
                <span>apps/</span>
              </div>
              <div class="ml-5 pl-2 border-l border-default/70 space-y-1 text-muted">
                <div class="flex items-center justify-between gap-2 py-0.5 hover:text-highlighted transition-colors">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder" class="w-3.5 h-3.5 text-sky-500" />
                    <span class="font-semibold text-highlighted">app/</span>
                  </div>
                  <span class="text-[11px] text-muted hidden sm:inline">Nuxt 4 SaaS Dashboard &amp; Composition</span>
                </div>
                <div class="flex items-center justify-between gap-2 py-0.5 hover:text-highlighted transition-colors">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder" class="w-3.5 h-3.5 text-sky-500" />
                    <span class="font-semibold text-highlighted">web/</span>
                  </div>
                  <span class="text-[11px] text-muted hidden sm:inline">Landing, Blog &amp; Docs (Content v3)</span>
                </div>
                <div class="flex items-center justify-between gap-2 py-0.5 hover:text-highlighted transition-colors">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder" class="w-3.5 h-3.5 text-indigo-500" />
                    <span class="font-semibold text-highlighted">login/</span>
                  </div>
                  <span class="text-[11px] text-muted hidden sm:inline">OpenAuth.js UI &amp; Social Logins</span>
                </div>
                <div class="flex items-center justify-between gap-2 py-0.5 hover:text-highlighted transition-colors">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder" class="w-3.5 h-3.5 text-amber-500" />
                    <span class="font-semibold text-highlighted">functions/</span>
                  </div>
                  <span class="text-[11px] text-muted hidden sm:inline">Workers (Cron, Queues, DLQ, Drizzle)</span>
                </div>
              </div>
            </div>

            <!-- layers/ -->
            <div class="space-y-1 pt-1">
              <div class="flex items-center gap-2 text-highlighted font-bold">
                <UIcon name="i-lucide-folder-open" class="w-4 h-4 text-emerald-500" />
                <span>layers/</span>
                <span class="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Modular Nuxt Layers</span>
              </div>
              <div class="ml-5 pl-2 border-l border-default/70 space-y-1 text-muted">
                <div class="flex items-center justify-between gap-2 py-0.5 hover:text-highlighted transition-colors">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder" class="w-3.5 h-3.5 text-emerald-500" />
                    <span class="text-highlighted">admin/</span>
                  </div>
                  <span class="text-[11px] text-muted hidden sm:inline">Platform Admin, MFA &amp; Audit Logs</span>
                </div>
                <div class="flex items-center justify-between gap-2 py-0.5 hover:text-highlighted transition-colors">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder" class="w-3.5 h-3.5 text-emerald-500" />
                    <span class="text-highlighted">billing/</span>
                  </div>
                  <span class="text-[11px] text-muted hidden sm:inline">Stripe Subscriptions &amp; Webhooks</span>
                </div>
                <div class="flex items-center justify-between gap-2 py-0.5 hover:text-highlighted transition-colors">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder" class="w-3.5 h-3.5 text-emerald-500" />
                    <span class="text-highlighted">teams/</span>
                  </div>
                  <span class="text-[11px] text-muted hidden sm:inline">B2B Multi-Tenancy &amp; Granular RBAC</span>
                </div>
                <div class="flex items-center justify-between gap-2 py-0.5 hover:text-highlighted transition-colors">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder" class="w-3.5 h-3.5 text-emerald-500" />
                    <span class="text-highlighted">notifications/</span>
                  </div>
                  <span class="text-[11px] text-muted hidden sm:inline">Durable Objects WebSockets Hub</span>
                </div>
              </div>
            </div>

            <!-- packages/ & infra/ -->
            <div class="space-y-1 pt-1">
              <div class="flex items-center justify-between gap-2 hover:text-highlighted transition-colors">
                <div class="flex items-center gap-2 font-bold text-highlighted">
                  <UIcon name="i-lucide-folder" class="w-4 h-4 text-purple-500" />
                  <span>packages/</span>
                </div>
                <span class="text-[11px] text-muted hidden sm:inline">emails (React Email), tokens, manifest</span>
              </div>
              <div class="flex items-center justify-between gap-2 hover:text-highlighted transition-colors">
                <div class="flex items-center gap-2 font-bold text-highlighted">
                  <UIcon name="i-lucide-file-code" class="w-4 h-4 text-amber-500" />
                  <span>infra/*.ts</span>
                </div>
                <span class="text-[11px] text-muted hidden sm:inline">SST v4 Declarative Cloudflare IaC</span>
              </div>
            </div>

            <!-- Bottom Link to Docs -->
            <div class="pt-3 mt-2 border-t border-default/60 flex items-center justify-between">
              <NuxtLink
                :to="localePath('/docs/saas-starter-kit/getting-started/project-structure#folder-structure')"
                class="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5 transition-colors"
              >
                <span>{{ $t("landing.showcase.viewStructure") }}</span>
                <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
              </NuxtLink>
              <span class="text-[10px] font-mono text-muted">15,000+ lines of code</span>
            </div>
          </div>
        </div>

        <!-- Right: Persuasive Enterprise Delivery Copy -->
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

          <!-- Feature Bullets / High Value Pillars -->
          <div class="space-y-3.5">
            <div class="flex items-start gap-3 p-3.5 rounded-xl border border-default bg-elevated/50">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <UIcon name="i-lucide-zap" class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-highlighted">
                  {{ $t("landing.showcase.features.delivery.title") }}
                </h4>
                <p class="text-xs sm:text-sm text-muted mt-0.5 leading-relaxed">
                  {{ $t("landing.showcase.features.delivery.desc") }}
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-3.5 rounded-xl border border-default bg-elevated/50">
              <div class="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <UIcon name="i-lucide-layers" class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-highlighted">
                  {{ $t("landing.showcase.features.engineering.title") }}
                </h4>
                <p class="text-xs sm:text-sm text-muted mt-0.5 leading-relaxed">
                  {{ $t("landing.showcase.features.engineering.desc") }}
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-3.5 rounded-xl border border-default bg-elevated/50">
              <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <UIcon name="i-lucide-shield-check" class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-highlighted">
                  {{ $t("landing.showcase.features.ownership.title") }}
                </h4>
                <p class="text-xs sm:text-sm text-muted mt-0.5 leading-relaxed">
                  {{ $t("landing.showcase.features.ownership.desc") }}
                </p>
              </div>
            </div>
          </div>

          <!-- CTAs -->
          <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <CTAButton
              :to="`${localePath('/')}#pricing`"
              size="lg"
              radius="lg"
              trailing-icon="i-lucide-arrow-right"
              class="w-full sm:w-auto justify-center"
            >
              {{ $t("landing.showcase.cta") }}
            </CTAButton>
            <UButton
              :to="localePath('/docs/saas-starter-kit/getting-started/project-structure')"
              variant="outline"
              color="neutral"
              size="lg"
              icon="i-lucide-folder-tree"
              class="w-full sm:w-auto justify-center text-muted hover:text-highlighted"
            >
              Folder Structure
            </UButton>
          </div>
        </div>
      </div>

      <!-- Enhanced AI Builders & Vibe Coding Banner (Positioned after Folder Structure Showcase) -->
      <div class="mt-10 lg:mt-12 rounded-2xl border border-default bg-elevated/70 p-6 sm:p-8 backdrop-blur-md shadow-sm">
        <div class="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-sparkles" class="w-6 h-6 text-emerald-500" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg sm:text-xl font-bold text-highlighted mb-1.5">
              {{ $t("landing.ai.title") }}
            </h3>
            <p class="text-muted text-sm sm:text-base leading-relaxed">
              {{ $t("landing.ai.description") }}
            </p>
          </div>
          <div class="shrink-0 flex items-center gap-2">
            <UBadge color="neutral" variant="outline" class="font-mono text-xs">Cursor</UBadge>
            <UBadge color="neutral" variant="outline" class="font-mono text-xs">Claude Code</UBadge>
            <UBadge color="neutral" variant="outline" class="font-mono text-xs">v0</UBadge>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Centered Large Video (Commented out as requested)
    <section class="container mx-auto px-4 md:px-8 pb-16 lg:pb-24 max-w-5xl">
      <div
        class="relative w-full rounded-2xl p-1.5 sm:p-2.5 bg-elevated/80 border border-default shadow-xl shadow-black/5 dark:shadow-black/60"
      >
        <a
          href="#"
          class="group relative w-full aspect-video rounded-xl overflow-hidden border border-default bg-night-950 flex flex-col justify-between p-4 sm:p-6 md:p-8 transition-all duration-300"
        >
          <div class="absolute inset-0 bg-gradient-to-tr from-emerald-950/20 via-night-950/80 to-sky-950/15 pointer-events-none" />
          <div class="absolute inset-0 bg-[radial-gradient(#333333_1px,transparent_1px)] [background-size:20px_20px] opacity-35 pointer-events-none" />

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

          <div class="relative z-10 flex flex-col items-center justify-center my-auto">
            <div class="relative flex items-center justify-center">
              <div class="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
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

          <div class="relative z-10 flex items-center gap-4 pt-3">
            <div class="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden border border-white/10">
              <div class="h-full w-1/3 bg-emerald-400 rounded-full group-hover:w-2/3 transition-all duration-700 ease-out" />
            </div>
            <span class="text-xs sm:text-sm font-mono text-neutral-400">0:45 / 2:15</span>
          </div>
        </a>
      </div>
    </section>
    -->
  </div>
</template>
