<!--
  @descricao: Cauda (tail) estilo WhatsApp Web com continuidade perfeita de borda e máscara de emenda.
  @responsabilidade: Integrar o traço da borda e o preenchimento opaco de modo que o contorno do balão envolva a cauda sem cortes.
-->

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  readonly direction: 'left' | 'right'
  readonly variant?: 'client' | 'staff' | 'agent' | 'storefront-user' | 'storefront-assistant'
  readonly customFillClass?: string
  readonly customStrokeClass?: string
}>()

const fillClass = computed(() => {
  if (props.customFillClass) return props.customFillClass
  if (props.variant === 'storefront-user') {
    return 'fill-brand-green'
  }
  if (props.variant === 'storefront-assistant') {
    return 'fill-surface'
  }
  if (props.direction === 'left') {
    return 'fill-surface'
  }
  if (props.variant === 'staff') {
    return 'fill-blue-50 dark:fill-[#0c1e38]'
  }
  return 'fill-emerald-50 dark:fill-[#062c1d]'
})

const strokeClass = computed(() => {
  if (props.customStrokeClass) return props.customStrokeClass
  if (props.variant === 'storefront-user') {
    return 'stroke-brand-green'
  }
  if (props.variant === 'storefront-assistant') {
    return 'stroke-border'
  }
  if (props.direction === 'left') {
    return 'stroke-border'
  }
  if (props.variant === 'staff') {
    return 'stroke-blue-200 dark:stroke-blue-800/70'
  }
  return 'stroke-emerald-200 dark:stroke-emerald-800/70'
})
</script>

<template>
  <!-- Cauda Esquerda (Mensagem do Cliente) -->
  <svg
    v-if="direction === 'left'"
    viewBox="0 0 12 16"
    width="12"
    height="16"
    class="absolute -top-[1px] -left-[10px] pointer-events-none z-10"
  >
    <!-- Máscara de preenchimento que avança 2px para dentro do balão e elimina a borda vertical subjacente -->
    <path
      d="M 1,1 L 11.5,1 L 11.5,14 L 10,14 C 7,9.5 4,4.5 1,1 Z"
      :class="fillClass"
    />
    <!-- Contorno contínuo da borda que se conecta ao topo e à lateral do balão -->
    <path
      d="M 11.5,1 L 1,1 C 4,4.5 7,9.5 10,14"
      fill="none"
      :class="strokeClass"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>

  <!-- Cauda Direita (Mensagem da Loja / Agente) -->
  <svg
    v-else
    viewBox="0 0 12 16"
    width="12"
    height="16"
    class="absolute -top-[1px] -right-[10px] pointer-events-none z-10"
  >
    <!-- Máscara de preenchimento que avança 2px para dentro do balão e elimina a borda vertical subjacente -->
    <path
      d="M 11,1 L 0.5,1 L 0.5,14 L 2,14 C 5,9.5 8,4.5 11,1 Z"
      :class="fillClass"
    />
    <!-- Contorno contínuo da borda que se conecta ao topo e à lateral do balão -->
    <path
      d="M 0.5,1 L 11,1 C 8,4.5 5,9.5 2,14"
      fill="none"
      :class="strokeClass"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
