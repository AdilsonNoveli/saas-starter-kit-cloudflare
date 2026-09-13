/**
 * Status de conexão do provedor WhatsApp (`store.whatsapp_api_key_id`) — fonte
 * única para gating de UI que só faz sentido quando existe um canal de
 * atendimento real conectado (ex.: menu "Chat" em `app/layouts/admin.vue`:
 * sem WhatsApp configurado não existe conversa nenhuma pra mostrar).
 *
 * Estado em escopo de MÓDULO, mesmo padrão de `useChatEscalations.ts`: uma
 * instância única para toda a sessão do navegador — evita refetch a cada
 * remontagem de página/layout. `null` = ainda não resolvido (loading);
 * consumidores que decidem "mostrar ou esconder" devem tratar `null` como
 * "ainda não sei" (não mostrar nem esconder precipitadamente).
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue'

interface WhatsappProviderStatus {
  configurado: boolean
  mascara: string | null
  baseUrl: string
  provedorNome: string
  usandoFallbackEnv: boolean
  webhookUrl: string | null
  webhookConfigurado: boolean
}

const configurado = ref<boolean | null>(null)
let fetchPromise: Promise<void> | null = null

interface UseWhatsappStatusReturn {
  /** `null` enquanto não resolvido; depois, `true`/`false` conforme `store.whatsapp_api_key_id`. */
  readonly whatsappConfigurado: Ref<boolean | null>
  /** `true` só depois que `whatsappConfigurado` deixou de ser `null`. */
  readonly isLoaded: ComputedRef<boolean>
  /** Busca o status. Idempotente por sessão — chamadas concorrentes reaproveitam a mesma promise. */
  readonly fetch: () => Promise<void>
}

export function useWhatsappStatus(): UseWhatsappStatusReturn {
  const isLoaded = computed<boolean>(() => configurado.value !== null)

  async function fetchStatus(): Promise<void> {
    if (fetchPromise) return fetchPromise

    fetchPromise = (async () => {
      try {
        const status = await $fetch<WhatsappProviderStatus>('/api/admin/integrations/whatsapp-provider/status')
        configurado.value = status.configurado
      } catch {
        // Fail-closed: erro de rede/permissão não deve travar a UI mostrando
        // um menu que pode não ter conteúdo nenhum atrás — nunca lançar aqui.
        configurado.value = false
      }
    })()

    return fetchPromise
  }

  return { whatsappConfigurado: configurado, isLoaded, fetch: fetchStatus }
}
