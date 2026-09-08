import type { TrackEvent } from '#shared/types/tracking'

/**
 * Composable de observabilidade interna.
 *
 * - SSR-safe: nada acontece no servidor.
 * - Singleton: a fila vive em `useState` para sobreviver a HMR e ser
 *   compartilhada entre componentes (um único debounce global).
 * - Batch + debounce: agrupa eventos por ~1 s ou flush ao atingir
 *   `MAX_BATCH`, reduzindo o n.º de POSTs.
 * - Page-hide flush: usa `fetch keepalive` no `visibilitychange=hidden`
 *   para não perder o último lote quando o usuário fecha a aba.
 * - Delegação `data-track`: instalada uma única vez por sessão de browser;
 *   capta cliques em qualquer elemento com `data-track="rotulo"`.
 *
 * Uso direto:
 *   const { track, trackPage } = useTracking()
 *   track('add_to_cart', { entidade: 'produto', entidade_id: id })
 *
 * Uso declarativo (recomendado para botões):
 *   <button data-track="checkout-finalizar">Finalizar</button>
 */

const MAX_BATCH = 20
const FLUSH_DEBOUNCE_MS = 1000
const ENDPOINT = '/api/track'

interface QueuedEvent {
  tipo: string
  sessao_id?: string
  pagina?: string
  produto_id?: string
  pedido_id?: string
  metadata?: Record<string, unknown>
}

interface TrackingApi {
  track: (tipo: string, options?: Omit<TrackEvent, 'tipo' | 'sessao_id'>) => void
  trackPage: (pagina?: string) => void
  flush: () => Promise<void>
}

/**
 * Lê o `?sessao=<uuid>` da URL atual. O fluxo do catálogo já passa esse
 * parâmetro entre páginas; quando ausente, o evento fica anônimo.
 */
function readSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const id = new URLSearchParams(window.location.search).get('sessao')
  return id ?? undefined
}

export const useTracking = (): TrackingApi => {
  // No-op completo no server (nuxt 4 ainda chama composables no SSR)
  if (import.meta.server) {
    return {
      track: () => {},
      trackPage: () => {},
      flush: async () => {},
    }
  }

  // Estados singleton (nuxt useState garante 1 instância por app)
  const queue = useState<QueuedEvent[]>('tracking:queue', () => [])
  const installed = useState<boolean>('tracking:installed', () => false)
  let timer: ReturnType<typeof setTimeout> | null = null

  /**
   * Envia o lote atual. Aceita opção `keepalive` para flushes no
   * `visibilitychange` (sem ela o browser cancela o request).
   */
  async function send(events: QueuedEvent[], keepalive = false): Promise<void> {
    if (events.length === 0) return
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive,
      })
    } catch {
      // Observabilidade nunca quebra a UX. Eventos perdidos em rede instável
      // são aceitáveis — não reenviamos para evitar loops e duplicações.
    }
  }

  function scheduleFlush(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void flush()
    }, FLUSH_DEBOUNCE_MS)
  }

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (queue.value.length === 0) return
    const batch = queue.value.splice(0, queue.value.length)
    await send(batch)
  }

  function enqueue(ev: QueuedEvent): void {
    queue.value.push(ev)
    if (queue.value.length >= MAX_BATCH) {
      void flush()
    } else {
      scheduleFlush()
    }
  }

  /**
   * Instala uma única vez por aba os listeners globais:
   *  - delegação de cliques `data-track`
   *  - flush em visibilitychange
   */
  function installOnce(): void {
    if (installed.value) return
    installed.value = true

    const onClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const el = target.closest<HTMLElement>('[data-track]')
      if (!el) return
      const rotulo = el.dataset.track
      if (!rotulo) return
      enqueue({
        tipo: 'click',
        sessao_id: readSessionId(),
        metadata: { rotulo },
      })
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden' && queue.value.length > 0) {
        const batch = queue.value.splice(0, queue.value.length)
        void send(batch, true)
      }
    }

    document.addEventListener('click', onClick, { capture: true, passive: true })
    document.addEventListener('visibilitychange', onVisibility)
  }

  installOnce()

  function track(
    tipo: string,
    options: Omit<TrackEvent, 'tipo' | 'sessao_id'> = {},
  ): void {
    enqueue({
      tipo,
      sessao_id: readSessionId(),
      ...options,
    })
  }

  function trackPage(pagina?: string): void {
    enqueue({
      tipo: 'page_view',
      sessao_id: readSessionId(),
      metadata: { pagina: pagina ?? window.location.pathname },
    })
  }

  return { track, trackPage, flush }
}
