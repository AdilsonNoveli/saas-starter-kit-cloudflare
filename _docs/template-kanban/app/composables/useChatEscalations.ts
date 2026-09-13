/**
 * Camada 1 de notificação de escalação para humano (G13, §5.2 do PRD —
 * escopo reduzido: bolinha pulsante + beep no navegador, sem
 * e-mail/WhatsApp/Web Push, esses ficam registrados como escopo futuro).
 *
 * Estado em escopo de MÓDULO, mesmo padrão de `useRealtimeSocket.ts`: uma
 * instância única para toda a sessão do navegador, montada uma vez em
 * `app/layouts/admin.vue` (layout persistente entre páginas `/admin/*`,
 * nunca remontado por navegação) — nunca instanciar por página, ou o beep
 * tocaria em dobro se duas páginas montassem o composable ao mesmo tempo.
 *
 * Consome o socket único (`chat.conversation_updated`, já emitido por
 * `pauseGate.ts`/`whatsapp-queue.ts` no momento real do transbordo) — nunca
 * abre canal próprio. O snapshot inicial (`GET /api/admin/chat/escalations`)
 * cobre o estado ao carregar a página e o resync após queda de conexão.
 */
import { ref, computed } from 'vue'
import { useRealtimeSocket } from '~/composables/useRealtimeSocket'
import type { ChatEscalationsResponse } from '#shared/types/chat'

const transbordoIds = ref<Set<string>>(new Set())
const soundEnabled = ref<boolean>(true)
let initialized = false
let audioCtx: AudioContext | null = null

/** Beep curto via Web Audio — sem asset de áudio para carregar/hospedar. */
function playBeep(): void {
  if (!soundEnabled.value) return
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // Autoplay bloqueado (sem interação do usuário ainda) ou navegador sem
    // suporte — silencioso, a bolinha visual continua funcionando sozinha.
  }
}

async function fetchSnapshot(): Promise<void> {
  try {
    const res = await $fetch<ChatEscalationsResponse>('/api/admin/chat/escalations')
    soundEnabled.value = res.chatAlertaSonoroAtivo
    transbordoIds.value = new Set(res.data.map((e) => e.clienteId))
  } catch {
    // Falha de snapshot não deve travar a UI — bolinha/som seguem operando
    // via realtime a partir daqui, só o estado pré-existente fica incompleto.
  }
}

export function useChatEscalations() {
  const { subscribe, onResync } = useRealtimeSocket()

  if (!initialized && import.meta.client) {
    initialized = true
    void fetchSnapshot()

    subscribe('chat.conversation_updated', (event) => {
      const { clienteId, pausadoMotivo } = event.payload
      const next = new Set(transbordoIds.value)

      if (pausadoMotivo === 'transbordo') {
        const isNew = !next.has(clienteId)
        next.add(clienteId)
        transbordoIds.value = next
        if (isNew) playBeep()
      } else if (next.has(clienteId)) {
        next.delete(clienteId)
        transbordoIds.value = next
      }
    })

    onResync(() => { void fetchSnapshot() })
  }

  return {
    hasTransbordo: computed(() => transbordoIds.value.size > 0),
    transbordoCount: computed(() => transbordoIds.value.size),
  }
}
