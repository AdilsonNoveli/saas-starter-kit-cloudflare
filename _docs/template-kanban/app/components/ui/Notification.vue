<!--
  @descricao: Componente Notification enterprise-grade para exibir notificações toast
  @objetivo: Notificação reutilizável seguindo governança de tokens
-->

<script setup lang="ts">
interface NotificationProps {
  show?: boolean
  variant?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

withDefaults(defineProps<NotificationProps>(), {
  show: false,
  variant: 'success',
  message: '',
})

const emit = defineEmits<{
  close: []
}>()

const variantConfig = {
  success: {
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-success',
  },
  error: {
    icon: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-alert',
  },
  warning: {
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    iconColor: 'text-warning',
  },
  info: {
    icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
    iconColor: 'text-info',
  },
}
</script>

<template>
  <div
    aria-live="assertive"
    class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:p-6 z-60"
  >
    <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
      <transition
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="show"
          class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-surface border border-border shadow-xl"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="shrink-0">
                <svg
                  :class="['size-6', variantConfig[variant].iconColor]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :d="variantConfig[variant].icon"
                  />
                </svg>
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium text-text-primary">{{ title }}</p>
                <p v-if="message" class="mt-1 text-sm text-text-secondary">{{ message }}</p>
              </div>
              <div class="ml-4 flex shrink-0">
                <button
                  type="button"
                  class="inline-flex rounded-md bg-surface text-text-muted hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-colors"
                  @click="emit('close')"
                >
                  <span class="sr-only">Close</span>
                  <svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>
