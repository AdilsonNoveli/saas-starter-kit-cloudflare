<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useStore } from '~/composables/useStore'
import { useTheme } from '~/composables/useTheme'

// Carrega a configuração pública da loja uma única vez no boot do client.
// O composable é singleton (useState) — qualquer página/composable que chamar
// `useStore()` then receives the same already-populated state.
const { fetch: fetchLoja } = useStore()
const { resolvedTheme } = useTheme()

// Sincroniza a classe e o color-scheme no elemento <html> (SSR-safe)
useHead({
  htmlAttrs: {
    class: computed(() => resolvedTheme.value === 'dark' ? 'dark' : ''),
    style: computed(() => `color-scheme: ${resolvedTheme.value}`),
  }
})

onMounted(async () => {
  await fetchLoja()
})
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>
