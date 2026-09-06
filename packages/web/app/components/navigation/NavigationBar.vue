<template>
  <!-- Full-width header flush to top — enterprise grade -->
  <div
    class="flex justify-between items-center gap-4 px-6 h-14 backdrop-blur-xl bg-white/90 dark:bg-neutral-900/90 border-b border-zinc-200 dark:border-zinc-800"
  >
    <!-- Left: Brand Logo + Navigation Links -->
    <div class="flex items-center gap-8 min-w-0">
      <NuxtLink to="/" aria-label="NuxFire" class="flex items-center shrink-0">
        <img src="/nuxfire.svg" alt="NuxFire" class="h-8 w-auto dark:hidden" />
        <img src="/nuxfire-white.svg" alt="NuxFire" class="h-8 w-auto hidden dark:block" />
      </NuxtLink>

      <!-- Navigation Links: HOME | DOCS | BLOG | CONTACT -->
      <UNavigationMenu
        class="hidden lg:block text-xs uppercase tracking-widest font-semibold"
        :items="links"
        variant="link"
      />
    </div>

    <!-- Right: ColorMode + Search + Dashboard button -->
    <div class="hidden lg:flex items-center gap-2 shrink-0">
      <ColorModeSwitch />
      <Search />
      <NuxtLink
        :to="useRuntimeConfig().public.appUrl || '/'"
        external
        class="ml-1 inline-flex items-center justify-center h-8 px-4 text-xs font-semibold tracking-wide rounded border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-transparent text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        Dashboard
      </NuxtLink>
    </div>

    <!-- Mobile toggle -->
    <div class="flex items-center gap-2 lg:hidden">
      <ColorModeSwitch />
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-menu"
        @click="show = !show"
      />
    </div>
  </div>

  <!-- Mobile Drawer -->
  <div
    class="block lg:hidden overflow-hidden transition-all duration-300 bg-white/95 dark:bg-neutral-900/95 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-xl"
    :class="[show ? 'h-auto p-4' : 'h-0 p-0']"
  >
    <Search class="mb-3" />
    <UNavigationMenu
      orientation="vertical"
      :items="mobileLinks"
      variant="link"
    />
    <div class="pt-3 mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800">
      <NuxtLink
        :to="useRuntimeConfig().public.appUrl || '/'"
        external
        class="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-700 dark:text-zinc-200 transition-colors"
      >
        Dashboard
      </NuxtLink>
    </div>
    <div v-if="useRoute().path?.startsWith('/docs')" class="pt-3">
      <USeparator />
      <DocsSidebar is-mobile />
    </div>
  </div>
</template>

<script setup lang="ts">
const show = ref(false);
const links = [
  { label: "Home", to: "/" },
  { label: "Docs", to: "/docs" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

const mobileLinks = computed(() => [...links]);
</script>

