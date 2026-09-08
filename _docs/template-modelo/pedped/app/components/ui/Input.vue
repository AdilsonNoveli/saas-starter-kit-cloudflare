<!--
  @descricao: Input ALMA enterprise-grade com estilo brutal
  @objetivo: Input reutilizável seguindo design system ALMA
-->

<script setup lang="ts">
interface Props {
  modelValue?: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'url'
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
  modelValue: '',
  placeholder: undefined,
  error: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleBlur = () => {
  emit('blur')
}
</script>

<template>
  <div>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="[
        'brutal-input w-full px-4 py-3 text-alma-white placeholder-alma-muted/50',
        error && 'border-alma-error',
        disabled && 'opacity-50 cursor-not-allowed',
      ]"
      @input="handleInput"
      @blur="handleBlur"
    >
    <p v-if="error" class="mt-2 text-xs text-alma-error font-mono">
      {{ error }}
    </p>
  </div>
</template>
