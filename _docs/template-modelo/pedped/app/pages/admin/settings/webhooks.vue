<script setup lang="ts">
/**
 * @descricao: Aba "Webhooks" das configurações da loja.
 * @objetivo: Destino e liga/desliga do envio, os dois segredos (token e chave de
 *   assinatura) e a fila de entregas falhadas.
 *
 * Esta tela nasceu em `/admin/integrations.vue` (item 2b da §8.18) porque o
 * split de `/admin/settings` ainda não existia. O passo 2 da §8.19 é MOVER o
 * que já funcionava, não reescrever: a lógica e o markup abaixo vieram de lá
 * sem mudança de contrato.
 *
 * A dead-letter mora aqui, e não numa página de observabilidade, porque é
 * estado de entrega DO webhook — a decisão está registrada na §8.19.
 */
import { ref, onMounted } from 'vue'
import { Webhook, AlertTriangle } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'
import { useLojaConfig } from '~/composables/useLojaConfig'
import { validateWebhookUrl } from '~~/shared/utils/webhookUrl'

const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()
const { salvarFatia } = useLojaConfig()

const loading = ref(true)
const saving = ref(false)
const webhookUrl = ref('')
// Item 2b da §8.18 (_docs/em-andamento.md): liga/desliga não existia na UI —
// só `webhook_url` era editável, e desligar exigia esvaziar a URL (perdendo o
// destino salvo). Agora os dois campos são independentes: URL preenchida +
// toggle desligado pausa o envio sem apagar o endereço.
const webhookAtivo = ref(false)
const modalOpen = ref(false)

async function loadWebhook(): Promise<void> {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('loja')
      .select('webhook_url, webhook_ativo')
      .limit(1)
      .maybeSingle()

    if (error) {
      notify.error('Erro ao carregar configurações', error.message)
    } else if (data) {
      webhookUrl.value = data.webhook_url || ''
      webhookAtivo.value = data.webhook_ativo
    }
  } catch {
    notify.error('Erro ao conectar ao banco de dados')
  } finally {
    loading.value = false
  }
}

async function saveWebhook(): Promise<void> {
  // Campo vazio grava null (sem destino) mas não decide sozinho se o envio
  // está ligado — isso é o toggle. Os dois só andam juntos na UI porque não
  // faz sentido "ativo" sem destino; o worker já trata `webhook_url = null`
  // como desligado de qualquer forma (defesa em profundidade, não redundância).
  const informado = webhookUrl.value.trim()
  let destino = ''

  if (informado) {
    // Mesmas regras que o worker aplica no envio (`validateWebhookUrl`):
    // HTTPS obrigatório, nada de loopback/link-local/rede privada. Validar só
    // aqui não bastaria — a tela escreve direto no banco e a linha pode ser
    // anterior à regra —, mas é onde o admin recebe o motivo em texto.
    const validacao = validateWebhookUrl(informado)
    if (!validacao.ok) {
      notify.warning('URL inválida', validacao.motivo)
      return
    }
    destino = validacao.url
  }

  saving.value = true
  try {
    const erro = await salvarFatia({
      webhook_url: destino || null,
      webhook_ativo: webhookAtivo.value,
    })

    if (erro) {
      notify.error('Erro ao salvar webhook', erro)
    } else {
      notify.success('Webhook salvo com sucesso!')
      modalOpen.value = false
    }
  } catch {
    notify.error('Erro ao salvar webhook')
  } finally {
    saving.value = false
  }
}

/**
 * Os dois segredos de SAÍDA do webhook (migration 103/§8.16b) — antes só
 * configuráveis chamando `/api/admin/webhook/secrets` na mão (item 2b/§8.18,
 * "sem ela os segredos só se configuram por rota"). Mesmo padrão da chave
 * OpenAI: só a máscara chega ao browser, o valor em claro nunca é devolvido
 * depois de salvo.
 */
type TipoSegredoWebhook = 'token' | 'signing'

interface SegredoWebhookStatus {
  configurado: boolean
  mascara: string | null
}

