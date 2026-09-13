<!--
  @descricao: Header de seção padronizado com eyebrow, título e descrição
  @objetivo: Componente reutilizável para headers de seções
  @origem: Headers das seções portfolio, tecnologia, parque, compliance
-->

<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="space-y-8">
    <!-- Eyebrow -->
    <div class="flex items-center gap-3">
      <div class="w-2 h-2 bg-alma-accent"/>
      <span class="font-mono text-[10px] text-alma-accent tracking-widest uppercase">
        {{ eyebrow }}
      </span>
    </div>

    <!-- Title -->
    <h2 class="text-3xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-alma-white">
      <slot name="title">{{ title }}</slot>
    </h2>

    <!-- Description -->
    <p 
      v-if="description" 
      class="text-alma-muted font-light text-lg leading-relaxed max-w-3xl"
    >
      {{ description }}
    </p>

    <!-- Extra Content Slot -->
    <slot />
  </div>
</template>
