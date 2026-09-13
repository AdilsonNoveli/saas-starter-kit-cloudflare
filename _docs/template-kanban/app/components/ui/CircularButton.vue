<!--
  @descricao: Componente CircularButton enterprise-grade para botões circulares com ícones
  @objetivo: Botão circular reutilizável seguindo governança de tokens
-->

<script setup lang="ts">
interface CircularButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<CircularButtonProps>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  type: 'button',
})

const variantClasses = {
  primary: 'bg-brand text-text-inverse hover:bg-brand-hover',
  secondary: 'bg-interactive-secondary text-text-primary hover:bg-interactive-secondary-hover',
  destructive: 'bg-alert text-text-inverse hover:bg-alert/90',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-raised',
}

const sizeClasses = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
}
</script>

<template>
  <button
    :type="type"
    :class="[
      'rounded-full shadow-soft',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'transition-colors duration-200',
      'inline-flex items-center justify-center',
      variantClasses[variant],
      sizeClasses[size],
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
