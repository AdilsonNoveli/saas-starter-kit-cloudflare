<!--
  @descricao: Componente Dropdown reutilizável com variantes e tamanhos
  @objetivo: Exibir menu de opções (seleção, ações, navegação)
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md, lg
-->

<script setup lang="ts">
interface MenuItem {
  id: string
  label: string
  icon?: string
  imageUrl?: string
  disabled?: boolean
  divider?: boolean
}

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  items: MenuItem[]
  label?: string
  icon?: string
  imageUrl?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  disabled: false,
  label: undefined,
  icon: undefined,
  imageUrl: undefined,
})

const emit = defineEmits<{
  select: [id: string]
}>()

const isOpen = ref(false)
const triggerRef = ref<HTMLElement>()
const menuRef = ref<HTMLElement>()

/**
 * @funcao: handleSelect
 * @parametros: id - ID do item selecionado
 * @retorno: void
 * @descricao: Seleciona um item do dropdown
 * @objetivo: Emitir evento de seleção e fechar menu
 */
function handleSelect(id: string): void {
  emit('select', id)
  isOpen.value = false
}

/**
 * @funcao: toggleMenu
 * @parametros: Nenhum
 * @retorno: void
 * @descricao: Abre/fecha o menu
 * @objetivo: Controlar visibilidade do dropdown
 */
function toggleMenu(): void {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

/**
 * @funcao: handleClickOutside
 * @parametros: event - Evento de clique
 * @retorno: void
 * @descricao: Fecha menu ao clicar fora
 * @objetivo: Melhorar UX do dropdown
 */
function handleClickOutside(event: MouseEvent): void {
  if (
    triggerRef.value &&
    menuRef.value &&
    !triggerRef.value.contains(event.target as Node) &&
    !menuRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Computar classes do menu
const menuClasses = computed(() => {
  const baseClasses = 'absolute top-full right-0 mt-2 min-w-[70px] max-w-[calc(100vw-2rem)] max-h-[80vh] w-auto rounded-md border border-border bg-surface shadow-elevated z-50 overflow-y-auto overflow-x-hidden'

  return baseClasses
})

// Computar classes do item
const getItemClasses = (item: MenuItem) => {
  const baseClasses = 'w-full flex justify-center items-center px-2 py-2 transition-colors'

  if (item.divider) {
    return 'border-t border-border my-1'
  }

  if (item.disabled) {
    return `${baseClasses} opacity-50 cursor-not-allowed text-text-muted`
  }

  return `${baseClasses} hover:bg-surface-raised cursor-pointer text-text-primary`
}
</script>

<template>
  <div class="relative inline-block">
    <!-- Trigger -->
    <button
      ref="triggerRef"
      type="button"
      class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 bg-transparent text-text-primary shadow-xs hover:bg-interactive-secondary border border-border group/toggle h-9 px-3"
      @click="toggleMenu"
    >
      <NuxtImg v-if="imageUrl" :src="imageUrl" alt="" loading="lazy" class="w-6 aspect-4/3 rounded-[2px] object-cover" />
      <span v-else-if="icon" class="text-lg">{{ icon }}</span>
      <span v-if="label">{{ label }}</span>
      <span class="text-xs">{{ isOpen ? '▲' : '▼' }}</span>
    </button>

    <!-- Menu -->
    <Transition name="dropdown">
      <div v-if="isOpen" ref="menuRef" :class="menuClasses">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          :class="getItemClasses(item)"
          :disabled="item.disabled"
          @click="!item.disabled && !item.divider && handleSelect(item.id)"
        >
          <div v-if="!item.divider" class="flex items-center justify-center gap-2">
            <NuxtImg v-if="item.imageUrl" :src="item.imageUrl" alt="" loading="lazy" class="w-6 aspect-4/3 rounded-[2px] object-cover" />
            <span v-else-if="item.icon" class="text-lg">{{ item.icon }}</span>
            <span v-if="item.label">{{ item.label }}</span>
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
