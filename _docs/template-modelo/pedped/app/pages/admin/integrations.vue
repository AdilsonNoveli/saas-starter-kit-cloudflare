<script setup lang="ts">
/**
 * @descricao: Integrações — provedor de WhatsApp.
 * @objetivo: Cadastrar e revogar a credencial do serviço que envia e recebe as
 *   mensagens do WhatsApp.
 *
 * Passo 4 da §8.19 (`_docs/em-andamento.md`): esta página era o lugar
 * provisório de coisas que agora têm casa própria em `/admin/settings`. Saíram
 * daqui, sem mudança de contrato:
 *   - webhook (URL, toggle, os dois segredos) e dead-letter → `settings/webhooks.vue`
 *   - chave da API OpenAI → `settings/agente.vue`, ao lado dos modelos que ela paga
 */
import { ref, onMounted } from 'vue'
import { RefreshCw, MessageCircle } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'

definePageMeta({ layout: 'admin' })

const { notify, confirm } = useNotification()

// ─── Provedor de WhatsApp (§6.2 da arquitetura de mídia e provedor) ─────────
// Mesmo desenho da chave OpenAI, e pelo mesmo motivo: o token vai para o Vault
// e só o backend com service role alcança as RPCs. A URL base viaja junto na
// mesma gravação porque é validada em par com o token contra o `/me` do
// provedor — não faria sentido salvar uma sem confirmar a outra.
const providerLoading = ref(true)
const providerSaving = ref(false)
const providerRevoking = ref(false)
const providerConfigurado = ref(false)
const providerMascara = ref<string | null>(null)
const providerBaseUrl = ref('')
const providerNome = ref('')
const providerFallbackEnv = ref(false)
const providerTokenInput = ref('')
const providerModalOpen = ref(false)

interface WhatsappProviderStatus {
  configurado: boolean
  mascara: string | null
  baseUrl: string
  provedorNome: string
  usandoFallbackEnv: boolean
}

async function loadProviderStatus(): Promise<void> {
  providerLoading.value = true
  try {
    const status = await $fetch<WhatsappProviderStatus>('/api/admin/integrations/whatsapp-provider/status')
    providerConfigurado.value = status.configurado
    providerMascara.value = status.mascara
    providerBaseUrl.value = status.baseUrl
    providerNome.value = status.provedorNome
    providerFallbackEnv.value = status.usandoFallbackEnv
  } catch {
    notify.error('Erro ao carregar status do provedor de WhatsApp')
  } finally {
    providerLoading.value = false
  }
}

function openProviderModal(): void {
  providerTokenInput.value = ''
  providerModalOpen.value = true
}

async function saveProvider(): Promise<void> {
  if (!providerTokenInput.value.trim()) {
    notify.warning('Token obrigatório', 'Cole o token do provedor para salvar — ele é validado junto com a URL.')
    return
  }

  providerSaving.value = true
  try {
    const result = await $fetch<WhatsappProviderStatus>('/api/admin/integrations/whatsapp-provider', {
      method: 'POST',
      body: {
        apiToken: providerTokenInput.value.trim(),
        baseUrl: providerBaseUrl.value.trim(),
        provedorNome: providerNome.value.trim() || undefined,
      },
    })
    providerConfigurado.value = result.configurado
    providerMascara.value = result.mascara
    providerBaseUrl.value = result.baseUrl
    providerNome.value = result.provedorNome
    providerFallbackEnv.value = result.usandoFallbackEnv
    providerTokenInput.value = ''
    notify.success('Provedor de WhatsApp salvo com sucesso!')
    providerModalOpen.value = false
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao salvar provedor', message ?? 'Tente novamente.')
  } finally {
    providerSaving.value = false
  }
}

async function revokeProviderToken(): Promise<void> {
  const ok = await confirm({
    title: 'Revogar token do provedor?',
    message: 'O token será apagado do cofre e o WhatsApp para de enviar mensagens até você cadastrar outro. A URL do provedor é mantida. Não dá para desfazer.',
    confirmText: 'Revogar',
    cancelText: 'Cancelar',
    variant: 'error',
  })
  if (!ok) return

  providerRevoking.value = true
  try {
    // A revogação não devolve URL nem rótulo (eles permanecem no banco), só o
    // estado da credencial — daí o tipo próprio em vez de `WhatsappProviderStatus`.
    const result = await $fetch<{ revogado: boolean, usandoFallbackEnv: boolean }>(
      '/api/admin/integrations/whatsapp-provider',
      { method: 'DELETE' },
    )
    providerConfigurado.value = false
    providerMascara.value = null
    providerFallbackEnv.value = result.usandoFallbackEnv
    providerTokenInput.value = ''
    notify.success('Token revogado', 'Cadastre um novo token para o WhatsApp voltar a enviar mensagens.')
    providerModalOpen.value = false
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao revogar token', message ?? 'Tente novamente.')
  } finally {
    providerRevoking.value = false
  }
}