const webhookSecretsLoading = ref(true)
const webhookSecretsSaving = ref<TipoSegredoWebhook | null>(null)
const webhookSecretsRevoking = ref<TipoSegredoWebhook | null>(null)
const webhookTokenStatus = ref<SegredoWebhookStatus>({ configurado: false, mascara: null })
const webhookSigningStatus = ref<SegredoWebhookStatus>({ configurado: false, mascara: null })
const webhookTokenInput = ref('')
const webhookSigningInput = ref('')

async function loadWebhookSecrets(): Promise<void> {
  webhookSecretsLoading.value = true
  try {
    const status = await $fetch<{ token: SegredoWebhookStatus, assinatura: SegredoWebhookStatus }>(
      '/api/admin/webhook/secrets',
    )
    webhookTokenStatus.value = status.token
    webhookSigningStatus.value = status.assinatura
  } catch {
    // Card/modal são diagnóstico — falhar ao carregar não pode travar a tela.
  } finally {
    webhookSecretsLoading.value = false
  }
}

async function saveWebhookSecret(tipo: TipoSegredoWebhook): Promise<void> {
  const valor = (tipo === 'token' ? webhookTokenInput.value : webhookSigningInput.value).trim()
  if (valor.length < 16) {
    notify.warning('Segredo muito curto', 'Use pelo menos 16 caracteres.')
    return
  }

  webhookSecretsSaving.value = tipo
  try {
    const result = await $fetch<{ configurado: true, tipo: TipoSegredoWebhook, mascara: string }>(
      '/api/admin/webhook/secrets',
      { method: 'POST', body: { tipo, valor } },
    )
    if (tipo === 'token') {
      webhookTokenStatus.value = { configurado: true, mascara: result.mascara }
      webhookTokenInput.value = ''
    } else {
      webhookSigningStatus.value = { configurado: true, mascara: result.mascara }
      webhookSigningInput.value = ''
    }
    notify.success(tipo === 'token' ? 'Token do webhook salvo' : 'Chave de assinatura salva')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao salvar segredo', message ?? 'Tente novamente.')
  } finally {
    webhookSecretsSaving.value = null
  }
}

async function revokeWebhookSecret(tipo: TipoSegredoWebhook): Promise<void> {
  const ok = await confirm({
    title: tipo === 'token' ? 'Revogar o token do webhook?' : 'Revogar a chave de assinatura?',
    message: 'Sem este segredo, o webhook para de enviar (recusa a rodada inteira em vez de entregar sem credencial). Não dá para desfazer — só cadastrando um novo.',
    variant: 'error',
    confirmText: 'Revogar',
  })
  if (!ok) return

  webhookSecretsRevoking.value = tipo
  try {
    await $fetch('/api/admin/webhook/secrets', { method: 'DELETE', query: { tipo } })
    if (tipo === 'token') {
      webhookTokenStatus.value = { configurado: false, mascara: null }
    } else {
      webhookSigningStatus.value = { configurado: false, mascara: null }
    }
    notify.success('Segredo revogado')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao revogar segredo', message ?? 'Tente novamente.')
  } finally {
    webhookSecretsRevoking.value = null
  }
}

/**
 * Fila de dead-letter: eventos que esgotaram as tentativas ou tiveram destino
 * recusado. Antes só existiam como `logger.error` num tail que ninguém observa
 * — perda silenciosa. A lista NÃO traz o `payload` de propósito: para
 * diagnosticar entrega bastam os metadados, e o payload carrega dado pessoal
 * do cliente.
 */
interface EventoMorto {
  id: string
  event_id: string
  evento: string
  destino_url: string
  tentativas: number
  http_status: number | null
  ultimo_erro: string | null
  criado_em: string
}

const deadLetter = ref<EventoMorto[]>([])
const deadLetterLimite = ref(50)
const deadLetterLoading = ref(true)
const deadLetterModalOpen = ref(false)
const reenfileirando = ref<string | null>(null)

