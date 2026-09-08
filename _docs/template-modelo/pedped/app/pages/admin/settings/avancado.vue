<script setup lang="ts">
/**
 * @descricao: Aba "Avançado" das configurações da loja.
 * @objetivo: Edição do kanban de pedidos e regras de arquivamento automático.
 *
 * Nada aqui tem a ver com webhooks (esses moram em `settings/webhooks.vue`) nem
 * com `/admin/integrations`. A fatia de `loja` desta aba é uma coluna só:
 * `config_pedidos`.
 */
import { ref, computed, onMounted } from 'vue'
import { Plus } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'
import { useLojaConfig } from '~/composables/useLojaConfig'
import type { Option as SelectOption } from '~/components/ui/Select.vue'
import type { PedidosConfig } from '~~/shared/types/store'
import type { KanbanColunaRow } from '~~/shared/types/order'

const supabase = useSupabaseClient()
const { notify } = useNotification()
const { salvarFatia } = useLojaConfig()

const loading = ref<boolean>(true)
const saving = ref<boolean>(false)

interface ConfigPedidos {
  regras_arquivamento: Array<{ status: string, horas: number }>
  horas_fallback: number
  permitir_editar_kanban: boolean
}

const defaultPedidosConfig: ConfigPedidos = {
  regras_arquivamento: [
    { status: 'entregue', horas: 6 },
    { status: 'cancelado', horas: 6 },
  ],
  horas_fallback: 48,
  permitir_editar_kanban: false,
}

const configPedidos = ref<ConfigPedidos>({
  ...defaultPedidosConfig,
  regras_arquivamento: [...defaultPedidosConfig.regras_arquivamento],
})

const colunas = ref<KanbanColunaRow[]>([])

/** Opções de colunas kanban para o select de status nas regras de arquivamento. */
const colunasOptions = computed<SelectOption[]>(() =>
  colunas.value.map((c) => ({ value: c.chave, label: c.label })),
)

onMounted(async () => {
  loading.value = true

  const [lojaResult, colunasResult] = await Promise.all([
    supabase.from('loja').select('config_pedidos').limit(1).maybeSingle(),
    supabase.from('kanban_coluna').select('chave, label, cor, ordem, visivel').order('ordem'),
  ])

  if (lojaResult.error && lojaResult.error.code !== 'PGRST116') {
    notify.error('Erro ao carregar configurações', lojaResult.error.message)
  }
  const rawPedidos = lojaResult.data?.config_pedidos as PedidosConfig | null
  if (rawPedidos) {
    configPedidos.value = {
      regras_arquivamento: rawPedidos.regras_arquivamento.map((r) => ({ status: r.status, horas: r.horas })),
      horas_fallback: rawPedidos.horas_fallback,
      permitir_editar_kanban: rawPedidos.permitir_editar_kanban ?? false,
    }
  }

  if (!colunasResult.error && colunasResult.data) {
    colunas.value = colunasResult.data as KanbanColunaRow[]
  }

  loading.value = false
})

function addArchiveRule(): void {
  configPedidos.value.regras_arquivamento.push({ status: '', horas: 6 })
}

function removeArchiveRule(index: number): void {
  configPedidos.value.regras_arquivamento.splice(index, 1)
}

async function save(): Promise<void> {
  const regrasInvalidas = configPedidos.value.regras_arquivamento.filter(
    (r) => !r.status || r.horas <= 0 || r.horas > 720,
  )
  if (regrasInvalidas.length > 0) {
    notify.warning('Regra inválida', 'Verifique as regras de arquivamento: status vazio ou horas fora do intervalo 1–720.')
    return
  }
  if (configPedidos.value.horas_fallback < 1 || configPedidos.value.horas_fallback > 720) {
    notify.warning('Fallback inválido', 'O fallback de arquivamento deve estar entre 1 e 720 horas.')
    return
  }

  saving.value = true

  // Releitura antes da gravação: `config_pedidos` é um JSON, e uma chave nova
  // acrescentada por outra tela não pode sumir porque esta aqui gravou o objeto
  // local inteiro.
  const { data: fresh } = await supabase.from('loja').select('config_pedidos').limit(1).maybeSingle()
  const pedidosFresh = (fresh?.config_pedidos as Record<string, unknown> | null) ?? {}

  const erro = await salvarFatia({
    config_pedidos: {
      ...pedidosFresh,
      regras_arquivamento: configPedidos.value.regras_arquivamento,
      horas_fallback: configPedidos.value.horas_fallback,
      permitir_editar_kanban: configPedidos.value.permitir_editar_kanban,
    },
  })

  saving.value = false

  if (erro) {
    notify.error('Erro ao salvar', erro)
    return
  }
  notify.success('Configurações salvas')
}
</script>

