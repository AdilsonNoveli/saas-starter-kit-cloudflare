<!--
  @descricao: Componente Textarea enterprise-grade com suporte a estados e acessibilidade
  @objetivo: Textarea reutilizável seguindo governança de tokens do design system
-->

<script setup lang="ts">
import { useId } from 'vue'

interface TextareaProps {
  modelValue?: string
  label?: string
  placeholder?: string
  rows?: number
  error?: string
  helperText?: string
  disabled?: boolean
  required?: boolean
  maxlength?: number
  id?: string
  noShadow?: boolean
}

const props = withDefaults(defineProps<TextareaProps>(), {
  modelValue: undefined,
  label: undefined,
  placeholder: undefined,
  rows: 4,
  error: undefined,
  helperText: undefined,
  disabled: false,
  required: false,
  maxlength: undefined,
  id: undefined,
  noShadow: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fallbackId = useId()
const textareaId = props.id || `textarea-${fallbackId}`

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div>
    <label v-if="label" :for="textareaId" class="block text-sm font-medium text-text-primary mb-2">
      {{ label }}
      <span v-if="required" class="text-alert">*</span>
    </label>

    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :required="required"
      :maxlength="maxlength"
      :class="[
        'block w-full rounded-md px-3 py-1.5 text-base',
        'bg-surface text-text-primary',
        'border',
        'placeholder:text-text-muted',
        'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-raised',
        'transition-colors duration-200',
        noShadow ? 'shadow-none' : 'shadow-soft',
        'resize-y',
        error ? 'border-alert focus:border-alert focus:ring-alert/20' : 'border-border',
      ]"
      :aria-invalid="!!error"
      :aria-describedby="
        error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
      "
      @input="handleInput"
    />

    <p
      v-if="helperText && !error"
      :id="`${textareaId}-helper`"
      class="mt-2 text-sm text-text-secondary"
    >
      {{ helperText }}
    </p>

    <p v-if="error" :id="`${textareaId}-error`" class="mt-2 text-sm text-alert">
      {{ error }}
    </p>

    <p v-if="maxlength && modelValue" class="mt-1 text-xs text-text-muted text-right">
      {{ modelValue.length }} / {{ maxlength }}
    </p>
  </div>
</template>
