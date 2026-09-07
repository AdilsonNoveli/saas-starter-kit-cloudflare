<template>
  <div
    class="min-h-screen w-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-night-950 text-night-100 selection:bg-flame-500/30 selection:text-flame-200"
  >
    <!-- Ambient subtle background pattern -->
    <div
      class="fixed inset-0 pointer-events-none z-0 auth-dots opacity-40"
      aria-hidden="true"
    />

    <!-- Main Content Container: Logo + Card + Subfooter grouped closely -->
    <div class="w-full max-w-md flex flex-col items-center relative z-10 my-auto py-4">
      <!-- Brand Logo right above the card -->
      <div class="mb-5 flex justify-center">
        <slot name="brand">
          <NuxtLink
            to="/"
            aria-label="NuxFire"
            class="transition-opacity hover:opacity-90 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-flame-500 rounded-lg p-1"
          >
            <img
              src="/nuxfire-white.svg"
              alt="NuxFire"
              class="h-8 w-auto block"
            />
          </NuxtLink>
        </slot>
      </div>

      <!-- Center Card (DESIGN_SYSTEM: night-800 background, night-700 border, 1px border without heavy shadows) -->
      <main class="w-full">
        <div
          class="rounded-2xl border border-night-700 bg-night-800 p-6 sm:p-8 space-y-6"
        >
          <!-- Header: Title and subtitle -->
          <header v-if="$slots.header || title" class="text-center space-y-1.5">
            <slot name="header">
              <h1 class="text-2xl font-bold tracking-tight text-night-50">
                {{ title }}
              </h1>
              <p v-if="subtitle" class="text-sm text-night-300">
                {{ subtitle }}
              </p>
            </slot>
          </header>

          <!-- Main form / interaction content -->
          <slot />

          <!-- Card Footer -->
          <footer
            v-if="$slots.footer"
            class="pt-3 border-t border-night-700 text-center text-sm text-night-300"
          >
            <slot name="footer" />
          </footer>
        </div>
      </main>

      <!-- Bottom sub-footer -->
      <footer class="w-full text-center text-xs text-night-500 mt-5">
        <slot name="subfooter">
          <span>NuxFire Enterprise Security</span>
        </slot>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
}>();
</script>
