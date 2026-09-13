<!--
  @descricao: Componente Breadcrumb reutilizável com variantes e tamanhos
  @objetivo: Exibir caminho de navegação (breadcrumb trail)
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md, lg
-->

<script setup lang="ts">
interface BreadcrumbItem {
  id: string
  label: string
  href?: string
  icon?: string
  disabled?: boolean
}

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  items: BreadcrumbItem[]
  separator?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  separator: '/',
})

const emit = defineEmits<{
  navigate: [id: string]
}>()

/**
 * @funcao: handleNavigate
 * @parametros: id - ID do item
 * @retorno: void
 * @descricao: Navega para um item do breadcrumb
 * @objetivo: Emitir evento de navegação
 */
function handleNavigate(id: string): void {
  emit('navigate', id)
}

// Computar classes do container
const containerClasses = computed(() => {
  const baseClasses = 'flex items-center gap-2'
  return baseClasses
})

// Computar classes de cada item
const getItemClasses = (item: BreadcrumbItem, isLast: boolean) => {
  const baseClasses = 'inline-flex items-center gap-1 transition-colors'

  const variantClasses = {
    default: isLast
      ? 'text-text-primary font-medium'
      : 'text-text-secondary hover:text-text-primary cursor-pointer',
    success: isLast
      ? 'text-success font-medium'
      : 'text-success/70 hover:text-success cursor-pointer',
    warning: isLast
      ? 'text-warning font-medium'
      : 'text-warning/70 hover:text-warning cursor-pointer',
    error: isLast
      ? 'text-alert font-medium'
      : 'text-alert/70 hover:text-alert cursor-pointer',
    info: isLast
      ? 'text-info font-medium'
      : 'text-info/70 hover:text-info cursor-pointer',
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const disabledClasses = item.disabled ? 'opacity-50 cursor-not-allowed' : ''

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]} ${disabledClasses}`
}

// Computar classes do separador
const separatorClasses = computed(() => {
  const baseClasses = 'text-text-muted'
  return baseClasses
})
</script>

<template>
  <nav :class="containerClasses" aria-label="Breadcrumb">
    <ol class="flex items-center gap-2">
      <li v-for="(item, index) in items" :key="item.id" class="flex items-center gap-2">
        <!-- Item -->
        <component
          :is="item.href ? 'a' : 'button'"
          type="button"
          :href="item.href"
          :class="getItemClasses(item, index === items.length - 1)"
          :disabled="item.disabled || index === items.length - 1"
          @click="!item.disabled && index !== items.length - 1 && handleNavigate(item.id)"
        >
          <span v-if="item.icon" class="text-lg">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </component>

        <!-- Separator -->
        <span
          v-if="index < items.length - 1"
          :class="separatorClasses"
          aria-hidden="true"
        >
          {{ separator }}
        </span>
      </li>
    </ol>
  </nav>
</template>
