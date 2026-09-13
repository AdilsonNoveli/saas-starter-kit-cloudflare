<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotification } from '~/composables/useNotification'
import { useStore } from '~/composables/useStore'
import { useFormatters } from '~/composables/useFormatters'

/**
 * Editor autônomo da Campanha de Frete Grátis (aba "Frete Grátis" em
 * /admin/promotions). É um tipo de promoção — vive junto das demais.
 *
 * `config_promocoes` é um JSON único compartilhado com Aparência
 * (mostrar_miniaturas_card). Para não sobrescrever campos que este editor não
 * gerencia, o save faz READ-MODIFY-WRITE: relê o JSON atual, mescla apenas os
 * 4 campos de frete e persiste. Fonte única de leitura no client: useStore().
 */

const { notify } = useNotification()
const { formatCurrency } = useFormatters()

const DEFAULTS = {
  habilitar_upsell_frete: true,
  meta_frete_gratis: 80,
  habilitar_toast_upsell: true,
  copy_upsell_success: 'Parabéns! Você desbloqueou o FRETE GRÁTIS!',
  copy_upsell_progress: 'Faltam só {valor} para você ganhar FRETE GRÁTIS!',
}

const lojaId = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)

const form = ref({ ...DEFAULTS })

onMounted(async () => {
  loading.value = true
  try {
    const res = await $fetch<{ lojaId: string | null; settings: typeof DEFAULTS }>('/api/admin/settings/free-shipping')
    lojaId.value = res.lojaId
    form.value = { ...res.settings }
  } catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Erro ao carregar'
    notify.error('Erro ao carregar', msg)
  }
  loading.value = false
})

async function save(): Promise<void> {
  if (!lojaId.value) {
    notify.error('Loja não encontrada', 'Configure os dados da loja em Configurações primeiro.')
    return
  }
  if (form.value.meta_frete_gratis < 0) {
    notify.warning('Valor inválido', 'A meta de frete grátis não pode ser negativa.')
    return
  }

  saving.value = true
  try {
    await $fetch('/api/admin/settings/free-shipping', {
      method: 'PUT',
      body: {
        lojaId: lojaId.value,
        habilitar_upsell_frete: form.value.habilitar_upsell_frete,
        meta_frete_gratis: Number(form.value.meta_frete_gratis) || 0,
        habilitar_toast_upsell: form.value.habilitar_toast_upsell,
        copy_upsell_success: form.value.copy_upsell_success,
        copy_upsell_progress: form.value.copy_upsell_progress,
      },
    })
    await useStore().fetch({ force: true })
    notify.success('Frete grátis salvo')
  } catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Erro ao salvar'
    notify.error('Erro ao salvar', msg)
  }
  saving.value = false
}
</script>

<template>
  <div class="max-w-3xl">
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-6">
      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-text-muted mb-1">Campanha de Frete Grátis</h3>
        <p class="text-xs text-text-muted">Aumente o ticket médio oferecendo frete grátis a partir de um valor de carrinho. O progresso é exibido no carrinho e no checkout.</p>
      </div>

      <div class="border border-border rounded-lg p-6 bg-surface shadow-xs space-y-6">
        <!-- Toggle principal -->
        <div class="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h4 class="text-sm font-bold text-text-primary">Ativar Campanha de Frete Grátis</h4>
            <p class="text-xs text-text-muted mt-0.5">
              Quando ativo, os clientes ganham frete grátis ao atingir o valor estipulado.
            </p>
          </div>
          <UiToggle v-model="form.habilitar_upsell_frete" size="sm" />
        </div>

        <!-- Subconfigurações -->
        <div
          class="space-y-6 transition-all duration-200"
          :class="!form.habilitar_upsell_frete && 'opacity-40 pointer-events-none'"
        >
          <div>
            <label for="ff-meta" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Valor Mínimo para Frete Grátis (R$)</label>
            <div class="relative max-w-xs">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted pointer-events-none">R$</span>
              <input
                id="ff-meta"
                v-model.number="form.meta_frete_gratis"
                type="number"
                min="0"
                step="1"
                :disabled="!form.habilitar_upsell_frete"
                class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all disabled:opacity-50"
                placeholder="0"
              >
            </div>
            <p class="text-xs text-text-muted mt-1.5">
              Valor configurado: <span class="font-semibold text-text-primary">{{ formatCurrency(form.meta_frete_gratis || 0) }}</span>
            </p>
          </div>

          <div class="border-t border-border/40 pt-5 space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h5 class="text-xs font-bold text-text-primary uppercase tracking-wider">Avisar Progresso ao Cliente</h5>
                <p class="text-xs text-text-muted mt-0.5">
                  Exibe o progresso no carrinho e no checkout para incentivar o cliente a comprar mais e liberar o frete grátis.
                </p>
              </div>
              <UiToggle
                v-model="form.habilitar_toast_upsell"
                size="sm"
                :disabled="!form.habilitar_upsell_frete"
              />
            </div>

            <div
              class="space-y-4 transition-all duration-200"
              :class="(!form.habilitar_toast_upsell || !form.habilitar_upsell_frete) && 'opacity-40 pointer-events-none'"
            >
              <!-- Mensagem de progresso (falta atingir a meta) -->
              <div>
                <label for="ff-copy-progress" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Mensagem de Progresso</label>
                <input
                  id="ff-copy-progress"
                  v-model="form.copy_upsell_progress"
                  type="text"
                  :disabled="!form.habilitar_toast_upsell || !form.habilitar_upsell_frete"
                  class="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                  placeholder="Ex: Faltam só {valor} para o FRETE GRÁTIS!"
                >
                <p class="text-[11px] text-text-muted mt-1.5">
                  Use <code class="px-1 py-0.5 rounded bg-surface-raised text-text-primary font-mono">{valor}</code> onde o quanto falta deve aparecer (ex.: R$ 20,00).
                </p>
              </div>

              <!-- Mensagem ao atingir a meta -->
              <div>
                <label for="ff-copy" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Mensagem ao Atingir a Meta</label>
                <input
                  id="ff-copy"
                  v-model="form.copy_upsell_success"
                  type="text"
                  :disabled="!form.habilitar_toast_upsell || !form.habilitar_upsell_frete"
                  class="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                  placeholder="Ex: Frete grátis desbloqueado!"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          :disabled="saving"
          class="px-5 py-2.5 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors active:scale-95"
          @click="save"
        >
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </div>
  </div>
</template>
