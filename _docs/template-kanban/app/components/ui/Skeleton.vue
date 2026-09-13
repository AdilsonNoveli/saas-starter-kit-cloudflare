<!--
  @descricao: Componente Skeleton enterprise-grade para loading states
  @objetivo: Loading skeleton reutilizável seguindo governança de tokens do design system
-->

<script setup lang="ts">
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string
  height?: string
}

const props = withDefaults(defineProps<SkeletonProps>(), {
  variant: 'text',
  width: undefined,
  height: undefined,
})

const variantClasses = {
  text: 'h-4 w-full rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-md',
}

const style = computed(() => ({
  width: props.width,
  height: props.height,
}))
</script>

<template>
  <div
    :class="['bg-surface-raised animate-pulse', variantClasses[variant]]"
    :style="style"
    aria-busy="true"
    aria-label="Loading"
  />
</template>
