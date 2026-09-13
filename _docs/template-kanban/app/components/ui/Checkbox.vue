<!--
  @descricao: Componente Checkbox enterprise-grade com suporte a estados e acessibilidade
  @objetivo: Input checkbox reutilizável seguindo governança de tokens do design system
-->

<script setup lang="ts">
import { useId } from 'vue'

interface CheckboxProps {
  modelValue?: boolean
  label?: string
  disabled?: boolean
  error?: string
  id?: string
}

const props = withDefaults(defineProps<CheckboxProps>(), {
  modelValue: false,
  label: undefined,
  disabled: false,
  error: undefined,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const fallbackId = useId()
const checkboxId = props.id || `checkbox-${fallbackId}`

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <div class="relative flex items-start">
    <div class="flex h-6 items-center">
      <div class="group grid size-4 grid-cols-1">
        <input
          :id="checkboxId"
          type="checkbox"
          :checked="modelValue"
          :disabled="disabled"
          :class="[
            'col-start-1 row-start-1 appearance-none rounded-sm',
            'border bg-surface',
            'checked:border-brand-green checked:bg-brand-green',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green',
            'disabled:border-border disabled:bg-surface-raised disabled:cursor-not-allowed',
            'transition-colors duration-200',
            error ? 'border-alert' : 'border-brand-green/60 hover:border-brand-green',
          ]"
          :aria-invalid="!!error"
          :aria-describedby="error ? `${checkboxId}-error` : undefined"
          @change="handleChange"
        >
        <svg
          class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-text-inverse group-has-disabled:stroke-text-muted"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            class="opacity-0 group-has-checked:opacity-100"
            d="M3 8L6 11L11 3.5"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
    <div v-if="label || error" class="ml-3 text-sm">
      <label
        v-if="label"
        :for="checkboxId"
        :class="[
          'font-medium select-none',
          disabled ? 'text-text-muted cursor-not-allowed' : 'text-text-primary cursor-pointer',
        ]"
      >
        {{ label }}
      </label>
      <p v-if="error" :id="`${checkboxId}-error`" class="mt-1 text-sm text-alert">
        {{ error }}
      </p>
    </div>
  </div>
</template>
