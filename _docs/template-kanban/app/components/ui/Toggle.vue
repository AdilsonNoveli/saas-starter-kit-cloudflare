<script setup lang="ts">
interface ToggleProps {
  modelValue: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<ToggleProps>(), {
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return { container: 'h-5 w-9', thumb: 'h-4 w-4', on: 'translate-x-4', off: 'translate-x-0' }
    case 'lg':
      return { container: 'h-7 w-13', thumb: 'h-6 w-6', on: 'translate-x-6', off: 'translate-x-0' }
    default:
      return { container: 'h-6 w-11', thumb: 'h-5 w-5', on: 'translate-x-5', off: 'translate-x-0' }
  }
})
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    :class="[
      'ui-toggle preserve-circle relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2',
      modelValue ? 'bg-brand-green border-brand-green' : 'bg-surface-raised border-brand-green/50 hover:border-brand-green',
      disabled ? 'opacity-50 cursor-not-allowed' : '',
      sizeClasses.container,
    ]"
    @click="toggle"
  >
    <span class="sr-only">{{ modelValue ? 'Ativado' : 'Desativado' }}</span>
    <span
      :class="[
        'preserve-circle pointer-events-none absolute left-0.5 inline-block rounded-full bg-white shadow',
        'transform ring-0 transition duration-200 ease-in-out',
        modelValue ? sizeClasses.on : sizeClasses.off,
        sizeClasses.thumb,
      ]"
    />
  </button>
</template>
