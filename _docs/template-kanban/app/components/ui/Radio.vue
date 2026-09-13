<!--
  @descricao: Componente Radio button enterprise-grade com suporte a estados e acessibilidade
  @objetivo: Input radio reutilizável seguindo governança de tokens do design system
-->

<script setup lang="ts">
import { computed, useId } from 'vue'

interface RadioProps {
  modelValue?: string | number | boolean
  value: string | number | boolean
  label?: string
  disabled?: boolean
  name?: string
  id?: string
}

const props = withDefaults(defineProps<RadioProps>(), {
  modelValue: undefined,
  label: undefined,
  disabled: false,
  name: undefined,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean]
}>()

const fallbackId = useId()
const radioId = props.id || `radio-${fallbackId}`

const isChecked = computed(() => props.modelValue === props.value)

function handleChange() {
  if (!props.disabled) {
    emit('update:modelValue', props.value)
  }
}
</script>

<template>
  <div class="flex items-center">
    <input
      :id="radioId"
      type="radio"
      :name="name"
      :value="value"
      :checked="isChecked"
      :disabled="disabled"
      :class="[
        'ui-radio preserve-circle relative size-4 appearance-none rounded-full',
        'border bg-surface border-brand-green/60 hover:border-brand-green',
        'before:preserve-circle before:absolute before:inset-1 before:rounded-full before:bg-surface',
        'not-checked:before:hidden',
        'checked:border-brand-green checked:bg-brand-green',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green',
        'disabled:border-border disabled:bg-surface-raised disabled:cursor-not-allowed disabled:before:bg-text-muted',
        'transition-colors duration-200',
      ]"
      :aria-checked="isChecked"
      @change="handleChange"
    >
    <label
      v-if="label"
      :for="radioId"
      :class="[
        'ml-3 block text-sm font-medium',
        disabled ? 'text-text-muted cursor-not-allowed' : 'text-text-primary cursor-pointer',
      ]"
    >
      {{ label }}
    </label>
  </div>
</template>