<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center">
    <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
  </div>

  <main v-else class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="space-y-8">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold mb-1">Avançado</h2>
          <p class="text-sm text-text-muted">Edição do quadro de pedidos e arquivamento automático.</p>
        </div>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 shrink-0"
          :disabled="saving"
          @click="save"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ saving ? 'Salvando…' : 'Salvar Alterações' }}
        </button>
      </div>

      <!-- Kanban de Pedidos -->
      <div class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-text-primary mb-1">Kanban de Pedidos</h3>
          <p class="text-xs text-text-muted leading-relaxed">
            As colunas <strong>Pendente</strong> e <strong>Confirmado</strong> são fixas — são a porta de
            entrada dos pedidos e da automação. As demais etapas podem ser adaptadas ao seu processo de venda.
          </p>
        </div>

        <div class="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-surface">
          <div class="flex-1">
            <p class="text-sm font-semibold text-text-primary">Permitir editar o Kanban</p>
            <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
              Habilita adicionar, renomear, recolorir, reordenar e excluir colunas de etapa no quadro de pedidos.
              Colunas com pedidos não podem ser excluídas.
            </p>
          </div>
          <div class="shrink-0">
            <UiToggle v-model="configPedidos.permitir_editar_kanban" size="sm" />
          </div>
        </div>
      </div>

      <!-- Configuração de Pedidos (Arquivamento) -->
      <div class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-text-primary mb-1">Arquivamento de Pedidos</h3>
          <p class="text-xs text-text-muted leading-relaxed">
            Pedidos são arquivados automaticamente (a cada hora via cron) quando permanecem
            em um status pelo tempo definido. O <strong>fallback</strong> captura qualquer pedido
            não coberto pelas regras acima.
          </p>
        </div>

        <!-- Regras por status -->
        <div class="border border-border rounded-lg bg-surface overflow-hidden">
          <div class="px-4 py-3 bg-surface-raised border-b border-border flex items-center justify-between">
            <span class="text-xs font-bold text-text-primary uppercase tracking-wider">Regras por Status</span>
            <button
              type="button"
              class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-green hover:text-brand-greenDark transition-colors"
              @click="addArchiveRule"
            >
              <Plus class="w-4 h-4" />
              Adicionar regra
            </button>
          </div>

          <div class="divide-y divide-border bg-surface">
            <div
              v-for="(rule, i) in configPedidos.regras_arquivamento"
              :key="i"
              class="px-4 py-3 flex items-center gap-3"
            >
              <div class="flex-1 min-w-0">
                <UiSelect
                  :model-value="rule.status"
                  :options="colunasOptions"
                  placeholder="Selecionar status…"
                  size="sm"
                  @update:model-value="(v) => { rule.status = v as string }"
                />
              </div>
              <span class="text-xs text-text-muted font-medium shrink-0">arquivar após</span>
              <input
                v-model.number="rule.horas"
                type="number"
                min="1"
                max="720"
                class="w-20 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
              >
              <span class="text-xs text-text-muted font-medium shrink-0">horas</span>
              <button
                type="button"
                class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors shrink-0 active:scale-95"
                title="Remover regra"
                @click="removeArchiveRule(i)"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div
              v-if="configPedidos.regras_arquivamento.length === 0"
              class="px-4 py-6 text-center text-xs text-text-muted"
            >
              Nenhuma regra configurada — apenas o fallback será aplicado.
            </div>
          </div>
        </div>

        <!-- Fallback -->
        <div class="border border-border rounded-lg p-4 bg-surface flex items-center gap-4">
          <div class="flex-1">
            <p class="text-sm font-semibold text-text-primary">Fallback Global</p>
            <p class="text-xs text-text-muted mt-0.5">
              Arquiva qualquer pedido (de qualquer status não coberto pelas regras) mais antigo que o limite.
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <input
              v-model.number="configPedidos.horas_fallback"
              type="number"
              min="6"
              max="720"
              class="w-20 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            >
            <span class="text-xs text-text-muted font-medium">horas</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