onMounted(() => {
  void loadProviderStatus()
})
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface text-text-primary font-sans">

    <!-- Header -->
    <header class="bg-surface border-b border-border sticky top-0 z-10">
      <div class="flex items-center justify-between px-6 py-4">
        <h1 class="text-lg font-bold tracking-tight">Integrações</h1>
        <button
          type="button"
          class="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors active:scale-95"
          title="Atualizar"
          :disabled="providerLoading"
          @click="loadProviderStatus"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': providerLoading }" />
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-4xl mx-auto px-6 py-8">

      <p class="text-sm text-text-muted mb-6">
        Conecte o serviço que envia e recebe as mensagens do WhatsApp da sua loja.
      </p>

      <!-- Loading State -->
      <div v-if="providerLoading" class="flex items-center justify-center py-12">
        <div class="w-8 h-8 border-2 border-border border-t-brand-green rounded-full animate-spin" />
      </div>

      <!-- Grid de cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <!-- Card Provedor de WhatsApp -->
        <div
          class="border border-border rounded-xl p-5 flex flex-col gap-4 cursor-pointer hover:border-brand-green/50 hover:shadow-xs transition-all group bg-surface"
          @click="openProviderModal"
        >
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0 text-brand-green">
              <MessageCircle class="w-6 h-6" />
            </div>

            <span
              v-if="providerConfigurado"
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
              Inativo
            </span>
          </div>

          <div>
            <h3 class="text-sm font-bold text-text-primary group-hover:text-brand-green transition-colors">
              Provedor de WhatsApp
            </h3>
            <p class="text-xs text-text-muted mt-1 leading-relaxed">
              Endereço e token do serviço que envia e recebe as mensagens do WhatsApp
              <template v-if="providerNome">({{ providerNome }})</template>.
            </p>
          </div>

          <!-- Aviso de credencial legada (§3.2): o envio funciona, mas presa ao
               deploy — é exatamente o que impede trocar de provedor pela tela. -->
          <p
            v-if="providerFallbackEnv"
            class="text-[11px] leading-relaxed text-warning-800 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/40 border border-warning-200/80 dark:border-warning-900 rounded-lg px-2.5 py-2"
          >
            Usando credencial de ambiente (legado) — cadastre o token para poder trocar de provedor sem deploy.
          </p>

          <div v-if="providerMascara" class="mt-auto pt-2 border-t border-border/60">
            <span class="text-[10px] font-mono text-text-muted truncate block">
              {{ providerMascara }}
            </span>
          </div>
        </div>

      </div>
    </main>

    <!-- Modal Provedor de WhatsApp -->
    <UiModal
      :open="providerModalOpen"
      title="Configurar Provedor de WhatsApp"
      size="md"
      @close="providerModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="saveProvider">
        <div
          v-if="providerFallbackEnv"
          class="text-xs leading-relaxed text-warning-800 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/40 border border-warning-200/80 dark:border-warning-900 rounded-lg px-3 py-2.5"
        >
          As mensagens estão saindo com a credencial de ambiente (legado). Cadastre o token
          aqui para poder trocar de provedor sem precisar de um novo deploy.
        </div>

        <div>
          <label for="provider-base-url" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">URL base do provedor *</label>
          <input
            id="provider-base-url"
            v-model="providerBaseUrl"
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
          <label for="provider-nome" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">Nome do provedor</label>
          <input
            id="provider-nome"
            v-model="providerNome"
            type="text"
            autocomplete="off"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            placeholder="Datafy"
          >
          <p class="text-[10px] text-text-muted mt-1.5 leading-normal">
            Só um rótulo para você identificar o serviço nesta tela.
          </p>
        </div>

        <div>
          <label for="provider-token" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">Token da API *</label>
          <input
            id="provider-token"
            v-model="providerTokenInput"
            type="password"
            autocomplete="off"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            placeholder="sk_live_..."
          >
          <p class="text-[10px] text-text-muted mt-1.5 leading-normal">
            <template v-if="providerMascara">Token atual: <code class="bg-surface-raised px-1 py-0.5 rounded border border-border/80">{{ providerMascara }}</code>. Cole o token de novo para salvar qualquer alteração — ele é validado em conjunto com a URL.</template>
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
      </form>

      <template #footer>
        <!-- Revogar só aparece com token cadastrado: sem ele a ação não tem
             alvo (mesma regra do card da OpenAI). -->
        <button
          v-if="providerConfigurado"
          type="button"
          class="px-4 py-2 rounded-lg border border-danger-600/40 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 mr-auto"
          :disabled="providerRevoking || providerSaving"
          @click="revokeProviderToken"
        >
          <span v-if="providerRevoking" class="w-4 h-4 border-2 border-danger-600/30 border-t-danger-600 rounded-full animate-spin" />
          Revogar token
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-sm font-medium active:scale-95"
          @click="providerModalOpen = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 shadow-xs"
          :disabled="providerSaving || providerRevoking"
          @click="saveProvider"
        >
          <span v-if="providerSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Salvar
        </button>
      </template>
    </UiModal>

  </div>
</template>
