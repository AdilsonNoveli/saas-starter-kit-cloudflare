<script setup lang="ts">
import { computed } from 'vue'
import { Calendar } from '@lucide/vue'

const props = defineProps<{
  modelValue: string | null
  disabled?: boolean
  required?: boolean
  label?: string
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

// O input nativo type="date" espera o formato "YYYY-MM-DD" que já é nosso padrão do Supabase
const dateValue = computed({
  get: () => props.modelValue || '',
  set: (val: string) => emit('update:modelValue', val || null)
})
</script>

<template>
  <div class="w-full relative">
    <label v-if="label" class="block text-sm font-semibold text-text-primary mb-1.5">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative flex items-center">
      <span class="absolute left-3 text-text-muted pointer-events-none z-10">
        <Calendar class="w-4 h-4" />
      </span>
      <input
        v-model="dateValue"
        type="date"
        :disabled="disabled"
        :required="required"
        :class="[
          'w-full pl-9 pr-4 py-2 rounded-md border text-left text-sm font-medium outline-none transition-all cursor-pointer',
          'custom-date-input',
          disabled ? 'bg-surface-raised border-border text-text-muted cursor-not-allowed' : 'bg-surface text-text-primary border-border hover:border-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''
        ]"
      >
    </div>

    <p v-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>
  </div>
</template>

<style scoped>
/* Customização Enterprise do ícone nativo */
.custom-date-input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  color: transparent;
  background: transparent;
  cursor: pointer;
}
.custom-date-input::-webkit-datetime-edit {
  padding: 0;
}
</style>
