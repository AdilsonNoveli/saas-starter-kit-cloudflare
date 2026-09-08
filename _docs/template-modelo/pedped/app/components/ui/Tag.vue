<!--
  @descricao: Componente Tag reutilizável com variantes e tamanhos
  @objetivo: Exibir tags/labels com estilos consistentes
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md
-->

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
  removable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  removable: false,
})

const emit = defineEmits<{
  remove: []
}>()

/**
 * @funcao: handleRemove
 * @parametros: Nenhum
 * @retorno: void
 * @descricao: Remove a tag
 * @objetivo: Permitir que usuário remova a tag
 */
function handleRemove(): void {
  emit('remove')
}

// Computar classes baseado em tokens
const tagClasses = computed(() => {
  const baseClasses = 'inline-flex items-center gap-2 rounded-full font-medium transition-colors'

  const variantClasses = {
    default: 'bg-interactive-secondary text-text-primary hover:bg-interactive-secondary-hover',
    success: 'bg-success/20 text-success hover:bg-success/30',
    warning: 'bg-warning/20 text-warning hover:bg-warning/30',
    error: 'bg-alert/20 text-alert hover:bg-alert/30',
    info: 'bg-info/20 text-info hover:bg-info/30',
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  }

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]}`
})

const removeButtonClasses = computed(() => {
  const baseClasses =
    'inline-flex items-center justify-center rounded-full hover:opacity-70 transition-opacity'

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
  }

  return `${baseClasses} ${sizeClasses[props.size]}`
})
</script>

<template>
  <span :class="tagClasses">
    <slot />
    <button
      v-if="removable"
      type="button"
      :class="removeButtonClasses"
      aria-label="Remover tag"
      @click="handleRemove"
    >
      ✕
    </button>
  </span>
</template>
