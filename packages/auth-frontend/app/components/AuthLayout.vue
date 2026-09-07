<template>
  <div
    class="min-h-screen w-screen flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-primary-500/30 selection:text-primary-200"
  >
    <!-- Ambient background layer -->
    <div
      class="fixed inset-0 pointer-events-none z-0 auth-dots opacity-70"
      aria-hidden="true"
    />

    <!-- Ambient glow behind card -->
    <div
      class="fixed -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-b from-primary-500/15 via-primary-500/5 to-transparent blur-3xl pointer-events-none z-0"
      aria-hidden="true"
    />

    <!-- Top spacer / home anchor -->
    <div class="w-full max-w-md flex justify-center pt-2 relative z-10">
      <slot name="brand">
        <NuxtLink
          to="/"
          aria-label="NuxFire"
          class="transition-opacity hover:opacity-90 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg p-1"
        >
          <img
            src="/nuxfire-white.svg"
            alt="NuxFire"
            class="h-8 w-auto block"
          />
        </NuxtLink>
      </slot>
    </div>

    <!-- Center Card -->
    <main class="w-full max-w-md my-auto py-6 relative z-10">
      <div
        class="rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl p-6 sm:p-8 space-y-6"
      >
        <!-- Header: Title and subtitle -->
        <header v-if="$slots.header || title" class="text-center space-y-1.5">
          <slot name="header">
            <h1 class="text-2xl font-bold tracking-tight text-white">
              {{ title }}
            </h1>
            <p v-if="subtitle" class="text-sm text-zinc-400">
              {{ subtitle }}
            </p>
          </slot>
        </header>

        <!-- Main form / interaction content -->
        <slot />

        <!-- Card Footer -->
        <footer
          v-if="$slots.footer"
          class="pt-2 border-t border-zinc-800/80 text-center text-sm text-zinc-400"
        >
          <slot name="footer" />
        </footer>
      </div>
    </main>

    <!-- Bottom sub-footer -->
    <footer
      class="w-full max-w-md text-center text-xs text-zinc-500 pb-2 relative z-10"
    >
      <slot name="subfooter">
        <span>NuxFire Enterprise Security</span>
      </slot>
    </footer>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
}>();
</script>
