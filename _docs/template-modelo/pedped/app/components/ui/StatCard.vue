<!--
  @descricao: Card de métrica/estatística com borda colorida
  @objetivo: Exibir valor e label com borda lateral
  @origem: Linha ~1376 do HTML (stats na seção portfolio)
-->

<script setup lang="ts">
defineProps<{
  value: string
  label: string
  accent?: boolean
}>()
</script>

<template>
  <div 
    class="border-l-2 pl-3"
    :class="accent ? 'border-alma-accent/30' : 'border-alma-border'"
  >
    <div class="font-mono text-2xl font-bold text-alma-white">{{ value }}</div>
    <div class="font-mono text-[9px] text-alma-muted uppercase tracking-widest mt-1">
      {{ label }}
    </div>
  </div>
</template>
