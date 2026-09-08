<!--
  @descricao: Componente Divider reutilizável com variantes e tamanhos
  @objetivo: Separador visual com estilos consistentes
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md
-->

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  orientation: 'horizontal',
  label: undefined,
})

// Computar classes baseado em tokens
const dividerClasses = computed(() => {
  const baseClasses = 'flex items-center'

  const orientationClasses = {
    horizontal: 'w-full',
    vertical: 'h-full flex-col',
  }

  return `${baseClasses} ${orientationClasses[props.orientation]}`
})

const lineClasses = computed(() => {
  const baseClasses = 'flex-1'

  const variantClasses = {
    default: 'bg-border',
    success: 'bg-success/30',
    warning: 'bg-warning/30',
    error: 'bg-alert/30',
    info: 'bg-info/30',
  }

  const sizeClasses = {
    sm: props.orientation === 'horizontal' ? 'h-px' : 'w-px',
    md: props.orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
  }

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]}`
})

const labelClasses = computed(() => {
  const baseClasses = 'px-3 text-sm font-medium'

  const variantClasses = {
    default: 'text-text-secondary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-alert',
    info: 'text-info',
  }

  return `${baseClasses} ${variantClasses[props.variant]}`
})
</script>

<template>
  <div :class="dividerClasses">
    <div :class="lineClasses" />
    <span v-if="label" :class="labelClasses">
      {{ label }}
    </span>
    <div :class="lineClasses" />
  </div>
</template>
