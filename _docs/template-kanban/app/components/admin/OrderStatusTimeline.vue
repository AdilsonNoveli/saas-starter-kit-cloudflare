<!--
  @descricao: Timeline de transições de status de um pedido (Fase 5.2).
  @objetivo: Render compacto do `pedido_status_historico` exibindo a
    sequência cronológica de mudanças com origem e horário. Consumido
    pela nota térmica e pelo modal do pedido.
-->

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type {
  HistoryOrigin,
  KanbanColunaRow,
  OrderStatusHistoryRow,
} from '~~/shared/types/order'

const props = defineProps<{
  /** ID do pedido a ser carregado. Quando `null`, a timeline é limpa. */
  readonly pedidoId: string | null
}>()

const supabase = useSupabaseClient()
const loading = ref<boolean>(false)
const eventos = ref<readonly OrderStatusHistoryRow[]>([])
const errorMessage = ref<string | null>(null)
const colunas = ref<KanbanColunaRow[]>([])

async function load(id: string): Promise<void> {
  loading.value = true
  errorMessage.value = null
  const { data, error } = await supabase
    .from('order_status_history')
    .select('id, pedido_id:order_id, status_anterior:previous_status, status_novo:new_status, alterado_por:changed_by, origem:source, criado_em:created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    errorMessage.value = error.message
    eventos.value = []
  } else {
    eventos.value = (data ?? []) as unknown as OrderStatusHistoryRow[]
  }
  loading.value = false
}

async function loadColunas(): Promise<void> {
  const { data } = await supabase
    .from('kanban_column')
    .select('chave:key, label, cor:color, ordem:sort_order, visivel:visible')
  colunas.value = (data ?? []) as unknown as KanbanColunaRow[]
}

watch(
  () => props.pedidoId,
  (id) => {
    if (id) void load(id)
    else eventos.value = []
  },
)

onMounted(() => {
  void loadColunas()
  if (props.pedidoId) void load(props.pedidoId)
})

/** Mapa chave -> label das colunas (dinâmico). */
const statusLabelMap = computed<Map<string, string>>(() => {
  const map = new Map<string, string>()
  for (const c of colunas.value) map.set(c.chave, c.label)
  return map
})

/** Rótulo da coluna; cai para a própria chave se a coluna foi excluída. */
const statusLabel = (chave: string): string => statusLabelMap.value.get(chave) ?? chave

const origemLabels: Record<HistoryOrigin, string> = {
  admin: 'Admin',
  webhook: 'Webhook',
  sistema: 'Sistema',
  catalogo: 'Catálogo',
  integracao: 'Integração',
}

const formatTime = (iso: string): string =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
</script>

<template>
  <section class="text-xs">
    <div v-if="loading" class="text-text-muted italic">Carregando histórico…</div>
    <div v-else-if="errorMessage" class="text-danger-600">
      Erro ao carregar histórico: {{ errorMessage }}
    </div>
    <div v-else-if="eventos.length === 0" class="text-text-muted italic">
      Sem transições registradas.
    </div>
    <ol v-else class="relative ml-2 border-l border-border pl-4 space-y-3">
      <li
        v-for="ev in eventos"
        :key="ev.id"
        class="relative"
      >
        <span
          class="absolute left-[-1.4rem] top-1.5 w-2 h-2 rounded-full bg-text-primary"
          aria-hidden="true"
        />
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-semibold text-text-primary">
            {{ statusLabel(ev.status_novo) }}
          </span>
          <span class="text-text-muted tabular-nums">{{ formatTime(ev.criado_em) }}</span>
        </div>
        <div class="text-text-muted">
          <span v-if="ev.status_anterior">
            de <span class="font-medium">{{ statusLabel(ev.status_anterior) }}</span> ·
          </span>
          <span>{{ origemLabels[ev.origem] }}</span>
        </div>
      </li>
    </ol>
  </section>
</template>
