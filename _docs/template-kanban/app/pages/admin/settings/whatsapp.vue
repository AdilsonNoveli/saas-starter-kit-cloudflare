<script setup lang="ts">
/**
 * @descricao: Aba "WhatsApp" das configurações da loja.
 * @objetivo: Provedor de envio (URL base + token) e o endereço de webhook que
 *   o provedor precisa chamar para entregar mensagem de cliente aqui dentro.
 *
 * Migrada de `/admin/integrations` — item solto no dropdown do menu, fora do
 * fluxo de Configurações — e do modal para página cheia: com o webhook de
 * entrada ao lado do provedor, o conteúdo não cabia mais num modal sem
 * esconder metade da explicação.
 *
 * O nome do fornecedor (ex.: o parceiro homologado que a loja contratou)
 * nunca aparece fixo nesta tela — só "WhatsApp". "Nome do provedor" é texto
 * livre do próprio lojista (`loja.whatsapp_provedor_nome`), não um rótulo do
 * produto.
 */
import { ref, computed, onMounted } from 'vue'
import { MessageCircle, Copy, Check, Eye, EyeOff, AlertTriangle, ArrowLeft } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'

definePageMeta({ layout: 'admin' })

const { notify, confirm } = useNotification()

const loading = ref(true)
const saving = ref(false)
const revoking = ref(false)

const configurado = ref(false)
const mascara = ref<string | null>(null)
const baseUrl = ref('')
const provedorNome = ref('')
const usandoFallbackEnv = ref(false)
const tokenInput = ref('')

const webhookUrl = ref<string | null>(null)
const webhookConfigurado = ref(false)
const webhookRevelado = ref(false)
const webhookCopiado = ref(false)

/** Esconde o token embutido no fim da URL até o lojista clicar em "revelar". */
const webhookUrlExibida = computed<string>(() => {
  if (!webhookUrl.value) return ''
  if (webhookRevelado.value) return webhookUrl.value
  return webhookUrl.value.replace(/(\/api\/whatsapp\/webhook\/).+$/, '$1••••••••••••••••••••')
})

interface WhatsappProviderStatus {
  configurado: boolean
  mascara: string | null
  baseUrl: string
  provedorNome: string
  usandoFallbackEnv: boolean
  webhookUrl: string | null
  webhookConfigurado: boolean
}

async function loadStatus(): Promise<void> {
  loading.value = true
  try {
    const status = await $fetch<WhatsappProviderStatus>('/api/admin/integrations/whatsapp-provider/status')
    configurado.value = status.configurado
    mascara.value = status.mascara
    baseUrl.value = status.baseUrl
    provedorNome.value = status.provedorNome
    usandoFallbackEnv.value = status.usandoFallbackEnv
    webhookUrl.value = status.webhookUrl
    webhookConfigurado.value = status.webhookConfigurado
  } catch {
    notify.error('Erro ao carregar configurações do WhatsApp')
  } finally {
    loading.value = false
  }
}

async function salvar(): Promise<void> {
  if (!tokenInput.value.trim()) {
    notify.warning('Token obrigatório', 'Cole o token do provedor para salvar — ele é validado junto com a URL.')
    return
  }

  saving.value = true
  try {
    const result = await $fetch<WhatsappProviderStatus>('/api/admin/integrations/whatsapp-provider', {
      method: 'POST',
      body: {
        apiToken: tokenInput.value.trim(),
        baseUrl: baseUrl.value.trim(),
        provedorNome: provedorNome.value.trim() || undefined,
      },
    })
    configurado.value = result.configurado
    mascara.value = result.mascara
    baseUrl.value = result.baseUrl
    provedorNome.value = result.provedorNome
    usandoFallbackEnv.value = result.usandoFallbackEnv
    tokenInput.value = ''
    notify.success('Provedor de WhatsApp salvo com sucesso!')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao salvar provedor', message ?? 'Tente novamente.')
  } finally {
    saving.value = false
  }
}

