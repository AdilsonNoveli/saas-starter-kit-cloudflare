<!--
  @descricao: Componente Combobox (Select com busca) enterprise-grade
  @objetivo: Combobox reutilizável seguindo governança de tokens
-->

<script setup lang="ts">
import { ref, computed, useId } from 'vue'

interface ComboboxOption {
  value: string | number
  label: string
}

interface ComboboxProps {
  modelValue?: string | number
  options: ComboboxOption[]
  placeholder?: string
  label?: string
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<ComboboxProps>(), {
  modelValue: '',
  placeholder: 'Select an option...',
  label: '',
  disabled: false,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const fallbackId = useId()
const comboboxId = `combobox-${fallbackId}`

const selectedOption = computed(() => props.options.find((opt) => opt.value === props.modelValue))

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options

  return props.options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

function selectOption(value: string | number) {
  emit('update:modelValue', value)
  isOpen.value = false
  searchQuery.value = ''
}

function toggleOpen() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (!isOpen.value) {
      searchQuery.value = ''
    }
  }
}
</script>

<template>
  <div class="relative">
    <label v-if="label" :for="comboboxId" class="block text-sm font-medium text-text-primary mb-2">
      {{ label }}
    </label>

    <div class="relative">
      <button
        :id="comboboxId"
        type="button"
        :disabled="disabled"
        :class="[
          'relative w-full cursor-pointer rounded-md py-1.5 pl-3 pr-10 text-left',
          'bg-surface text-text-primary border border-border shadow-soft',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-200',
          error && 'border-alert focus:border-alert focus:ring-alert/20',
        ]"
        @click="toggleOpen"
      >
        <span class="block truncate text-sm">
          {{ selectedOption?.label || placeholder }}
        </span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg class="h-5 w-5 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </button>

      <div
        v-if="isOpen"
        class="absolute z-10 mt-1 w-full rounded-md bg-surface border border-border shadow-elevated"
      >
        <div class="p-2">
          <input
            v-model="searchQuery"
            type="text"
            class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            placeholder="Search..."
          >
        </div>

        <ul class="max-h-60 overflow-auto py-1">
          <li
            v-for="option in filteredOptions"
            :key="option.value"
            :class="[
              'relative cursor-pointer select-none py-2 pl-3 pr-9 text-sm',
              'hover:bg-surface-raised transition-colors',
              option.value === modelValue ? 'bg-brand/10 text-brand' : 'text-text-primary',
            ]"
            @click="selectOption(option.value)"
          >
            <span class="block truncate">{{ option.label }}</span>
            <span
              v-if="option.value === modelValue"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-brand"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
          </li>

          <li v-if="filteredOptions.length === 0" class="py-2 px-3 text-sm text-text-muted">
            No results found
          </li>
        </ul>
      </div>
    </div>

    <p v-if="error" class="mt-2 text-sm text-alert">
      {{ error }}
    </p>
  </div>
</template>
