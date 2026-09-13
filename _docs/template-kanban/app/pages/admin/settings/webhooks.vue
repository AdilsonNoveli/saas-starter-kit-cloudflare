<script setup lang="ts">
/**
 * @descricao: Página unificada de Webhooks das configurações da loja.
 * @objetivo: Destino e ativação do envio, segredos de autenticação/assinatura (Vault)
 *   e observabilidade de entregas falhadas (Dead-Letter queue) em tela cheia sem modais.
 */
import { ref, computed, onMounted } from 'vue'
import {
  Webhook,
  ShieldCheck,
  Key,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Send,
  Lock,
} from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'
import { useLojaConfig } from '~/composables/useLojaConfig'
import { validateWebhookUrl } from '~~/shared/utils/webhookUrl'

definePageMeta({ layout: 'admin' })

const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()
const { salvarFatia } = useLojaConfig()

// ── Estado do Endpoint & Ativação ──────────────────────────────────────────
const loading = ref(true)
const saving = ref(false)
const webhookUrl = ref('')
const webhookAtivo = ref(false)
const originalUrl = ref('')
const originalAtivo = ref(false)

const urlChanged = computed(() => webhookUrl.value.trim() !== originalUrl.value.trim() || webhookAtivo.value !== originalAtivo.value)

async function loadWebhook(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('store')
      .select('webhook_url, webhook_active')
      .limit(1)
      .maybeSingle()

    if (error) {
      notify.error('Erro ao carregar configurações', error.message)
    } else if (data) {
      webhookUrl.value = data.webhook_url || ''
      webhookAtivo.value = data.webhook_active ?? false
      originalUrl.value = webhookUrl.value
      originalAtivo.value = webhookAtivo.value
    }
  } catch {
    notify.error('Erro ao conectar ao banco de dados')
  }
}

async function saveWebhook(): Promise<void> {
  const informado = webhookUrl.value.trim()
  let destino = ''

  if (informado) {
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
      webhook_active: webhookAtivo.value,
    })

    if (erro) {
      notify.error('Erro ao salvar webhook', erro)
    } else {
      originalUrl.value = destino
      originalAtivo.value = webhookAtivo.value
      notify.success('Configurações de webhook salvas com sucesso!')
    }
  } catch {
    notify.error('Erro ao salvar webhook')
  } finally {
    saving.value = false
  }
}

// ── Segredos (Token Bearer & Chave HMAC) ──────────────────────────────────
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
    // Diagnóstico — não trava a tela
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
    message: 'Sem este segredo, o envio é recusado por segurança até que um novo seja cadastrado. Não é possível desfazer.',
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

// ── Entregas Falhadas (Dead-Letter Queue) ─────────────────────────────────
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
const reenfileirando = ref<string | null>(null)

async function loadDeadLetter(): Promise<void> {
  deadLetterLoading.value = true
  try {
    const data = await $fetch<{ eventos: EventoMorto[], limite: number }>('/api/admin/webhook/dead-letter')
    deadLetter.value = data.eventos
    deadLetterLimite.value = data.limite
  } catch {
    deadLetter.value = []
  } finally {
    deadLetterLoading.value = false
  }
}

