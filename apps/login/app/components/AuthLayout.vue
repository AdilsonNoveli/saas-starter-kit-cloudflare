<template>
  <div
    class="min-h-screen w-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-default text-default selection:bg-primary/30 selection:text-primary"
  >
    <!-- Main Content Container: Logo + Card + Subfooter grouped closely -->
    <div class="w-full max-w-md flex flex-col items-center relative z-10 my-auto py-4">
      <!-- Brand Logo right above the card -->
      <div class="mb-5 flex justify-center">
        <slot name="brand">
          <NuxtLink
            to="/"
            :aria-label="brandName"
            class="transition-opacity hover:opacity-90 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
          >
            <img src="/logo-clear.svg" :alt="brandName" class="h-8 w-auto block dark:hidden" />
            <img src="/logo-dark.svg" :alt="brandName" class="h-8 w-auto hidden dark:block" />
          </NuxtLink>
        </slot>
      </div>

      <!-- Center Card: raised surface (bg-elevated) on a border of the same tone, one step above the page background — no shadow. -->
      <main class="w-full">
        <div
          class="rounded-md border border-default bg-elevated p-6 sm:p-8 space-y-6"
        >
          <!-- Header: Title and subtitle -->
          <header v-if="$slots.header || title" class="text-center space-y-1.5">
            <slot name="header">
              <h1 class="text-2xl font-bold tracking-tight text-highlighted">
                {{ title }}
              </h1>
              <p v-if="subtitle" class="text-sm text-muted">
                {{ subtitle }}
              </p>
            </slot>
          </header>

          <!-- Main form / interaction content -->
          <slot />

          <!-- Card Footer -->
          <footer
            v-if="$slots.footer"
            class="pt-3 border-t border-default text-center text-sm text-muted"
          >
            <slot name="footer" />
          </footer>
        </div>
      </main>

      <!-- Bottom sub-footer -->
      <footer class="w-full text-center text-xs text-dimmed mt-5">
        <slot name="subfooter">
          <span>{{ brandName }} Enterprise Security</span>
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

const { brandName } = useRuntimeConfig().public;
</script>
