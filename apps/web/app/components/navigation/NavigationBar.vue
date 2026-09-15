<template>
  <!-- Header Bar expanded to match natural container width -->
  <div class="w-full backdrop-blur-xl bg-default/90 border-b border-default">
    <div
      class="container mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between"
    >
      <!-- Left: Brand Logo -->
      <div class="flex items-center shrink-0">
        <NuxtLink to="/" aria-label="NuxFire" class="flex items-center shrink-0">
          <img src="/nuxfire.svg" alt="NuxFire" class="h-8 w-auto dark:hidden" />
          <img src="/nuxfire-white.svg" alt="NuxFire" class="h-8 w-auto hidden dark:block" />
        </NuxtLink>
      </div>

      <!-- Center: Navigation Links (HOME | DOCS | BLOG) -->
      <div class="hidden lg:flex items-center justify-center">
        <UNavigationMenu
          class="text-xs uppercase tracking-widest font-semibold"
          :items="links"
          variant="link"
        />
      </div>

      <!-- Right: ColorMode + Search + Login button -->
      <div class="hidden lg:flex items-center justify-end gap-2.5 shrink-0">
        <ColorModeSwitch v-if="route.path !== '/'" />
        <Search />
        <NuxtLink
          :to="useRuntimeConfig().public.appUrl || '/signup'"
          external
          class="ml-1 inline-flex items-center justify-center h-9 px-4 rounded-md text-xs font-bold tracking-wider uppercase bg-emerald-500 hover:bg-emerald-400 text-night-950 shadow-sm shadow-emerald-500/25 transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
        >
          LOGIN TO COMMUNITY
        </NuxtLink>
      </div>

      <!-- Mobile toggle -->
      <div class="flex items-center justify-end gap-2 lg:hidden">
        <ColorModeSwitch v-if="route.path !== '/'" />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-menu"
          @click="show = !show"
        />
      </div>
    </div>
  </div>

  <!-- Mobile Drawer -->
  <div
    class="block lg:hidden overflow-hidden transition-all duration-300 bg-default/95 border-b border-default backdrop-blur-xl"
    :class="[show ? 'h-auto py-4' : 'h-0 py-0']"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <Search class="mb-3" />
      <UNavigationMenu
        orientation="vertical"
        :items="mobileLinks"
        variant="link"
      />
      <div class="pt-3 mt-3 flex items-center justify-between border-t border-default">
        <NuxtLink
          :to="useRuntimeConfig().public.appUrl || '/signup'"
          external
          class="inline-flex items-center justify-center h-9 px-4 rounded-md text-xs font-bold tracking-wider uppercase bg-emerald-500 hover:bg-emerald-400 text-night-950 shadow-sm shadow-emerald-500/25 transition-all duration-150 active:scale-95 cursor-pointer"
        >
          LOGIN TO COMMUNITY
        </NuxtLink>
      </div>
      <div v-if="useRoute().path?.startsWith('/docs')" class="pt-3">
        <USeparator />
        <DocsSidebar is-mobile />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const show = ref(false);
const links = [
  { label: "Home", to: "/" },
  { label: "Docs", to: "/docs" },
  { label: "Blog", to: "/blog" },
];

const mobileLinks = computed(() => [...links]);
</script>

