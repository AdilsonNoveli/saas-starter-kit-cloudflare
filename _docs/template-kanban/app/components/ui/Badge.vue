<!--
  @descricao: Badge técnico com ícone SVG opcional
  @objetivo: Exibir badges com ícone, label e estilos ALMA
  @origem: Linha ~1225 do HTML (badge na seção hero)
-->

<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <div
    class="inline-flex items-center gap-3 px-4 py-2 bg-alma-surface brutal-border border-alma-border"
  >
    <slot name="icon">
      <svg class="w-4 h-4 text-alma-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="square"
          stroke-linejoin="miter"
          stroke-width="2"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </slot>
    <span class="font-mono text-xs tracking-[0.2em] text-alma-muted uppercase">{{ label }}</span>
  </div>
</template>
