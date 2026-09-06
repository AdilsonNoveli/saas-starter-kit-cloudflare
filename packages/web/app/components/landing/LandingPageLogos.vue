<template>
  <div class="flex flex-wrap w-full justify-center items-center">
    <div
      v-for="logo in logos"
      :key="logo.title"
      class="p-4 grayscale transition duration-200 hover:grayscale-0"
    >
      <img
        :src="logo.light"
        :class="`${logo.style} block dark:hidden`"
        :alt="logo.title"
      />
      <img
        :src="logo.dark"
        :class="`${logo.style} hidden dark:block`"
        :alt="logo.title"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const logos = [
  {
    light: "/static/nuxt-light.svg",
    dark: "/static/nuxt-dark.svg",
    title: "Nuxt",
    style: "h-12",
  },
  {
    light: "/static/sst-light.svg",
    dark: "/static/sst-dark.svg",
    title: "SST.dev",
    style: "h-12",
  },
];
</script>
