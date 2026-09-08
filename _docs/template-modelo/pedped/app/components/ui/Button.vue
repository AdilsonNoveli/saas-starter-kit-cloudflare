<!--
  @descricao: Button ALMA enterprise-grade com estilo brutal
  @objetivo: Botão reutilizável seguindo design system ALMA
-->

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
})

const buttonClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
}
</script>

<template>
  <button
    :type="type"
    :class="[
      buttonClasses[variant],
      'px-8 py-3 font-mono text-sm',
      'inline-flex items-center justify-center gap-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'transition-all duration-300',
    ]"
    :disabled="disabled || loading"
  >
    <svg
      v-if="loading"
      class="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot />
  </button>
</template>
