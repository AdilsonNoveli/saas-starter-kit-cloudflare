<template>
  <div class="w-full relative py-6 my-4 sm:my-6 overflow-hidden">
    <!-- Slanted / Inclined Enterprise Ribbon Container -->
    <div class="relative transform -rotate-1 sm:-rotate-2 scale-105 border-y border-emerald-500/20 bg-gradient-to-r from-night-950 via-night-900/95 to-night-950 py-4 sm:py-5 shadow-xl shadow-emerald-500/5">
      <!-- Glow Accent Line -->
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div class="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div class="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 max-w-6xl">
        <!-- Badge Tag -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="flex h-2 w-2 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span class="text-[11px] sm:text-xs font-mono font-bold tracking-widest uppercase text-muted">
            ENTERPRISE EDGE STACK
          </span>
        </div>

        <!-- Tech Logos from apps/web/public/svg -->
        <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-12">
          <!-- Nuxt -->
          <div class="group flex items-center gap-2 opacity-80 hover:opacity-100 transition-all duration-200">
            <img src="/svg/nuxt.svg" alt="Nuxt" class="h-6 sm:h-7 w-auto object-contain filter drop-shadow group-hover:scale-105 transition-transform" />
            <span class="text-xs sm:text-sm font-semibold text-highlighted tracking-tight">Nuxt 3</span>
          </div>

          <!-- SST -->
          <div class="group flex items-center gap-2 opacity-80 hover:opacity-100 transition-all duration-200">
            <img src="/svg/sst.svg" alt="SST" class="h-5 sm:h-6 w-auto object-contain filter drop-shadow group-hover:scale-105 transition-transform" />
            <span class="text-xs sm:text-sm font-semibold text-highlighted tracking-tight">SST v4</span>
          </div>

          <!-- Cloudflare -->
          <div class="group flex items-center gap-2 opacity-80 hover:opacity-100 transition-all duration-200">
            <img src="/svg/cloudflare-badge.svg" alt="Cloudflare" class="h-6 sm:h-7 w-auto object-contain filter drop-shadow group-hover:scale-105 transition-transform" />
            <span class="text-xs sm:text-sm font-semibold text-highlighted tracking-tight">Workers</span>
          </div>

          <!-- PostgreSQL -->
          <div class="group flex items-center gap-2 opacity-80 hover:opacity-100 transition-all duration-200">
            <img src="/svg/postgresql.svg" alt="PostgreSQL" class="h-5 sm:h-6 w-auto object-contain filter drop-shadow group-hover:scale-105 transition-transform" />
            <span class="text-xs sm:text-sm font-semibold text-highlighted tracking-tight">PostgreSQL</span>
          </div>

          <!-- Vue -->
          <div class="group flex items-center gap-2 opacity-80 hover:opacity-100 transition-all duration-200">
            <img src="/svg/vue.svg" alt="Vue.js" class="h-5 sm:h-6 w-auto object-contain filter drop-shadow group-hover:scale-105 transition-transform" />
            <span class="text-xs sm:text-sm font-semibold text-highlighted tracking-tight">Vue 3</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Slanted enterprise logo ribbon using SVGs from apps/web/public/svg
</script>