async function revogar(): Promise<void> {
  const ok = await confirm({
    title: 'Revogar token do provedor?',
    message: 'O token será apagado do cofre e o WhatsApp para de enviar mensagens até você cadastrar outro. A URL do provedor é mantida. Não dá para desfazer.',
    confirmText: 'Revogar',
    cancelText: 'Cancelar',
    variant: 'error',
  })
  if (!ok) return

  revoking.value = true
  try {
    // A revogação não devolve URL nem rótulo (eles permanecem no banco), só o
    // estado da credencial.
    const result = await $fetch<{ revogado: boolean, usandoFallbackEnv: boolean }>(
      '/api/admin/integrations/whatsapp-provider',
      { method: 'DELETE' },
    )
    configurado.value = false
    mascara.value = null
    usandoFallbackEnv.value = result.usandoFallbackEnv
    tokenInput.value = ''
    notify.success('Token revogado', 'Cadastre um novo token para o WhatsApp voltar a enviar mensagens.')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao revogar token', message ?? 'Tente novamente.')
  } finally {
    revoking.value = false
  }
}

function copiarWebhookUrl(): void {
  if (!webhookUrl.value) return
  navigator.clipboard.writeText(webhookUrl.value)
  webhookCopiado.value = true
  setTimeout(() => { webhookCopiado.value = false }, 2000)
}

onMounted(() => {
  void loadStatus()
})
</script>

