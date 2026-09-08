<!--
  @descricao: Componente Tabs reutilizável com variantes e tamanhos
  @objetivo: Organizar conteúdo em abas (navegação, organização)
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md, lg
-->

<script setup lang="ts">
interface TabItem {
  id: string
  label: string
  icon?: string
  disabled?: boolean
}

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  tabs: TabItem[]
  activeTab?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  activeTab: undefined,
})

const emit = defineEmits<{
  change: [id: string]
}>()

const currentTab = ref(props.activeTab || props.tabs[0]?.id || '')

watch(() => props.activeTab, (newVal) => {
  if (newVal) {
    currentTab.value = newVal
  }
})

/**
 * @funcao: handleTabChange
 * @parametros: id - ID da aba
 * @retorno: void
 * @descricao: Muda a aba ativa
 * @objetivo: Emitir evento de mudança e atualizar estado
 */
function handleTabChange(id: string): void {
  const tab = props.tabs.find(t => t.id === id)
  if (tab && !tab.disabled) {
    currentTab.value = id
    emit('change', id)
  }
}

// Computar classes do container
const containerClasses = computed(() => {
  const baseClasses = 'w-full'
  return baseClasses
})

// Computar classes da lista de abas
const tabListClasses = computed(() => {
  const baseClasses = 'flex border-b border-border gap-0'
  return baseClasses
})

// Computar classes de cada aba
const getTabClasses = (tab: TabItem) => {
  const baseClasses = 'px-4 py-3 font-medium transition-colors border-b-2 rounded-none -mb-px'

  const variantClasses = {
    default: currentTab.value === tab.id
      ? 'border-brand text-brand'
      : 'border-transparent text-text-secondary hover:text-text-primary',
    success: currentTab.value === tab.id
      ? 'border-success text-success'
      : 'border-transparent text-text-secondary hover:text-text-primary',
    warning: currentTab.value === tab.id
      ? 'border-warning text-warning'
      : 'border-transparent text-text-secondary hover:text-text-primary',
    error: currentTab.value === tab.id
      ? 'border-alert text-alert'
      : 'border-transparent text-text-secondary hover:text-text-primary',
    info: currentTab.value === tab.id
      ? 'border-info text-info'
      : 'border-transparent text-text-secondary hover:text-text-primary',
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const disabledClasses = tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]} ${disabledClasses}`
}

// Computar classes do conteúdo
const contentClasses = computed(() => {
  const baseClasses = 'py-4'
  return baseClasses
})
</script>

<template>
  <div :class="containerClasses">
    <!-- Tab List -->
    <div :class="tabListClasses" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="getTabClasses(tab)"
        :disabled="tab.disabled"
        :aria-selected="currentTab === tab.id"
        role="tab"
        @click="handleTabChange(tab.id)"
      >
        <div class="flex items-center gap-2">
          <span v-if="tab.icon" class="text-lg">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </div>
      </button>
    </div>

    <!-- Tab Content -->
    <div :class="contentClasses" role="tabpanel">
      <slot :active-tab="currentTab" />
    </div>
  </div>
</template>
