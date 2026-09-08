<script setup lang="ts">
/**
 * UiInfoTip — ícone de informação (Info do Lucide) com tooltip hover.
 * Usa o UiTooltip existente internamente; expõe apenas o texto da dica.
 *
 * Uso:
 *   <UiInfoTip text="Explicação do campo" />
 *   <UiInfoTip text="..." position="right" />
 */
import { Info } from '@lucide/vue'

interface Props {
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

withDefaults(defineProps<Props>(), {
  position: 'top',
})
</script>

<template>
  <UiTooltip :text="text" :position="position" variant="info" size="sm">
    <Info
      class="w-3.5 h-3.5 text-primary-500 shrink-0 cursor-help"
      aria-hidden="true"
    />
  </UiTooltip>
</template>
