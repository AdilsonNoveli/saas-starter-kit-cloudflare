<template>
  <div class="w-full relative py-6 my-4 sm:my-6 overflow-hidden">
    <!-- Slanted / Inclined Enterprise Ribbon Container -->
    <div class="relative transform -rotate-1 sm:-rotate-2 scale-105 border-y border-emerald-500/20 bg-gradient-to-r from-night-950 via-night-900/95 to-night-950 py-4 sm:py-5 shadow-xl shadow-emerald-500/5">
      <!-- Glow Accent Line -->
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div class="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div class="container mx-auto px-4 flex items-center justify-center max-w-6xl">
        <!-- Tech Logos from apps/web/public/svg -->
        <div class="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16">
          <!-- Nuxt 4 -->
          <div class="group flex items-center opacity-75 hover:opacity-100 transition-all duration-200">
            <img
              src="/svg/nuxt.svg"
              alt="Nuxt 4"
              class="h-7 sm:h-8 w-auto object-contain filter drop-shadow group-hover:scale-110 transition-transform"
            />
          </div>

          <!-- SST -->
          <div class="group flex items-center opacity-75 hover:opacity-100 transition-all duration-200">
            <img
              src="/svg/sst.svg"
              alt="SST v4"
              class="h-6 sm:h-7 w-auto object-contain filter drop-shadow group-hover:scale-110 transition-transform"
            />
          </div>

          <!-- Cloudflare -->
          <div class="group flex items-center opacity-75 hover:opacity-100 transition-all duration-200">
            <img
              src="/svg/cloudflare-badge.svg"
              alt="Cloudflare Workers"
              class="h-7 sm:h-8 w-auto object-contain filter drop-shadow group-hover:scale-110 transition-transform"
            />
          </div>

          <!-- PostgreSQL -->
          <div class="group flex items-center opacity-75 hover:opacity-100 transition-all duration-200">
            <img
              src="/svg/postgresql.svg"
              alt="PostgreSQL"
              class="h-6 sm:h-7 w-auto object-contain filter drop-shadow group-hover:scale-110 transition-transform"
            />
          </div>

          <!-- Vue -->
          <div class="group flex items-center opacity-75 hover:opacity-100 transition-all duration-200">
            <img
              src="/svg/vue.svg"
              alt="Vue 3"
              class="h-6 sm:h-7 w-auto object-contain filter drop-shadow group-hover:scale-110 transition-transform"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Slanted enterprise logo ribbon using SVGs from apps/web/public/svg
</script>
