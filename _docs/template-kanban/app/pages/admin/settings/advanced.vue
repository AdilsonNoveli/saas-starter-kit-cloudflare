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

/**
 * Subconjunto de `kanban_column` realmente selecionado abaixo — mesmo motivo
 * de `KanbanColunaView` em `admin/orders/index.vue`: evita o cast mentiroso
 * pro tipo completo (flags não carregadas fingindo ser `boolean`).
 */
type KanbanColunaConfig = Pick<KanbanColunaRow, 'chave' | 'label' | 'cor' | 'ordem' | 'visivel' | 'is_entry'>

const colunas = ref<KanbanColunaConfig[]>([])
/** Salvo aqui pra reverter o `<select>` se a troca de coluna principal falhar. */
const colunaPrincipal = ref<string>('')
const salvandoColunaPrincipal = ref<boolean>(false)

/** G13 §5 (Camada 1) — só liga/desliga o beep; a bolinha pulsante nunca é desligável. */
const chatAlertaSonoroAtivo = ref<boolean>(true)

/** Opções de colunas kanban para o select de status nas regras de arquivamento. */
const colunasOptions = computed<SelectOption[]>(() =>
  colunas.value.map((c) => ({ value: c.chave, label: c.label })),
)

onMounted(async () => {
  loading.value = true

  const [lojaResult, colunasResult] = await Promise.all([
    supabase.from('store').select('orders_config, chat_sound_alert_active, layout_config').limit(1).maybeSingle(),
    supabase.from('kanban_column').select('chave:key, label, cor:color, ordem:sort_order, visivel:visible, is_entry').order('sort_order'),
  ])

  if (lojaResult.error && lojaResult.error.code !== 'PGRST116') {
    notify.error('Erro ao carregar configurações', lojaResult.error.message)
  }
  const rawPedidos = lojaResult.data?.orders_config as PedidosConfig | null
  if (rawPedidos) {
    configPedidos.value = {
      regras_arquivamento: rawPedidos.regras_arquivamento.map((r) => ({ status: r.status, horas: r.horas })),
      horas_fallback: rawPedidos.horas_fallback,
      permitir_editar_kanban: rawPedidos.permitir_editar_kanban ?? false,
    }
  }
  if (lojaResult.data?.chat_sound_alert_active !== undefined && lojaResult.data?.chat_sound_alert_active !== null) {
    chatAlertaSonoroAtivo.value = lojaResult.data.chat_sound_alert_active
  }

  if (!colunasResult.error && colunasResult.data) {
    colunas.value = colunasResult.data as KanbanColunaConfig[]
    colunaPrincipal.value = colunas.value.find((c) => c.is_entry)?.chave ?? ''
  }

  loading.value = false
})

/**
 * Troca qual coluna é a ENTRADA/principal — RPC `set_principal_kanban_column`
 * (migration 126), fora do `save()` geral porque muda o schema (is_system +
 * is_entry) na hora, não uma preferência em `config_pedidos`. A proteção
 * contra exclusão se move JUNTO pra coluna escolhida — decisão explícita, a
 * coluna anterior vira comum (editável/excluível normalmente).
 */
async function trocarColunaPrincipal(novaChave: string): Promise<void> {
  const anterior = colunaPrincipal.value
  if (!novaChave || novaChave === anterior) return

  salvandoColunaPrincipal.value = true
  const { error } = await supabase.rpc('set_principal_kanban_column', { p_key: novaChave })
  salvandoColunaPrincipal.value = false

  if (error) {
    notify.error('Falha ao trocar a coluna principal', error.message)
    return
  }

  colunas.value = colunas.value.map((c) => ({ ...c, is_entry: c.chave === novaChave }))
  colunaPrincipal.value = novaChave
  notify.success('Coluna principal atualizada', `Pedidos novos passam a nascer em "${colunas.value.find((c) => c.chave === novaChave)?.label ?? novaChave}".`)
}

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

  // Releitura antes da gravação: `orders_config` é JSON, e uma chave nova
  // acrescentada por outra tela não pode sumir porque esta aqui gravou o
  // objeto local inteiro.
  const { data: fresh } = await supabase.from('store').select('orders_config').limit(1).maybeSingle()
  const pedidosFresh = (fresh?.orders_config as Record<string, unknown> | null) ?? {}

  const erro = await salvarFatia({
    orders_config: {
      ...pedidosFresh,
      regras_arquivamento: configPedidos.value.regras_arquivamento,
      horas_fallback: configPedidos.value.horas_fallback,
      permitir_editar_kanban: configPedidos.value.permitir_editar_kanban,
    },
    chat_sound_alert_active: chatAlertaSonoroAtivo.value,
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
            A coluna principal é a única porta de entrada dos pedidos, de qualquer canal — sempre uma só, fixa
            contra exclusão. As demais etapas podem ser adaptadas ao seu processo de venda.
          </p>
        </div>

        <div class="flex flex-col gap-1.5 p-4 rounded-lg border border-border bg-surface">
          <span class="text-sm font-semibold text-text-primary">Coluna Principal</span>
          <UiSelect
            :model-value="colunaPrincipal"
            :options="colunasOptions"
            :disabled="salvandoColunaPrincipal"
            size="sm"
            @update:model-value="(v) => trocarColunaPrincipal(v as string)"
          />
          <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
            Todo pedido nasce nesta coluna, de qualquer canal (site, WhatsApp, PDV). Trocar move a proteção
            contra exclusão para a coluna escolhida — a anterior vira uma etapa comum, editável e excluível.
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

      <!-- Alerta de Transbordo do Chat -->
      <div class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-text-primary mb-1">Alerta de Transbordo do Chat</h3>
          <p class="text-xs text-text-muted leading-relaxed">
            Quando um cliente entra em transbordo (aguardando atendimento humano), o ícone do Chat
            e o card do cliente na inbox sempre mostram uma bolinha pulsante. O beep no navegador é opcional.
          </p>
        </div>

        <div class="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-surface">
          <div class="flex-1">
            <p class="text-sm font-semibold text-text-primary">Tocar som de alerta</p>
            <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
              Toca um beep curto no navegador sempre que um novo cliente entra em transbordo,
              enquanto o painel administrativo estiver aberto em qualquer página.
            </p>
          </div>
          <div class="shrink-0">
            <UiToggle v-model="chatAlertaSonoroAtivo" size="sm" />
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
