<!--
  @descricao: Componente Avatar enterprise-grade para exibir imagens de perfil
  @objetivo: Avatar reutilizável seguindo governança de tokens
-->

<script setup lang="ts">
interface AvatarProps {
  src?: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
}

const props = withDefaults(defineProps<AvatarProps>(), {
  size: 'md',
  alt: '',
  src: '',
  fallback: '',
})

const sizeClasses = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
  xl: 'size-14',
}

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

const initials = computed(() => {
  if (props.fallback) {
    return props.fallback
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return ''
})
</script>

<template>
  <div
    :class="[
      'inline-flex items-center justify-center rounded-full overflow-hidden',
      'bg-surface-raised border border-border',
      sizeClasses[size],
    ]"
  >
    <NuxtImg v-if="src" :class="['object-cover', sizeClasses[size]]" :src="src" :alt="alt" loading="lazy" />
    <span v-else :class="['font-medium text-text-secondary', textSizeClasses[size]]">
      {{ initials || '?' }}
    </span>
  </div>
</template>