async function loadDeadLetter(): Promise<void> {
  deadLetterLoading.value = true
  try {
    const data = await $fetch<{ eventos: EventoMorto[], limite: number }>('/api/admin/webhook/dead-letter')
    deadLetter.value = data.eventos
    deadLetterLimite.value = data.limite
  } catch {
    // O card é diagnóstico — falhar ao carregá-lo não pode derrubar a página.
    deadLetter.value = []
  } finally {
    deadLetterLoading.value = false
  }
}

function openDeadLetterModal(): void {
  deadLetterModalOpen.value = true
  void loadDeadLetter()
}

async function reenfileirar(evento: EventoMorto): Promise<void> {
  const ok = await confirm({
    title: 'Reenviar evento?',
    message: `O evento ${evento.evento} volta para a fila e será entregue na próxima drenagem. Se a causa da falha não tiver sido corrigida, ele vai falhar de novo.`,
    confirmText: 'Reenviar',
    variant: 'warning',
  })
  if (!ok) return

  reenfileirando.value = evento.id
  try {
    await $fetch('/api/admin/webhook/dead-letter', { method: 'POST', body: { id: evento.id } })
    notify.success('Evento reenfileirado', 'Será entregue na próxima drenagem.')
    await loadDeadLetter()
  } catch {
    notify.error('Não foi possível reenfileirar o evento')
  } finally {
    reenfileirando.value = null
  }
}

onMounted(() => {
  void loadWebhook()
  void loadWebhookSecrets()
  // Carregado já na montagem, não só ao abrir o modal: o valor do card é
  // justamente avisar sem que ninguém precise ir procurar.
  void loadDeadLetter()
})
</script>

