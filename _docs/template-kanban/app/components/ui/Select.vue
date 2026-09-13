<script setup lang="ts">
/**
 * @descricao: Select (dropdown) custom da biblioteca de UI.
 * @objetivo: Substituir o `<select>` nativo por um controle consistente com o
 *   design system — tokens semânticos (dark mode automático), painel flutuante
 *   moderno e acessível. Zero cores hardcoded: tudo via tokens (`surface`,
 *   `border`, `text-*`, `primary-*`).
 */
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { ChevronDown, Check } from '@lucide/vue'

/** Valor suportado por uma opção (e pelo v-model). */
export type SelectValue = string | number | boolean | null

export interface Option {
  readonly label: string
  readonly value: SelectValue
}

const props = withDefaults(
  defineProps<{
    modelValue: SelectValue
    options: readonly Option[]
    placeholder?: string
    disabled?: boolean
    ariaLabel?: string
    /** `md` (padrão, formulários) ou `sm` (compacto, células de tabela). */
    size?: 'sm' | 'md'
    /** Trigger com `border-radius: full` (estilo pill, para filtros de header). */
    pill?: boolean
    /** Fundo `surface-raised` com borda transparente (combina com inputs de busca). */
    ghost?: boolean
    /** Usa teleport para renderizar dropdown no body (útil dentro de modals). */
    teleport?: boolean
  }>(),
  {
    placeholder: 'Selecione...',
    disabled: false,
    ariaLabel: undefined,
    size: 'md',
    pill: false,
    ghost: false,
    teleport: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: SelectValue): void
}>()

const isOpen = ref<boolean>(false)
const selectRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

const updateDropdownPosition = (): void => {
  if (!props.teleport || !selectRef.value) return
  
  const rect = selectRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

const toggle = async (): Promise<void> => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  
  if (isOpen.value && props.teleport) {
    await nextTick()
    updateDropdownPosition()
  }
}

const selectOption = (option: Option): void => {
  if (props.disabled) return
  emit('update:modelValue', option.value)
  isOpen.value = false
}

const selectedOption = computed<Option | undefined>(() =>
  props.options.find((opt) => opt.value === props.modelValue),
)

const selectedLabel = computed<string>(() => selectedOption.value?.label ?? props.placeholder)

const triggerSizeClass = computed<string>(() => {
  if (props.pill) {
    return 'h-9 px-4 text-sm'
  }
  return props.size === 'sm' ? 'h-7 px-3 text-xs' : 'h-9 px-4 text-sm'
})

const handleClickOutside = (event: MouseEvent): void => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

const handleScroll = (): void => {
  if (isOpen.value && props.teleport) {
    updateDropdownPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (props.teleport) {
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (props.teleport) {
    window.removeEventListener('scroll', handleScroll, true)
    window.removeEventListener('resize', handleScroll)
  }
})
</script>

<template>
  <div ref="selectRef" class="relative w-full">
    <button
      type="button"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      class="w-full flex items-center justify-between gap-2 border text-left font-medium outline-none transition-colors py-0"
      :class="[
        triggerSizeClass,
        pill ? 'rounded-full' : 'rounded-md',
        disabled
          ? 'bg-surface-raised border-border text-text-muted cursor-not-allowed'
          : ghost
            ? 'bg-surface-raised border-transparent text-text-primary hover:bg-surface-raised/80 focus:ring-2 focus:ring-primary-500/50'
            : 'bg-surface border-border text-text-primary hover:border-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500',
      ]"
      @click="toggle"
    >
      <span class="block truncate" :class="{ 'text-text-muted': !selectedOption }">
        {{ selectedLabel }}
      </span>
      <ChevronDown
        class="w-4 h-4 shrink-0 text-text-muted transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        stroke-width="2"
      />
    </button>

    <Teleport v-if="teleport" to="body" :disabled="!isOpen">
      <transition
        enter-active-class="transition ease-out duration-150"
        enter-from-class="transform opacity-0 scale-95 -translate-y-1"
        enter-to-class="transform opacity-100 scale-100 translate-y-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="transform opacity-100 scale-100 translate-y-0"
        leave-to-class="transform opacity-0 scale-95 -translate-y-1"
      >
        <div
          v-if="isOpen"
          class="bg-surface border border-border rounded-lg shadow-float overflow-hidden origin-top"
          :style="{ ...dropdownStyle, zIndex: '2147483647' }"
        >
          <ul class="max-h-60 overflow-auto py-1 text-sm">
            <li
              v-for="option in options"
              :key="String(option.value)"
              class="cursor-pointer select-none relative py-2.5 pl-3 pr-9 mx-1 rounded-md transition-colors"
              :class="
                option.value === modelValue
                  ? 'bg-surface-raised text-text-primary font-semibold'
                  : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
              "
              @click="selectOption(option)"
            >
              <span class="block truncate">{{ option.label }}</span>
              <span
                v-if="option.value === modelValue"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-600"
              >
                <Check class="w-4 h-4" stroke-width="2.5" />
              </span>
            </li>
          </ul>
        </div>
      </transition>
    </Teleport>

    <transition
      v-if="!teleport"
      enter-active-class="transition ease-out duration-150"
      enter-from-class="transform opacity-0 scale-95 -translate-y-1"
      enter-to-class="transform opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="transform opacity-100 scale-100 translate-y-0"
      leave-to-class="transform opacity-0 scale-95 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-float overflow-hidden origin-top"
      >
        <ul class="max-h-60 overflow-auto py-1 text-sm">
          <li
            v-for="option in options"
            :key="String(option.value)"
            class="cursor-pointer select-none relative py-2.5 pl-3 pr-9 mx-1 rounded-md transition-colors"
            :class="
              option.value === modelValue
                ? 'bg-surface-raised text-text-primary font-semibold'
                : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
            "
            @click="selectOption(option)"
          >
            <span class="block truncate">{{ option.label }}</span>
            <span
              v-if="option.value === modelValue"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-600"
            >
              <Check class="w-4 h-4" stroke-width="2.5" />
            </span>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>