<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center py-24">
    <div class="w-8 h-8 border-2 border-border border-t-brand-green rounded-full animate-spin" />
  </div>

  <main v-else class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="space-y-8">
      <div>
        <NuxtLink
          to="/admin/settings/integrations"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-brand-green transition-colors mb-3 group"
        >
          <ArrowLeft class="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Voltar para Integrações
        </NuxtLink>
        <h2 class="text-lg font-bold mb-1">WhatsApp</h2>
        <p class="text-sm text-text-muted">
          Conecte o serviço que envia e recebe as mensagens do WhatsApp da sua loja.
        </p>
      </div>

      <!-- ── Provedor (envio) ──────────────────────────────────────────── -->
      <div class="p-5 rounded-xl border border-border bg-surface space-y-5">
        <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0 text-brand-green">
              <MessageCircle class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Provedor</h3>
              <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
                Endereço e token do serviço que envia as mensagens do WhatsApp.
              </p>
            </div>
          </div>
          <span
            v-if="configurado"
            class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400 shrink-0"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-secondary-500 shrink-0" />
            Ativo
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-surface-raised text-text-muted border border-border shrink-0"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
            Inativo
          </span>
        </div>

        <div
          v-if="usandoFallbackEnv"
          class="text-xs leading-relaxed text-warning-800 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/40 border border-warning-200/80 dark:border-warning-900 rounded-lg px-3 py-2.5"
        >
          As mensagens estão saindo com a credencial de ambiente (legado). Cadastre o token
          abaixo para poder trocar de provedor sem precisar de um novo deploy.
        </div>

        <div>
          <label for="whatsapp-base-url" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">URL base do provedor *</label>
          <input
            id="whatsapp-base-url"
            v-model="baseUrl"
            type="text"
            autocomplete="off"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            placeholder="https://api.seuprovedor.com.br"
          >
          <p class="text-[10px] text-text-muted mt-1.5 leading-normal">
            Só o endereço base, sem caminho: os caminhos (<code class="bg-surface-raised px-1 py-0.5 rounded border border-border/80">/messages/send/text</code> e afins) são do padrão da Cloud API.
          </p>
        </div>

        <div>
          <label for="whatsapp-nome" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">Nome do provedor</label>
          <input
            id="whatsapp-nome"
            v-model="provedorNome"
            type="text"
            autocomplete="off"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            placeholder="Ex.: nome do serviço que você contratou"
          >
          <p class="text-[10px] text-text-muted mt-1.5 leading-normal">
            Só um rótulo seu para identificar o serviço nesta tela — não afeta o envio.
          </p>
        </div>

        <div>
          <label for="whatsapp-token" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">Token da API *</label>
          <input
            id="whatsapp-token"
            v-model="tokenInput"
            type="password"
            autocomplete="off"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            placeholder="sk_live_..."
          >
          <p class="text-[10px] text-text-muted mt-1.5 leading-normal">
            <template v-if="mascara">Token atual: <code class="bg-surface-raised px-1 py-0.5 rounded border border-border/80">{{ mascara }}</code>. Cole o token de novo para salvar qualquer alteração — ele é validado em conjunto com a URL.</template>
            <template v-else>O token é validado contra o provedor e guardado com criptografia (Supabase Vault) — nunca fica visível depois de salvo.</template>
          </p>
        </div>

        <div class="bg-surface-raised p-3.5 rounded-lg border border-border space-y-2">
          <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Segurança</h4>
          <p class="text-xs text-text-muted leading-relaxed">
            A URL precisa ser <strong>https</strong> e apontar para um domínio público — é para lá que o token
            é enviado a cada mensagem. O par URL + token é conferido com o provedor antes de ser salvo.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            v-if="configurado"
            type="button"
            class="px-4 py-2 rounded-lg border border-danger-600/40 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 mr-auto"
            :disabled="revoking || saving"
            @click="revogar"
          >
            <span v-if="revoking" class="w-4 h-4 border-2 border-danger-600/30 border-t-danger-600 rounded-full animate-spin" />
            Revogar token
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 shadow-xs"
            :disabled="saving || revoking"
            @click="salvar"
          >
            <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Salvar
          </button>
        </div>
      </div>

      <!-- ── Webhook de recebimento ────────────────────────────────────── -->
      <div class="p-5 rounded-xl border border-border bg-surface space-y-4">
        <div>
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Webhook de recebimento</h3>
          <p class="text-xs text-text-muted mt-1 leading-relaxed">
            Para o WhatsApp entregar aqui as mensagens dos seus clientes, cole este endereço no
            painel do seu provedor de WhatsApp — geralmente um campo chamado
            <strong>Webhook URL</strong> ou <strong>Callback URL</strong>.
          </p>
        </div>

        <div v-if="webhookUrl" class="space-y-2">
          <div class="flex items-center gap-2">
            <input
              :value="webhookUrlExibida"
              type="text"
              readonly
              class="flex-1 min-w-0 px-3.5 py-2 border border-border rounded-lg bg-surface-raised text-sm font-mono text-text-primary"
            >
            <button
              type="button"
              class="p-2 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors shrink-0"
              :title="webhookRevelado ? 'Ocultar' : 'Revelar'"
              @click="webhookRevelado = !webhookRevelado"
            >
              <EyeOff v-if="webhookRevelado" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="px-3 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors text-xs font-semibold shrink-0 flex items-center gap-1.5 active:scale-95"
              @click="copiarWebhookUrl"
            >
              <Check v-if="webhookCopiado" class="w-3.5 h-3.5" />
              <Copy v-else class="w-3.5 h-3.5" />
              {{ webhookCopiado ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
          <p class="text-[10px] text-text-muted leading-normal">
            A parte final do endereço é um código secreto — é ele que prova ao seu sistema que a
            chamada veio mesmo do provedor. Não compartilhe fora do painel do provedor.
          </p>
        </div>

        <div
          v-else
          class="flex items-start gap-2.5 text-xs leading-relaxed text-warning-800 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/40 border border-warning-200/80 dark:border-warning-900 rounded-lg px-3 py-2.5"
        >
          <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {{ webhookConfigurado
              ? 'O código do webhook está configurado, mas o endereço público do sistema (domínio) não está — fale com quem administra o servidor.'
              : 'O código do webhook ainda não foi configurado neste servidor — fale com quem administra o deploy para gerar e cadastrar um.' }}
          </span>
        </div>
      </div>
    </section>
  </main>
</template>
