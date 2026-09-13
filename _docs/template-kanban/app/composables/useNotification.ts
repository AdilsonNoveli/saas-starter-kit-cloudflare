/**
 * @descricao: Composable singleton de notificações (toasts + confirmação modal)
 * @objetivo: API única e tipada para disparar toasts e diálogos críticos a partir
 *   de qualquer componente, evitando estado duplicado por tela. O estado vive em
 *   `useState` (Pinia/Nuxt-state SSR-aware compartilhado entre instâncias).
 *
 *   Renderização: `<UiNotificationStack />` e `<UiConfirmDialog />` montados
 *   uma única vez nos layouts (admin/catalog) consomem este composable.
 *
 *   Uso:
 *   ```ts
 *   const { notify, confirm } = useNotification()
 *   notify.success('Order created', 'Track it at /admin/orders')
 *   const ok = await confirm({ title: 'Excluir produto?', variant: 'error' })
 *   ```
 */

import { useState } from 'nuxt/app'

export type NotificationVariant = 'success' | 'error' | 'warning' | 'info'

export interface NotificationItem {
  /** Identificador único — usado para dismiss manual e como key do TransitionGroup. */
  readonly id: string
  readonly variant: NotificationVariant
  readonly title: string
  readonly message?: string
  /** Duração em ms até auto-dismiss. 0 desativa o auto-dismiss. */
  readonly duration: number
  /** Chave de deduplicação interna: `variant:title`. Igual = atualiza em-place. */
  readonly dedupeKey: string
}

export interface ConfirmOptions {
  readonly title: string
  readonly message?: string
  readonly confirmText?: string
  readonly cancelText?: string
  /** Variante visual do modal (afeta cor da borda/header). */
  readonly variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

/** Estado interno do diálogo de confirmação ativo (singleton).
 *  `resolve` é chamado pelo componente <UiConfirmDialog> ao aceitar/cancelar. */
export interface ConfirmDialogState {
  readonly id: string
  readonly options: ConfirmOptions
  readonly resolve: (value: boolean) => void
}

/** Duração padrão dos toasts (4 s) — alinhada à percepção média de leitura. */
const DEFAULT_DURATION_MS = 4000

/**
 * Mapa de handles de auto-dismiss por id de notificação.
 * Módulo-nível: persiste entre remounts e permite cancelar timers ao deduplicar.
 */
const dismissTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>()

interface UseNotificationReturn {
  /** Fila reativa de toasts ativos (uso interno do <UiNotificationStack>). */
  readonly queue: ReturnType<typeof useState<NotificationItem[]>>
  /** Estado reativo do diálogo de confirmação (uso interno do <UiConfirmDialog>). */
  readonly dialog: ReturnType<typeof useState<ConfirmDialogState | null>>
  notify: {
    success: (title: string, message?: string, duration?: number) => string
    error: (title: string, message?: string, duration?: number) => string
    warning: (title: string, message?: string, duration?: number) => string
    info: (title: string, message?: string, duration?: number) => string
  }
  /** Confirmação crítica baseada em modal. Resolve `true` em confirmação, `false` em cancelamento. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Remove um toast da fila pelo id. */
  dismiss: (id: string) => void
}

/** Gera um ID estável o suficiente para uso em listas/chaves do Vue. */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useNotification(): UseNotificationReturn {
  // `useState` garante singleton entre componentes e SSR-safety.
  const queue = useState<NotificationItem[]>('notifications:queue', () => [])
  const dialog = useState<ConfirmDialogState | null>('notifications:dialog', () => null)

  const dismiss = (id: string): void => {
    const handle = dismissTimers.get(id)
    if (handle !== undefined) {
      globalThis.clearTimeout(handle)
      dismissTimers.delete(id)
    }
    queue.value = queue.value.filter((item) => item.id !== id)
  }

  const scheduleAutoDismiss = (id: string, duration: number): void => {
    if (!import.meta.client || duration <= 0) return
    const handle = globalThis.setTimeout(() => dismiss(id), duration)
    dismissTimers.set(id, handle)
  }

  const enqueue = (
    variant: NotificationVariant,
    title: string,
    message?: string,
    duration: number = DEFAULT_DURATION_MS,
  ): string => {
    const dedupeKey = `${variant}:${title}`

    // Se já existe um toast com a mesma chave, atualiza em-place e reinicia o timer.
    // O `id` é preservado para o Vue não animar saída+entrada desnecessariamente.
    const existing = queue.value.find((item) => item.dedupeKey === dedupeKey)
    if (existing) {
      const handle = dismissTimers.get(existing.id)
      if (handle !== undefined) {
        globalThis.clearTimeout(handle)
        dismissTimers.delete(existing.id)
      }
      const updated: NotificationItem = { ...existing, message, duration }
      queue.value = queue.value.map((item) => (item.id === existing.id ? updated : item))
      scheduleAutoDismiss(existing.id, duration)
      return existing.id
    }

    const id = generateId()
    const item: NotificationItem = { id, variant, title, message, duration, dedupeKey }
    queue.value = [...queue.value, item]
    scheduleAutoDismiss(id, duration)
    return id
  }

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      // Se já existe um diálogo ativo, descarta (resolve false) antes de abrir o novo.
      // Evita empilhamento de modais sobrepostos.
      const previous = dialog.value
      if (previous) {
        previous.resolve(false)
      }

      dialog.value = {
        id: generateId(),
        options,
        resolve: (answer: boolean): void => {
          dialog.value = null
          resolve(answer)
        },
      }
    })
  }

  return {
    queue,
    dialog,
    notify: {
      success: (title, message, duration) => enqueue('success', title, message, duration),
      error: (title, message, duration) => enqueue('error', title, message, duration),
      warning: (title, message, duration) => enqueue('warning', title, message, duration),
      info: (title, message, duration) => enqueue('info', title, message, duration),
    },
    confirm,
    dismiss,
  }
}
