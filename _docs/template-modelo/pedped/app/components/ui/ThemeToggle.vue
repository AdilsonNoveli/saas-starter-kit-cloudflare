<!--
  @descricao: Botão de alternância de tema (claro/escuro/sistema)
  @objetivo: Componente acessível que cicla entre as 3 preferências de tema,
    consumindo `useTheme()`. Exibe o ícone da preferência atual; uma rotação
    completa faz: system → light → dark → system.
-->

<script setup lang="ts">
import { computed } from 'vue'
import { Sun, Moon, Monitor } from '@lucide/vue'
import { useTheme, type ThemePreference } from '~/composables/useTheme'

interface ThemeToggleProps {
  /** Variante de aparência. `compact` é ideal para sidebar (apenas ícone). */
  variant?: 'compact' | 'full'
}

withDefaults(defineProps<ThemeToggleProps>(), {
  variant: 'compact',
})

const { theme, setTheme } = useTheme()

// Ordem de ciclo: system → light → dark → system
const cycleOrder: readonly ThemePreference[] = ['system', 'light', 'dark'] as const

const currentIcon = computed(() => {
  switch (theme.value) {
    case 'light':
      return Sun
    case 'dark':
      return Moon
    default:
      return Monitor
  }
})

const currentLabel = computed<string>(() => {
  switch (theme.value) {
    case 'light':
      return 'Tema: claro'
    case 'dark':
      return 'Tema: escuro'
    default:
      return 'Tema: sistema'
  }
})

const cycleTheme = (): void => {
  const currentIndex = cycleOrder.indexOf(theme.value)
  const nextIndex = (currentIndex + 1) % cycleOrder.length
  // Garantia de tipo: nextIndex sempre dentro dos limites do array
  setTheme(cycleOrder[nextIndex] ?? 'system')
}
</script>

<template>
  <button
    type="button"
    :title="currentLabel"
    :aria-label="currentLabel"
    class="inline-flex items-center justify-center rounded-full transition-colors text-text-secondary hover:text-text-primary hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="variant === 'compact' ? 'w-12 h-12' : 'px-4 py-3 gap-2'"
    @click="cycleTheme"
  >
    <component :is="currentIcon" class="w-5 h-5 shrink-0" />
    <span v-if="variant === 'full'" class="font-medium text-sm">{{ currentLabel }}</span>
  </button>
</template>
