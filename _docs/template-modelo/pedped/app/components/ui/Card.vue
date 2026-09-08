<!--
  @descricao: Componente Card reutilizável com variantes e tamanhos
  @objetivo: Container para conteúdo com estilos consistentes
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md
-->

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
  hoverable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  hoverable: false,
})

// Computar classes baseado em tokens
const cardClasses = computed(() => {
  const baseClasses = 'rounded-lg border bg-surface overflow-hidden transition-all'

  const variantClasses = {
    default: 'border-border shadow-soft hover:shadow-elevated',
    success: 'border-success/30 bg-success/5 shadow-soft hover:shadow-elevated',
    warning: 'border-warning/30 bg-warning/5 shadow-soft hover:shadow-elevated',
    error: 'border-alert/30 bg-alert/5 shadow-soft hover:shadow-elevated',
    info: 'border-info/30 bg-info/5 shadow-soft hover:shadow-elevated',
  }

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-6',
  }

  const hoverClass = 'hover:shadow-elevated'

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]} ${props.hoverable ? hoverClass : ''}`
})
</script>

<template>
  <div :class="cardClasses">
    <slot />
  </div>
</template>
