<script setup lang="ts">
/**
 * @descricao: Hub de Integrações das configurações da loja.
 * @objetivo: Exibir cards de integrações disponíveis e seus respectivos status de conexão.
 */
import { ref, onMounted } from 'vue'
import { ArrowRight } from '@lucide/vue'

definePageMeta({ layout: 'admin' })

interface WhatsappProviderStatus {
  configurado: boolean
  mascara: string | null
  baseUrl: string
  provedorNome: string
  usandoFallbackEnv: boolean
  webhookUrl: string | null
  webhookConfigurado: boolean
}

const loading = ref(true)
const whatsappConfigurado = ref(false)
const whatsappProvedorNome = ref('')
const whatsappUsandoFallback = ref(false)

async function carregarStatus(): Promise<void> {
  loading.value = true
  try {
    const status = await $fetch<WhatsappProviderStatus>('/api/admin/integrations/whatsapp-provider/status')
    whatsappConfigurado.value = status.configurado
    whatsappProvedorNome.value = status.provedorNome
    whatsappUsandoFallback.value = status.usandoFallbackEnv
  } catch {
    whatsappConfigurado.value = false
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void carregarStatus()
})
</script>

<template>
  <main class="flex-1 w-full max-w-5xl mx-auto px-6 py-8 pb-32">
    <section class="space-y-8 animate-fade-in">
      <div>
        <h2 class="text-lg font-bold mb-1">Integrações</h2>
        <p class="text-sm text-text-muted">
          Conecte sua loja a serviços externos e aplicativos para automatizar atendimentos, notificações e fluxos.
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl border border-border bg-surface animate-pulse space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div class="w-12 h-12 rounded-xl bg-surface-raised" />
            <div class="w-16 h-5 rounded-full bg-surface-raised" />
          </div>
          <div class="h-5 w-1/2 rounded bg-surface-raised" />
          <div class="h-10 w-full rounded bg-surface-raised" />
          <div class="pt-4 border-t border-border flex justify-between">
            <div class="h-4 w-1/3 rounded bg-surface-raised" />
            <div class="h-4 w-4 rounded bg-surface-raised" />
          </div>
        </div>
      </div>

      <!-- Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- WhatsApp Card -->
        <NuxtLink
          to="/admin/settings/whatsapp"
          class="group relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-surface hover:border-brand-green/40 hover:bg-surface-raised/30 hover:shadow-lg hover:shadow-brand-green/5 transition-all duration-200 cursor-pointer"
        >
          <div>
            <div class="flex items-start justify-between gap-4 mb-4">
              <div class="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0 border border-[#25D366]/20 group-hover:scale-105 transition-transform">
                <img
                  src="/icons/whatsapp.svg"
                  alt="WhatsApp"
                  class="w-7 h-7 object-contain"
                >
              </div>

              <span
                v-if="whatsappConfigurado"
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

            <h3 class="text-base font-bold text-text-primary group-hover:text-brand-green transition-colors">
              WhatsApp
            </h3>
            <p class="text-xs text-text-muted mt-1.5 leading-relaxed">
              Conecte o serviço de mensageria para envio de notificações, atualizações de pedidos e atendimento conversacional.
            </p>

            <div
              v-if="whatsappProvedorNome"
              class="mt-3 inline-flex items-center text-[11px] font-medium text-text-muted bg-surface-raised px-2.5 py-1 rounded-md border border-border/60"
            >
              Provedor: <span class="text-text-primary ml-1 font-semibold">{{ whatsappProvedorNome }}</span>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-text-primary group-hover:text-brand-green transition-colors">
            <span>Configurar integração</span>
            <ArrowRight class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
