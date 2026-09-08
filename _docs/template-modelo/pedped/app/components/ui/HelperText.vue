<!--
  @descricao: Componente HelperText enterprise-grade para mensagens de ajuda
  @objetivo: Texto de ajuda reutilizável seguindo governança de tokens do design system
-->

<script setup lang="ts">
interface HelperTextProps {
  variant?: 'default' | 'error' | 'success'
  id?: string
}

const { variant = 'default', id = '' } = defineProps<HelperTextProps>()

const variantClasses = {
  default: 'text-text-secondary',
  error: 'text-alert',
  success: 'text-success',
}
</script>

<template>
  <p :id="id" :class="['text-sm', variantClasses[variant]]">
    <slot />
  </p>
</template>
