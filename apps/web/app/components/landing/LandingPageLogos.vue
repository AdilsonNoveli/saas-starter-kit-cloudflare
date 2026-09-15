<template>
  <div class="w-full py-8 my-2 flex items-center justify-center">
    <div class="flex flex-wrap items-center justify-center gap-10 sm:gap-16 md:gap-20">
      <!-- Cloudflare -->
      <div class="flex items-center opacity-70 hover:opacity-100 transition-opacity duration-200">
        <img
          src="/svg/cloudflare.svg"
          alt="Cloudflare"
          class="h-5 sm:h-6 w-auto object-contain dark:brightness-0 dark:invert"
        />
      </div>

      <!-- GitHub -->
      <div class="flex items-center opacity-70 hover:opacity-100 transition-opacity duration-200">
        <img
          src="/svg/github.svg"
          alt="GitHub"
          class="h-6 sm:h-7 w-auto object-contain dark:brightness-0 dark:invert"
        />
      </div>

      <!-- Google -->
      <div class="flex items-center opacity-80 hover:opacity-100 transition-opacity duration-200">
        <img
          src="/svg/google.svg"
          alt="Google"
          class="h-6 sm:h-7 w-auto object-contain"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// In-line brand wordmarks: Cloudflare, GitHub, Google
</script>
