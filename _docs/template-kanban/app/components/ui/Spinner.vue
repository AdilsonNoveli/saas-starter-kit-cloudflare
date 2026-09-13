<!--
  @descricao: Componente Spinner reutilizável com variantes e tamanhos
  @objetivo: Indicador de carregamento com estilos consistentes
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md
-->

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  label: undefined,
})

// Computar classes baseado em tokens
const spinnerClasses = computed(() => {
  const baseClasses = 'inline-block animate-spin rounded-full border-2 border-current border-t-transparent'

  const variantClasses = {
    default: 'text-brand',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-alert',
    info: 'text-info',
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
  }

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]}`
})

const containerClasses = computed(() => {
  return props.label ? 'inline-flex items-center gap-2' : ''
})

const labelClasses = computed(() => {
  const baseClasses = 'text-sm font-medium'

  const variantClasses = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-alert',
    info: 'text-info',
  }

  return `${baseClasses} ${variantClasses[props.variant]}`
})
</script>

<template>
  <div :class="containerClasses">
    <div :class="spinnerClasses" role="status" aria-label="Carregando">
      <span class="sr-only">Carregando...</span>
    </div>
    <span v-if="label" :class="labelClasses">
      {{ label }}
    </span>
  </div>
</template>