<template>
  <main class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="space-y-8">
      <div>
        <h2 class="text-lg font-bold mb-1">Webhooks</h2>
        <p class="text-sm text-text-muted">
          Receba notificações de eventos do sistema em tempo real no seu próprio sistema.
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="w-8 h-8 border-2 border-border border-t-brand-green rounded-full animate-spin" />
      </div>

      <!-- Grid de cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <!-- Card Webhook -->
        <div
          class="border border-border rounded-xl p-5 flex flex-col gap-4 cursor-pointer hover:border-brand-green/50 hover:shadow-xs transition-all group bg-surface"
          @click="modalOpen = true"
        >
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0 text-brand-green">
              <Webhook class="w-6 h-6" />
            </div>

            <span
              v-if="webhookUrl && webhookAtivo"
              class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-secondary-500 shrink-0" />
              Ativo
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-surface-raised text-text-muted border border-border"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
              {{ webhookUrl ? 'Desligado' : 'Inativo' }}
            </span>
          </div>

          <div>
            <h3 class="text-sm font-bold text-text-primary group-hover:text-brand-green transition-colors">
              Webhooks transacionais
            </h3>
            <p class="text-xs text-text-muted mt-1 leading-relaxed">
              Receba notificações de eventos em tempo real como criação de pedido ou status atualizado.
            </p>
          </div>

          <div v-if="webhookUrl" class="mt-auto pt-2 border-t border-border/60">
            <span class="text-[10px] font-mono text-text-muted truncate block">
              {{ webhookUrl }}
            </span>
          </div>
        </div>

        <!-- Card Entregas falhadas (dead-letter) -->
        <div
          class="border border-border rounded-xl p-5 flex flex-col gap-4 cursor-pointer hover:border-brand-green/50 hover:shadow-xs transition-all group bg-surface"
          @click="openDeadLetterModal"
        >
          <div class="flex items-start justify-between">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              :class="deadLetter.length ? 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400' : 'bg-brand-green/10 text-brand-green'"
            >
              <AlertTriangle class="w-6 h-6" />
            </div>

            <span
              v-if="deadLetter.length"
              class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-danger-500 shrink-0" />
              {{ deadLetter.length }}{{ deadLetter.length === deadLetterLimite ? '+' : '' }}
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-surface-raised text-text-muted border border-border"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
              Nenhuma
            </span>
          </div>

          <div>
            <h3 class="text-sm font-bold text-text-primary group-hover:text-brand-green transition-colors">
              Entregas falhadas
            </h3>
            <p class="text-xs text-text-muted mt-1 leading-relaxed">
              Eventos que esgotaram as tentativas e não chegaram ao destino. Podem ser reenviados depois de corrigir a causa.
            </p>
          </div>
        </div>

      </div>
    </section>

    <!-- Modal Webhook -->
    <UiModal
      :open="modalOpen"
      title="Configurar Webhook"
      size="md"
      @close="modalOpen = false"
    >
      <div class="space-y-5">
        <div class="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-border bg-surface-raised">
          <div class="flex-1">
            <p class="text-sm font-semibold text-text-primary">Envio ativo</p>
            <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
              Desligado, nenhum evento sai — o destino e os segredos abaixo ficam salvos, só não são usados.
            </p>
          </div>
          <div class="shrink-0">
            <UiToggle v-model="webhookAtivo" size="sm" />
          </div>
        </div>

        <div>
          <label for="webhook-url" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">URL de Endpoint *</label>
          <input
            id="webhook-url"
            v-model="webhookUrl"
            type="text"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            placeholder="https://seu-sistema.com/webhook/..."
          >
          <p class="text-[10px] text-text-muted mt-1.5 leading-normal">
            O webhook enviará requisições POST com payloads JSON contendo os dados do pedido.
            Só aceita <strong>HTTPS</strong> em endereço público — como o envio carrega dado de
            cliente e credencial, endereços locais e de rede interna são recusados.
            Deixe em branco para remover o destino.
          </p>
        </div>

        <!-- Token do Webhook (Bearer) — migration 103, Vault -->
        <div class="bg-surface-raised p-3.5 rounded-lg border border-border space-y-2">
          <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Token do Webhook</h4>
          <p class="text-xs text-text-muted leading-relaxed">
            Vai no header <code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">Authorization: Bearer</code> de todo envio — é o que autentica o canal para o seu sistema.
          </p>
          <p v-if="webhookTokenStatus.configurado" class="text-[10px] text-text-muted">
            Atual: <code class="bg-surface px-1 py-0.5 rounded border border-border/80">{{ webhookTokenStatus.mascara }}</code>
          </p>
          <div class="flex items-center gap-2">
            <input
              v-model="webhookTokenInput"
              type="password"
              autocomplete="off"
              placeholder="Cole um novo token (mín. 16 caracteres)"
              class="flex-1 min-w-0 px-3 py-2 border border-border rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            >
            <button
              type="button"
              class="px-3 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 text-xs font-semibold shrink-0 active:scale-95"
              :disabled="webhookSecretsSaving === 'token'"
              @click="saveWebhookSecret('token')"
            >
              {{ webhookSecretsSaving === 'token' ? 'Salvando…' : 'Salvar' }}
            </button>
            <button
              v-if="webhookTokenStatus.configurado"
              type="button"
              class="px-3 py-2 rounded-lg border border-danger-600/40 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors disabled:opacity-50 text-xs font-semibold shrink-0 active:scale-95"
              :disabled="webhookSecretsRevoking === 'token'"
              @click="revokeWebhookSecret('token')"
            >
              {{ webhookSecretsRevoking === 'token' ? 'Revogando…' : 'Revogar' }}
            </button>
          </div>
        </div>

        <!-- Chave de assinatura (HMAC) — migration 103, Vault -->
        <div class="bg-surface-raised p-3.5 rounded-lg border border-border space-y-2">
          <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Chave de Assinatura</h4>
          <p class="text-xs text-text-muted leading-relaxed">
            Todo envio leva o header <code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">X-Pedped-Signature</code>
            (<code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">t=&lt;unix&gt;,v1=&lt;hex&gt;</code>) — <code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">v1</code> é o
            HMAC-SHA256 de <code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">"&lt;t&gt;.&lt;corpo&gt;"</code> com esta chave.
            O destino deve recalcular sobre o corpo bruto, recusar timestamp com mais de 5 minutos e comparar em tempo constante.
          </p>
          <p v-if="webhookSigningStatus.configurado" class="text-[10px] text-text-muted">
            Atual: <code class="bg-surface px-1 py-0.5 rounded border border-border/80">{{ webhookSigningStatus.mascara }}</code>
          </p>
          <div class="flex items-center gap-2">
            <input
              v-model="webhookSigningInput"
              type="password"
              autocomplete="off"
              placeholder="Cole uma nova chave (mín. 16 caracteres)"
              class="flex-1 min-w-0 px-3 py-2 border border-border rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            >
            <button
              type="button"
              class="px-3 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 text-xs font-semibold shrink-0 active:scale-95"
              :disabled="webhookSecretsSaving === 'signing'"
              @click="saveWebhookSecret('signing')"
            >
              {{ webhookSecretsSaving === 'signing' ? 'Salvando…' : 'Salvar' }}
            </button>
            <button
              v-if="webhookSigningStatus.configurado"
              type="button"
              class="px-3 py-2 rounded-lg border border-danger-600/40 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors disabled:opacity-50 text-xs font-semibold shrink-0 active:scale-95"
              :disabled="webhookSecretsRevoking === 'signing'"
              @click="revokeWebhookSecret('signing')"
            >
              {{ webhookSecretsRevoking === 'signing' ? 'Revogando…' : 'Revogar' }}
            </button>
          </div>
        </div>

        <div class="bg-surface-raised p-3.5 rounded-lg border border-border">
          <p class="text-xs text-text-muted leading-relaxed">
            Eventos despachados:
            <code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">pedido.criado</code>,
            <code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">pedido.status_alterado</code>, etc.
          </p>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-sm font-medium active:scale-95"
          @click="modalOpen = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 shadow-xs"
          :disabled="saving"
          @click="saveWebhook"
        >
          <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Salvar
        </button>
      </template>
    </UiModal>

    <!-- Modal Entregas falhadas (dead-letter) -->
    <UiModal
      :open="deadLetterModalOpen"
      title="Entregas falhadas"
      size="lg"
      @close="deadLetterModalOpen = false"
    >
      <div v-if="deadLetterLoading" class="flex items-center justify-center py-10">
        <div class="w-7 h-7 border-2 border-border border-t-brand-green rounded-full animate-spin" />
      </div>

      <div v-else-if="!deadLetter.length" class="py-10 text-center">
        <p class="text-sm text-text-muted">Nenhuma entrega falhada. Todos os eventos chegaram ao destino.</p>
      </div>

      <div v-else class="space-y-3">
        <p class="text-xs text-text-muted leading-relaxed">
          Estes eventos esgotaram as tentativas ou tiveram o destino recusado. Corrija a causa
          (credencial, URL, disponibilidade do destino) e reenvie — a chave de idempotência é
          preservada, então o destino consegue identificar reentrega.
        </p>

        <div
          v-for="evento in deadLetter"
          :key="evento.id"
          class="border border-border rounded-lg p-3.5 bg-surface-raised space-y-2"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-bold text-text-primary">{{ evento.evento }}</p>
              <p class="text-[10px] font-mono text-text-muted truncate">{{ evento.event_id }}</p>
            </div>
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-lg border border-border text-text-primary hover:bg-surface transition-colors text-[11px] font-semibold shrink-0 disabled:opacity-50 active:scale-95"
              :disabled="reenfileirando === evento.id"
              @click="reenfileirar(evento)"
            >
              {{ reenfileirando === evento.id ? 'Reenviando…' : 'Reenviar' }}
            </button>
          </div>

          <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-text-muted">
            <span>{{ evento.tentativas }} tentativa(s)</span>
            <span v-if="evento.http_status">HTTP {{ evento.http_status }}</span>
            <span>{{ new Date(evento.criado_em).toLocaleString('pt-BR') }}</span>
          </div>

          <p v-if="evento.ultimo_erro" class="text-[10px] font-mono text-danger-700 dark:text-danger-400 leading-relaxed break-all">
            {{ evento.ultimo_erro }}
          </p>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-sm font-medium active:scale-95"
          @click="deadLetterModalOpen = false"
        >
          Fechar
        </button>
      </template>
    </UiModal>
  </main>
</template>
