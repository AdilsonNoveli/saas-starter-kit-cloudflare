<!--
  @descricao: Componente Tooltip reutilizável com variantes e tamanhos
  @objetivo: Exibir dicas ao passar o mouse com estilos consistentes
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md
-->

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  position: 'top',
})

const isVisible = ref(false)

/**
 * @funcao: showTooltip
 * @parametros: Nenhum
 * @retorno: void
 * @descricao: Mostra o tooltip
 * @objetivo: Exibir dica ao usuário
 */
function showTooltip(): void {
  isVisible.value = true
}

/**
 * @funcao: hideTooltip
 * @parametros: Nenhum
 * @retorno: void
 * @descricao: Esconde o tooltip
 * @objetivo: Ocultar dica
 */
function hideTooltip(): void {
  isVisible.value = false
}

// Computar classes baseado em tokens
const tooltipClasses = computed(() => {
  const baseClasses = 'absolute z-50 px-2 py-1 rounded-md font-medium whitespace-nowrap pointer-events-none transition-opacity'

  const variantClasses = {
    default: 'bg-surface-raised border border-border text-text-primary',
    success: 'bg-secondary-600 text-white',
    warning: 'bg-warning-500 text-white',
    error: 'bg-danger-600 text-white',
    info: 'bg-primary-600 text-white',
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  }

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }

  const visibilityClass = isVisible.value ? 'opacity-100' : 'opacity-0 pointer-events-none'

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]} ${positionClasses[props.position]} ${visibilityClass}`
})

const containerClasses = 'relative inline-block'
</script>

<template>
  <div :class="containerClasses" @mouseenter="showTooltip" @mouseleave="hideTooltip">
    <slot />
    <div :class="tooltipClasses" role="tooltip">
      {{ text }}
    </div>
  </div>
</template>
