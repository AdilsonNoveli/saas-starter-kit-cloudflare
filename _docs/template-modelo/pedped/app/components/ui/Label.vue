<!--
  @descricao: Componente Label enterprise-grade para formulários
  @objetivo: Label reutilizável seguindo governança de tokens do design system
-->

<script setup lang="ts">
interface LabelProps {
  for?: string
  required?: boolean
}

const props = defineProps<LabelProps>()
</script>

<template>
  <label :for="props.for" class="block text-sm font-medium text-text-primary">
    <slot />
    <span v-if="required" class="text-alert ml-1">*</span>
  </label>
</template>
