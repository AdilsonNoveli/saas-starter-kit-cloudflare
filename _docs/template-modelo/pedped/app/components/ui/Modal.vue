<!--
  @descricao: Componente Modal reutilizável com variantes e tamanhos
  @objetivo: Exibir conteúdo em overlay modal (confirmações, CTAs, formulários)
  @variantes: default, success, warning, error, info
  @tamanhos: sm, md, lg
-->

<script setup lang="ts">
import { ClipboardList, CheckCircle2, AlertTriangle, XCircle, Info, X } from '@lucide/vue'
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  title?: string
  closeable?: boolean
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  closeable: true,
  open: false,
  title: undefined,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
  confirm: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => {
    emit('update:open', value)
  },
})

/**
 * @funcao: handleClose
 * @parametros: Nenhum
 * @retorno: void
 * @descricao: Fecha o modal
 * @objetivo: Permitir que usuário feche o modal
 */
function handleClose(): void {
  isOpen.value = false
  emit('close')
}

/**
 * @funcao: handleConfirm
 * @parametros: Nenhum
 * @retorno: void
 * @descricao: Confirma ação do modal
 * @objetivo: Emitir evento de confirmação
 */
function handleConfirm(): void {
  emit('confirm')
}

// Computar classes do modal
const modalClasses = computed(() => {
  const baseClasses = 'rounded-lg border shadow-elevated bg-surface'

  const variantClasses = {
    default: 'border-border',
    success: 'border-success/30',
    warning: 'border-warning/30',
    error: 'border-alert/30',
    info: 'border-info/30',
  }

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]}`
})

// Computar classes do header
const headerClasses = computed(() => {
  const baseClasses = 'border-b px-6 py-4 flex items-center justify-between'

  const variantClasses = {
    default: 'border-border',
    success: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    error: 'border-alert/20 bg-alert/5',
    info: 'border-info/20 bg-info/5',
  }

  return `${baseClasses} ${variantClasses[props.variant]}`
})

// Ícones SVG Lucide por variante (enterprise-grade — sem emojis hardcoded)
const iconMap = {
  default: ClipboardList,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}
</script>

<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
        @click="handleClose"
      >
        <!-- Modal -->
        <Transition name="scale">
          <div v-if="isOpen" :class="modalClasses" class="w-full z-50" @click.stop>
            <!-- Header -->
            <div v-if="title" :class="headerClasses">
              <div class="flex items-center gap-3">
                <component
                  :is="iconMap[variant]"
                  class="w-5 h-5 shrink-0"
                  :class="{
                    'text-text-primary': variant === 'default',
                    'text-success': variant === 'success',
                    'text-warning': variant === 'warning',
                    'text-alert': variant === 'error',
                    'text-info': variant === 'info',
                  }"
                />
                <h2 class="text-lg font-semibold text-text-primary">
                  {{ title }}
                </h2>
              </div>

              <button
                v-if="closeable"
                type="button"
                class="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Fechar modal"
                @click="handleClose"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Content -->
            <div class="px-6 py-4">
              <slot />
            </div>

            <!-- Footer (slot para ações) -->
            <div class="border-t border-border px-6 py-4 flex justify-end gap-3">
              <slot name="footer">
                <button
                  type="button"
                  class="px-4 py-2 rounded-lg border border-border text-xs font-bold uppercase tracking-wider text-text-primary bg-surface hover:bg-surface-raised transition-all active:scale-95 cursor-pointer"
                  @click="handleClose"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
                  @click="handleConfirm"
                >
                  Confirmar
                </button>
              </slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.scale-enter-from,
.scale-leave-to {
  transform: scale(0.95);
  opacity: 0;
}
</style>