async function reenfileirar(evento: EventoMorto): Promise<void> {
  const ok = await confirm({
    title: 'Reenviar evento?',
    message: `O evento ${evento.evento} retornará à fila para entrega na próxima drenagem.`,
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

onMounted(async () => {
  loading.value = true
  await Promise.all([
    loadWebhook(),
    loadWebhookSecrets(),
    loadDeadLetter(),
  ])
  loading.value = false
})
</script>

<template>
  <!-- Loading Principal -->
  <div v-if="loading" class="flex-1 flex items-center justify-center py-24">
    <div class="w-8 h-8 border-2 border-border border-t-brand-green rounded-full animate-spin" />
  </div>

  <main v-else class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="space-y-8 animate-fade-in">

      <!-- Cabeçalho -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-text-primary mb-1">Webhooks</h2>
          <p class="text-sm text-text-muted">
            Envio transacional de eventos em tempo real, credenciais seguras e observabilidade de entregas.
          </p>
        </div>

        <!-- Status Pill Consolidado -->
        <div class="flex items-center gap-2">
          <span
            v-if="webhookUrl && webhookAtivo"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-800"
          >
            <span class="w-2 h-2 rounded-full bg-secondary-500 animate-pulse" />
            Envio Ativo
          </span>
          <span
            v-else-if="webhookUrl && !webhookAtivo"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
          >
            <span class="w-2 h-2 rounded-full bg-amber-500" />
            Pausado
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold bg-surface-raised text-text-muted border border-border"
          >
            <span class="w-2 h-2 rounded-full bg-text-muted" />
            Não Configurado
          </span>
        </div>
      </div>

      <!-- ── 1. Configuração de Destino e Ativação ─────────────────────── -->
      <div class="p-6 rounded-2xl border border-border bg-surface space-y-6">
        <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0 text-brand-green">
              <Webhook class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Endpoint de Destino</h3>
              <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
                Endereço HTTP seguro do seu servidor ou plataforma receptora de eventos.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold text-text-muted">Habilitar envio</span>
            <UiToggle v-model="webhookAtivo" size="sm" />
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label for="webhook-url" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
              URL do Webhook (HTTPS obrigatório)
            </label>
            <input
              id="webhook-url"
              v-model="webhookUrl"
              type="text"
              autocomplete="off"
              class="w-full px-3.5 py-2.5 border border-border rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
              placeholder="https://seu-sistema.com/api/webhooks/pedped"
            >
            <p class="text-[11px] text-text-muted mt-1.5 leading-normal">
              O pedped envia requisições <code class="bg-surface-raised px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">POST</code> com payloads JSON padronizados. Endereços locais (<code class="font-mono text-[10px]">localhost</code>, IPs privados) são recusados por segurança.
            </p>
          </div>

          <div class="flex items-center justify-end pt-2">
            <button
              type="button"
              class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-all disabled:opacity-50 flex items-center gap-2 text-xs font-semibold active:scale-95 shadow-xs"
              :disabled="saving || !urlChanged"
              @click="saveWebhook"
            >
              <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>

      <!-- ── 2. Credenciais e Assinatura Criptográfica ────────────────── -->
      <div class="p-6 rounded-2xl border border-border bg-surface space-y-6">
        <div class="flex items-start gap-3 border-b border-border pb-4">
          <div class="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0 text-brand-green">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Credenciais e Autenticação</h3>
            <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
              Criptografia armazenada em cofre seguro (Vault). O envio exige ambos os segredos ativos.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Token Bearer -->
          <div class="p-4 rounded-xl border border-border bg-surface-raised flex flex-col justify-between space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Key class="w-3.5 h-3.5 text-text-muted" />
                  Token de Autenticação
                </span>
                <span
                  v-if="webhookTokenStatus.configurado"
                  class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400"
                >
                  Configurado
                </span>
                <span
                  v-else
                  class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-surface text-text-muted border border-border"
                >
                  Pendente
                </span>
              </div>
              <p class="text-xs text-text-muted leading-relaxed">
                Autentica o pedped no header <code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">Authorization: Bearer &lt;token&gt;</code>.
              </p>
              <div v-if="webhookTokenStatus.configurado" class="text-[11px] text-text-muted">
                Máscara: <code class="bg-surface px-1.5 py-0.5 rounded border border-border/80 font-mono text-[11px] font-semibold text-text-primary">{{ webhookTokenStatus.mascara }}</code>
              </div>
            </div>

            <div class="space-y-2">
              <input
                v-model="webhookTokenInput"
                type="password"
                autocomplete="off"
                placeholder="Novo token (mín. 16 caracteres)"
                class="w-full px-3 py-2 border border-border rounded-lg bg-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
              >
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex-1 py-2 px-3 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 text-xs font-semibold active:scale-95 text-center"
                  :disabled="webhookSecretsSaving === 'token' || webhookTokenInput.trim().length < 16"
                  @click="saveWebhookSecret('token')"
                >
                  {{ webhookSecretsSaving === 'token' ? 'Salvando…' : 'Salvar Token' }}
                </button>
                <button
                  v-if="webhookTokenStatus.configurado"
                  type="button"
                  class="py-2 px-3 rounded-lg border border-danger-600/40 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors disabled:opacity-50 text-xs font-semibold active:scale-95"
                  :disabled="webhookSecretsRevoking === 'token'"
                  @click="revokeWebhookSecret('token')"
                >
                  {{ webhookSecretsRevoking === 'token' ? 'Revogando…' : 'Revogar' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Chave HMAC Signing -->
          <div class="p-4 rounded-xl border border-border bg-surface-raised flex flex-col justify-between space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Lock class="w-3.5 h-3.5 text-text-muted" />
                  Chave de Assinatura (HMAC)
                </span>
                <span
                  v-if="webhookSigningStatus.configurado"
                  class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400"
                >
                  Configurada
                </span>
                <span
                  v-else
                  class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-surface text-text-muted border border-border"
                >
                  Pendente
                </span>
              </div>
              <p class="text-xs text-text-muted leading-relaxed">
                Valida a integridade do payload no header <code class="bg-surface px-1 py-0.5 rounded border border-border/80 font-mono text-[10px]">X-Pedped-Signature</code> via HMAC-SHA256.
              </p>
              <div v-if="webhookSigningStatus.configurado" class="text-[11px] text-text-muted">
                Máscara: <code class="bg-surface px-1.5 py-0.5 rounded border border-border/80 font-mono text-[11px] font-semibold text-text-primary">{{ webhookSigningStatus.mascara }}</code>
              </div>
            </div>

            <div class="space-y-2">
              <input
                v-model="webhookSigningInput"
                type="password"
                autocomplete="off"
                placeholder="Nova chave HMAC (mín. 16 caracteres)"
                class="w-full px-3 py-2 border border-border rounded-lg bg-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
              >
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex-1 py-2 px-3 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 text-xs font-semibold active:scale-95 text-center"
                  :disabled="webhookSecretsSaving === 'signing' || webhookSigningInput.trim().length < 16"
                  @click="saveWebhookSecret('signing')"
                >
                  {{ webhookSecretsSaving === 'signing' ? 'Salvando…' : 'Salvar Chave' }}
                </button>
                <button
                  v-if="webhookSigningStatus.configurado"
                  type="button"
                  class="py-2 px-3 rounded-lg border border-danger-600/40 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors disabled:opacity-50 text-xs font-semibold active:scale-95"
                  :disabled="webhookSecretsRevoking === 'signing'"
                  @click="revokeWebhookSecret('signing')"
                >
                  {{ webhookSecretsRevoking === 'signing' ? 'Revogando…' : 'Revogar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 3. Fila de Entregas Falhadas (Dead-Letter Observability) ──── -->
      <div class="p-6 rounded-2xl border border-border bg-surface space-y-6">
        <div class="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              :class="deadLetter.length ? 'bg-danger-100 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400' : 'bg-brand-green/10 text-brand-green'"
            >
              <AlertTriangle class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Entregas Falhadas (Dead-Letter)</h3>
                <span
                  v-if="deadLetter.length"
                  class="text-[11px] px-2 py-0.5 rounded-full font-bold bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-400"
                >
                  {{ deadLetter.length }}{{ deadLetter.length === deadLetterLimite ? '+' : '' }} pendente(s)
                </span>
              </div>
              <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
                Eventos que esgotaram as tentativas de entrega. A chave de idempotência é preservada ao reenviar.
              </p>
            </div>
          </div>

          <button
            type="button"
            class="p-2 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors active:scale-95 disabled:opacity-50"
            :disabled="deadLetterLoading"
            title="Atualizar lista"
            @click="loadDeadLetter"
          >
            <RefreshCw class="w-4 h-4" :class="deadLetterLoading ? 'animate-spin' : ''" />
          </button>
        </div>

        <!-- Loading Dead Letter -->
        <div v-if="deadLetterLoading && !deadLetter.length" class="flex items-center justify-center py-10">
          <div class="w-6 h-6 border-2 border-border border-t-brand-green rounded-full animate-spin" />
        </div>

        <!-- Estado Vazio (Saudável) -->
        <div v-else-if="!deadLetter.length" class="py-10 text-center flex flex-col items-center justify-center space-y-2">
          <div class="w-10 h-10 rounded-full bg-secondary-100 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400 flex items-center justify-center mb-1">
            <CheckCircle2 class="w-5 h-5" />
          </div>
          <p class="text-sm font-bold text-text-primary">Fila de entregas saudável</p>
          <p class="text-xs text-text-muted max-w-md">
            Todos os eventos gerados foram processados e entregues com sucesso aos seus respectivos destinos.
          </p>
        </div>

        <!-- Lista de Eventos Falhados -->
        <div v-else class="space-y-3">
          <div
            v-for="evento in deadLetter"
            :key="evento.id"
            class="p-4 rounded-xl border border-border bg-surface-raised space-y-3 hover:border-border/80 transition-all"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold font-mono text-text-primary bg-surface px-2 py-0.5 rounded border border-border">
                    {{ evento.evento }}
                  </span>
                  <span v-if="evento.http_status" class="text-[10px] font-bold px-2 py-0.5 rounded bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-400">
                    HTTP {{ evento.http_status }}
                  </span>
                  <span class="text-[10px] text-text-muted">
                    {{ evento.tentativas }} tentativa(s)
                  </span>
                </div>
                <p class="text-[10px] font-mono text-text-muted mt-1 truncate max-w-lg">
                  ID: {{ evento.event_id }} · Destino: {{ evento.destino_url }}
                </p>
              </div>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-raised text-text-primary transition-colors text-xs font-semibold shrink-0 disabled:opacity-50 active:scale-95 shadow-xs"
                :disabled="reenfileirando === evento.id"
                @click="reenfileirar(evento)"
              >
                <RefreshCw v-if="reenfileirando === evento.id" class="w-3.5 h-3.5 animate-spin" />
                <Send v-else class="w-3.5 h-3.5 text-brand-green" />
                <span>{{ reenfileirando === evento.id ? 'Reenviando…' : 'Reenviar' }}</span>
              </button>
            </div>

            <div v-if="evento.ultimo_erro" class="p-2.5 rounded-lg bg-danger-50 dark:bg-danger-950/30 border border-danger-200/60 dark:border-danger-900/50 text-[11px] font-mono text-danger-800 dark:text-danger-300 break-all leading-relaxed">
              {{ evento.ultimo_erro }}
            </div>

            <div class="text-[10px] text-text-muted flex justify-end">
              Ocorrido em: {{ new Date(evento.criado_em).toLocaleString('pt-BR') }}
            </div>
          </div>
        </div>
      </div>

      <!-- ── 4. Guia Rápido e Formato de Eventos ──────────────────────── -->
      <div class="p-5 rounded-2xl border border-border/80 bg-surface-raised/50 space-y-3">
        <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Eventos Notificados</h4>
        <div class="flex flex-wrap gap-2 text-xs">
          <code class="bg-surface px-2 py-1 rounded border border-border font-mono text-[11px]">pedido.criado</code>
          <code class="bg-surface px-2 py-1 rounded border border-border font-mono text-[11px]">pedido.status_alterado</code>
          <code class="bg-surface px-2 py-1 rounded border border-border font-mono text-[11px]">pedido.pago</code>
          <code class="bg-surface px-2 py-1 rounded border border-border font-mono text-[11px]">pedido.cancelado</code>
        </div>
        <p class="text-[11px] text-text-muted leading-relaxed">
          Cada requisição inclui timestamp no payload e o cabeçalho <code class="font-mono text-[10px]">X-Pedped-Signature</code> no formato <code class="font-mono text-[10px]">t=&lt;timestamp&gt;,v1=&lt;hmac&gt;</code>.
        </p>
      </div>

    </section>
  </main>
</template>
