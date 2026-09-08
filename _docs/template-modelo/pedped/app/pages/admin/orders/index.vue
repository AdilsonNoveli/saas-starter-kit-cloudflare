<script setup lang="ts">
/**
 * @descricao: Operação ao vivo de pedidos (Fase 5.2 / ajuste 5.10).
 * @objetivo: Pedidos NÃO arquivados em duas visões intercambiáveis na MESMA
 *   rota — Kanban (board) e Tabela (lista) — alternadas pelos ícones da
 *   toolbar. Histórico (arquivados) é página própria. As colunas são DINÂMICAS
 *   (migração 015): cada coluna é uma linha de `kanban_coluna` cuja `chave` é
 *   referenciada por `pedidos.status` (FK). O operador edita nome/cor, reordena,
 *   exclui e adiciona colunas direto no quadro. Toda troca de status passa por
 *   `/api/admin/orders/[id]/status` (webhook + trigger 006).
 *
 *   Acesso: a leitura depende de RLS (`is_staff()`); a gestão de colunas exige
 *   `gerente+`. Sem perfil/role de staff, exibimos um aviso explícito em vez de
 *   uma tela vazia silenciosa (o óbvio precisa ser dito ao operador).
 */

import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import {
  Clock, Pencil, Move, Trash2, CirclePlus, Archive, Search, X,
  ChevronFirst, ChevronLast, Plus, Truck, Store, Headset,
} from '@lucide/vue'
import { useState } from 'nuxt/app'
import type { KanbanColunaRow, OrderStatus } from '~~/shared/types/order'
import type { PedidosConfig } from '~~/shared/types/store'
import { formatOrderNumber } from '~~/shared/utils/orderNumber'
import KanbanColumnFormModal from '~/components/admin/KanbanColumnFormModal.vue'
import { useNotification } from '~/composables/useNotification'

definePageMeta({ layout: 'admin' })

const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')
const showMobileSearch = ref(false)
const mobileSearchInput = ref<HTMLInputElement | null>(null)

const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()

/**
 * Janela de retenção do Kanban: somente pedidos não-arquivados criados
 * nos últimos 7 dias. PORQUÊ:
 *  - O job de arquivamento (5.2) move pedidos finalizados (>6h) ou
 *    qualquer pedido (>48h) para `arquivado=true`. A janela de 7 dias é
 *    proteção redundante: cobre janelas de pg_cron pausado, falhas de
 *    rede e migrations parciais. Limites maiores degradam o índice
 *    parcial `idx_pedidos_kanban`.
 */
const KANBAN_DIAS_RETENCAO = 7

/** Papéis que enxergam pedidos (espelha `is_staff()` no banco). */
const STAFF_ROLES: ReadonlySet<string> = new Set([
  'atendente',
  'producao',
  'gerente',
  'administrador',
  'proprietario',
])


/**
 * Subconjunto de `kanban_coluna` realmente selecionado por `loadColunas()`.
 * Evita o cast mentiroso para `KanbanColunaRow` completo (flags não carregadas
 * fingindo ser `boolean`).
 */
type KanbanColunaView = Pick<
  KanbanColunaRow,
  'chave' | 'label' | 'cor' | 'ordem' | 'visivel' | 'is_sistema' | 'is_delivery_dispatch'
>

interface PedidoCard {
  readonly id: string
  readonly short_id?: number | null
  readonly criado_em: string
  readonly status: OrderStatus
  readonly tipo_entrega: 'entrega' | 'retirada'
  readonly forma_pagamento: string
  readonly valor_total: number
  readonly valor_subtotal: number | null
  readonly valor_entrega: number | null
  readonly frete_gratis_aplicado: boolean | null
  readonly troco_para: number | null
  readonly observacoes: string | null
  readonly nota_operacional: string | null
  readonly nota_atendimento: string | null
  readonly cliente_id: string | null
  readonly entregador_id: string | null
  readonly clientes: { nome: string | null; telefone_whatsapp: string | null } | null
  readonly enderecos_cliente: { rua: string | null; numero: string | null; bairro: string | null } | null
  readonly itens_pedido: Array<{
    id: string
    nome_produto_congelado: string | null
    quantidade: number
    subtotal: number | null
    produtos: { nome: string } | null
  }>
  readonly preorders?: Array<{ delivery_date: string }> | { delivery_date: string } | null
}

const pedidos = ref<PedidoCard[]>([])
const colunas = ref<KanbanColunaView[]>([])
const loading = ref<boolean>(true)
const searchQuery = ref<string>('')
const accessoNegado = ref<boolean>(false)

/**
 * Edição do quadro (adicionar/editar/mover/excluir colunas de etapa) é opt-in
 * via Configurações → Avançado (`loja.config_pedidos.permitir_editar_kanban`).
 * Colunas de sistema (Pendente/Confirmado) permanecem fixas mesmo com a edição
 * habilitada — são a porta de entrada dos pedidos e da automação.
 */
const kanbanEditavel = ref<boolean>(false)

async function loadKanbanEditavel(): Promise<void> {
  const { data } = await supabase
    .from('loja')
    .select('config_pedidos')
    .limit(1)
    .maybeSingle()
  const cfg = (data?.config_pedidos ?? null) as PedidosConfig | null
  kanbanEditavel.value = cfg?.permitir_editar_kanban === true
}


let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

// === Modais ===
const selectedPedidoForReceipt = ref<PedidoCard | null>(null)
const selectedClienteId = ref<string | null>(null)
const showClienteModal = ref<boolean>(false)
const selectedPedidoForNote = ref<PedidoCard | null>(null)

function openNoteModal(pedido: PedidoCard): void {
  selectedPedidoForNote.value = pedido
}
function closeNoteModal(): void {
  selectedPedidoForNote.value = null
}
function onNoteSaved(nota: string | null): void {
  const alvo = selectedPedidoForNote.value
  if (!alvo) return
  const idx = pedidos.value.findIndex((p) => p.id === alvo.id)
  if (idx !== -1) pedidos.value[idx] = { ...pedidos.value[idx]!, nota_atendimento: nota }
}

// === Arquivamento individual ===
const archivingOrderId = ref<string | null>(null)

async function archiveOrder(orderId: string): Promise<void> {
  if (archivingOrderId.value) return
  archivingOrderId.value = orderId
  try {
    await $fetch('/api/admin/orders/archive', {
      method: 'POST',
      body: { orderId },
    })
    pedidos.value = pedidos.value.filter((p) => p.id !== orderId)
    notify.success('Pedido arquivado')
  } catch {
    notify.error('Falha ao arquivar', 'Tente novamente.')
  } finally {
    archivingOrderId.value = null
  }
}

/**
 * Verifica se o usuário logado é staff. Usa a policy "Self read own profile"
 * (cada usuário lê o próprio perfil), independente das policies de pedidos.
 */
async function verificarAcesso(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    accessoNegado.value = true
    return false
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('role, ativo')
    .eq('id', user.id)
    .maybeSingle()

  const perfil = (data ?? null) as { role: string; ativo: boolean } | null
  const liberado =
    !error && perfil !== null && perfil.ativo === true && STAFF_ROLES.has(perfil.role)

  accessoNegado.value = !liberado
  return liberado
}

async function loadColunas(): Promise<void> {
  const { data, error } = await supabase
    .from('kanban_coluna')
    .select('chave, label, cor, ordem, visivel, is_sistema, is_delivery_dispatch')
    .order('ordem', { ascending: true })

  if (error) {
    notify.error('Falha ao carregar colunas', error.message)
    return
  }
  colunas.value = (data ?? []) as unknown as KanbanColunaView[]
}

async function loadPedidos(): Promise<void> {
  loading.value = true
  // Janela explícita de 7 dias (ver KANBAN_DIAS_RETENCAO).
  const desde = new Date(Date.now() - KANBAN_DIAS_RETENCAO * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id,
      short_id,
      criado_em,
      status,
      tipo_entrega,
      forma_pagamento,
      valor_total,
      valor_subtotal,
      valor_entrega,
      frete_gratis_aplicado,
      troco_para,
      observacoes,
      nota_operacional,
      nota_atendimento,
      cliente_id,
      entregador_id,
      clientes(nome, telefone_whatsapp),
      enderecos_cliente(rua, numero, bairro),
      itens_pedido(
        id,
        nome_produto_congelado,
        quantidade,
        subtotal,
        produtos(nome)
      ),
      preorders(delivery_date)
    `)
    .eq('arquivado', false)
    .gte('criado_em', desde)
    .order('criado_em', { ascending: false })

  if (error) {
    notify.error('Falha ao carregar pedidos', error.message)
  } else {
    pedidos.value = (data ?? []) as unknown as PedidoCard[]
  }
  loading.value = false
}

onMounted(async () => {
  const liberado = await verificarAcesso()
  if (!liberado) {
    loading.value = false
    return
  }

  restoreCollapsedState()
  await Promise.all([loadColunas(), loadPedidos(), loadKanbanEditavel()])

  // Realtime: UPDATE aplica o payload direto ao array — evita a race condition
  // onde loadPedidos() recarrega dados obsoletos enquanto o PUT ainda está em
  // trânsito (o SELECT leria o banco ANTES do commit do status). INSERT recarrega
  // tudo para trazer o pedido novo com seus relacionamentos (clientes, itens…).
  realtimeChannel = supabase
    .channel('pedidos-kanban')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pedidos' },
      (payload) => {
        const novo = payload.new as { id: string; status?: string; entregador_id?: string | null; arquivado?: boolean }
        const idx = pedidos.value.findIndex((p) => p.id === novo.id)
        if (idx === -1) return
        // Pedido arquivado → remove do kanban imediatamente.
        if (novo.arquivado === true) {
          pedidos.value = pedidos.value.filter((_, i) => i !== idx)
          return
        }
        if (novo.status) {
          pedidos.value[idx] = {
            ...pedidos.value[idx]!,
            status: novo.status as OrderStatus,
            entregador_id: ('entregador_id' in novo ? novo.entregador_id : pedidos.value[idx]!.entregador_id) ?? null,
          }
        }
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pedidos' },
      () => { void loadPedidos() },
    )
    .subscribe()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

// === Grab to Scroll Kanban Board ===
const boardWrapper = ref<HTMLElement | null>(null)
const isDown = ref(false)
const startX = ref(0)
const scrollLeftStart = ref(0)

function onMouseDown(e: MouseEvent): void {
  const target = e.target as HTMLElement
  
  // Ignora se clicar em cartões, cabeçalhos de coluna, botões, inputs, etc.
  if (
    target.closest('.kanban-card') || 
    target.closest('.kanban-column-header') || 
    target.closest('button') || 
    target.closest('input') || 
    target.closest('select') || 
    target.closest('a')
  ) {
    return
  }

  isDown.value = true
  const wrapper = boardWrapper.value
  if (!wrapper) return

  startX.value = e.pageX - wrapper.offsetLeft
  scrollLeftStart.value = wrapper.scrollLeft
  
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent): void {
  if (!isDown.value) return
  const wrapper = boardWrapper.value
  if (!wrapper) return
  
  e.preventDefault()
  const x = e.pageX - wrapper.offsetLeft
  const walk = (x - startX.value) * 1.5 // Velocidade de arrasto
  wrapper.scrollLeft = scrollLeftStart.value - walk
}

function onMouseUp(): void {
  isDown.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

// === Drag & Drop (HTML5 nativo) ===
const draggedOrderId = ref<string | null>(null)

function onDragStart(event: DragEvent, id: string): void {
  draggedOrderId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '0.5'
  }
}

function onDragEnd(event: DragEvent): void {
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '1'
  }
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

async function onColumnDrop(targetChave: OrderStatus, event: DragEvent): Promise<void> {
  event.preventDefault()
  event.stopPropagation()
  // Reordenação de coluna tem prioridade sobre movimentação de card.
  if (draggedColChave.value) {
    const from = draggedColChave.value
    draggedColChave.value = null
    await reorderColuna(from, targetChave)
    return
  }
  const id = draggedOrderId.value
  if (!id) return
  await updateStatus(id, targetChave)
  draggedOrderId.value = null
}

async function updateStatus(id: string, novoStatus: OrderStatus): Promise<void> {
  const idx = pedidos.value.findIndex((p) => p.id === id)
  if (idx === -1) {
    notify.error('Pedido não encontrado')
    return
  }
  const pedido = pedidos.value[idx]!
  const statusAntigo = pedido.status
  if (statusAntigo === novoStatus) return

  // Optimistic UI: aplica o status e guarda o anterior para rollback.
  pedidos.value[idx] = { ...pedido, status: novoStatus }

  try {
    const response = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText || 'Erro ao atualizar status' }))
      throw new Error(errorData.message)
    }

    notify.success('Status atualizado', `Pedido #${formatOrderNumber(id, pedido.short_id)}`)
  } catch (err) {
    // Rollback
    pedidos.value[idx] = { ...pedidos.value[idx]!, status: statusAntigo }
    const message = err instanceof Error ? err.message : 'Falha ao atualizar status.'
    notify.error('Erro ao atualizar', message)
  }
}

// === Helpers ===

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Colunas visíveis com as de sistema (Pendente/Confirmado) sempre à frente,
 * independente do que estiver gravado em `ordem` — invariante visual do fluxo.
 */
const colunasVisiveis = computed<KanbanColunaView[]>(() => {
  const visiveis = colunas.value.filter((c) => c.visivel)
  const sistema = visiveis.filter((c) => c.is_sistema).sort((a, b) => a.ordem - b.ordem)
  const etapas = visiveis.filter((c) => !c.is_sistema).sort((a, b) => a.ordem - b.ordem)
  return [...sistema, ...etapas]
})

/** Chave da coluna de despacho (flag-driven) — onde a entrega aguarda entregador. */
const dispatchChave = computed<string | null>(
  () => colunas.value.find((c) => c.is_delivery_dispatch)?.chave ?? null,
)


// === Colapso de colunas (padrão oficial: qualquer coluna pode ser recolhida) ===

const COLLAPSED_STORAGE_KEY = 'admin:kanban:collapsed'
const collapsedCols = ref<ReadonlySet<string>>(new Set())

/** Preferência de colapso é local do operador (UI), não configuração da loja. */
function restoreCollapsedState(): void {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      collapsedCols.value = new Set(parsed.filter((v): v is string => typeof v === 'string'))
    }
  } catch {
    // Preferência corrompida: ignora e segue com tudo expandido.
  }
}

function toggleCollapse(chave: string): void {
  const next = new Set(collapsedCols.value)
  if (next.has(chave)) {
    next.delete(chave)
  } else {
    next.add(chave)
  }
  collapsedCols.value = next
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...next]))
  } catch {
    // Sem localStorage (modo privado): o colapso vale só para a sessão atual.
  }
}

const isCollapsed = (col: KanbanColunaView): boolean =>
  collapsedCols.value.has(col.chave)

// === Estilo do cabeçalho da coluna ===

/**
 * Cabeçalho monocromático derivado da cor da coluna:
 *  - fundo: mistura mais presente da cor sobre a superfície (tema claro/escuro);
 *  - texto/ícones: a MESMA cor, apenas puxada para o `text-primary` do tema —
 *    escurece no claro e clareia no escuro, mantendo contraste em dark mode.
 */
function headerStyle(col: KanbanColunaView): Record<string, string> {
  return {
    backgroundColor: `color-mix(in srgb, ${col.cor} 32%, var(--color-surface-raised))`,
    borderColor: `color-mix(in srgb, ${col.cor} 55%, var(--color-border))`,
    color: `color-mix(in srgb, ${col.cor} 60%, var(--color-text-primary))`,
  }
}


const filteredPedidos = computed<PedidoCard[]>(() => {
  if (!searchQuery.value) return pedidos.value
  const q = searchQuery.value.toLowerCase()
  return pedidos.value.filter(
    (p) =>
      p.id.toLowerCase().includes(q) ||
      (p.short_id !== null && p.short_id !== undefined && String(p.short_id).includes(q)) ||
      (p.clientes?.nome ?? '').toLowerCase().includes(q),
  )
})

function pedidosByStatus(status: OrderStatus): PedidoCard[] {
  return filteredPedidos.value.filter((p) => p.status === status)
}

function getPreorderDeliveryDate(pedido: PedidoCard): string | null {
  if (!pedido.preorders) return null
  if (Array.isArray(pedido.preorders)) {
    return pedido.preorders[0]?.delivery_date ?? null
  }
  if (typeof pedido.preorders === 'object' && 'delivery_date' in pedido.preorders) {
    return (pedido.preorders as { delivery_date: string }).delivery_date ?? null
  }
  return null
}


// === Gestão de colunas (gerente+; RLS "Manage kanban_coluna") ===

const draggedColChave = ref<string | null>(null)
const showColForm = ref<boolean>(false)
const colFormMode = ref<'add' | 'edit'>('add')
const colFormInitial = ref<{ label: string; cor: string }>({ label: '', cor: '#6B7280' })
const editingChave = ref<string | null>(null)

function onColDragStart(chave: string, event: DragEvent): void {
  draggedColChave.value = chave
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', chave)
  }
}

function onColDragEnd(): void {
  draggedColChave.value = null
}

/** Deriva um slug ASCII estável a partir do rótulo (identidade da coluna). */
function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
}

/** Garante unicidade da chave entre as colunas existentes. */
function gerarChaveUnica(label: string): string {
  const base = slugify(label) || 'coluna'
  const existentes = new Set(colunas.value.map((c) => c.chave))
  if (!existentes.has(base)) return base
  let i = 2
  while (existentes.has(`${base}_${i}`)) i += 1
  return `${base}_${i}`
}

function openAddColuna(): void {
  colFormMode.value = 'add'
  colFormInitial.value = { label: '', cor: '#6B7280' }
  editingChave.value = null
  showColForm.value = true
}

function openEditColuna(col: KanbanColunaView): void {
  if (col.is_sistema || !kanbanEditavel.value) return
  colFormMode.value = 'edit'
  colFormInitial.value = { label: col.label, cor: col.cor }
  editingChave.value = col.chave
  showColForm.value = true
}

async function handleColFormSave(value: { label: string; cor: string }): Promise<void> {
  if (colFormMode.value === 'edit' && editingChave.value) {
    const { error } = await supabase
      .from('kanban_coluna')
      .update({ label: value.label, cor: value.cor })
      .eq('chave', editingChave.value)
    if (error) {
      notify.error('Falha ao salvar coluna', error.message)
      return
    }
    notify.success('Coluna atualizada')
  } else {
    const chave = gerarChaveUnica(value.label)
    const ordem = colunas.value.reduce((max, c) => Math.max(max, c.ordem), 0) + 1
    const { error } = await supabase
      .from('kanban_coluna')
      .insert({ chave, label: value.label, cor: value.cor, ordem, visivel: true })
    if (error) {
      notify.error('Falha ao criar coluna', error.message)
      return
    }
    notify.success('Coluna criada')
  }
  showColForm.value = false
  await loadColunas()
}

async function deleteColuna(col: KanbanColunaView): Promise<void> {
  // Defesa em profundidade: o botão já é escondido para colunas de sistema e o
  // banco tem trigger de guarda; aqui evitamos até a tentativa.
  if (col.is_sistema || !kanbanEditavel.value) {
    notify.error('Coluna protegida', 'Colunas de sistema não podem ser excluídas.')
    return
  }

  const ok = await confirm({
    title: 'Excluir coluna',
    message: `Excluir a coluna "${col.label}"? Esta ação não pode ser desfeita.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    variant: 'error',
  })
  if (!ok) return

  const { error } = await supabase.from('kanban_coluna').delete().eq('chave', col.chave)
  if (error) {
    // FK ON DELETE RESTRICT (código 23503): há pedidos referenciando a coluna.
    const message = /23503|foreign key|violates|still referenced/i.test(error.message)
      ? 'Há pedidos nesta coluna. Mova-os para outra coluna antes de excluir.'
      : error.message
    notify.error('Não foi possível excluir', message)
    return
  }
  notify.success('Coluna excluída')
  await loadColunas()
}

/**
 * Move a coluna `fromChave` para a posição de `toChave` e reescreve `ordem`.
 * Colunas de sistema (Pendente/Confirmado) são imóveis: nem origem nem destino —
 * e a numeração final sempre as mantém nas primeiras posições.
 */
async function reorderColuna(fromChave: string, toChave: string): Promise<void> {
  if (fromChave === toChave || !kanbanEditavel.value) return

  const sistema = [...colunas.value]
    .filter((c) => c.is_sistema)
    .sort((a, b) => a.ordem - b.ordem)
  const etapas = [...colunas.value]
    .filter((c) => !c.is_sistema)
    .sort((a, b) => a.ordem - b.ordem)

  const fromIdx = etapas.findIndex((c) => c.chave === fromChave)
  const toIdx = etapas.findIndex((c) => c.chave === toChave)
  // Origem ou destino fora do conjunto reordenável (coluna de sistema): ignora.
  if (fromIdx === -1 || toIdx === -1) return

  const [movida] = etapas.splice(fromIdx, 1)
  if (!movida) return
  etapas.splice(toIdx, 0, movida)

  // Numeração canônica: sistema em 1..k, etapas em k+1..n. Persiste só o que mudou.
  const reordenadas = [...sistema, ...etapas].map((c, i) => ({ ...c, ordem: i + 1 }))
  const alteradas = reordenadas.filter((c) => {
    const orig = colunas.value.find((o) => o.chave === c.chave)
    return orig !== undefined && orig.ordem !== c.ordem
  })
  if (alteradas.length === 0) return

  colunas.value = reordenadas // Optimistic UI.
  const results = await Promise.all(
    alteradas.map((c) =>
      supabase.from('kanban_coluna').update({ ordem: c.ordem }).eq('chave', c.chave),
    ),
  )
  const firstError = results.find((r) => r.error)?.error
  if (firstError) {
    notify.error('Falha ao reordenar colunas', firstError.message)
    await loadColunas() // rollback via fonte da verdade
  }
}

function openClienteModal(clienteId: string | null): void {
  if (!clienteId) return
  selectedClienteId.value = clienteId
  showClienteModal.value = true
}

function closeClienteModal(): void {
  showClienteModal.value = false
  selectedClienteId.value = null
}

function formatNotaOperacional(pedido: PedidoCard): string {
  if (!pedido.nota_operacional) return ''
  // Remove caracteres de aviso e espaços do início
  return pedido.nota_operacional.replace(/^[\u26A0\u25B2\s]+/g, '').trim()
}

watch(showMobileSearch, async (val) => {
  if (val) {
    await nextTick()
    mobileSearchInput.value?.focus()
  } else {
    searchQuery.value = ''
  }
})
</script>

<template>
  <div id="kanban-page" class="flex flex-col min-h-screen bg-surface text-text-primary font-sans relative">
    <!-- Header -->
    <header class="flex flex-col border-b border-border bg-surface shrink-0 relative select-none">
      <div class="h-16 flex items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <!-- Botão Plus (+) para Nova Venda (PDV) antes da busca -->
          <NuxtLink
            to="/admin/orders/new"
            class="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-all shadow-xs shrink-0 active:scale-95"
            :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
            title="Nova Venda (PDV)"
            aria-label="Nova Venda (PDV)"
          >
            <Plus class="w-4.5 h-4.5" stroke-width="2.5" />
          </NuxtLink>

          <!-- Busca (Desktop) - Esquerda -->
          <div class="hidden md:block relative w-full max-w-md h-9 shrink-0">
            <label for="header-search-desktop" class="sr-only">Pesquisar</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="header-search-desktop"
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-3 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar..."
            >
          </div>

          <!-- Busca Mobile Toggle Button - Esquerda -->
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors active:scale-95 md:hidden shrink-0 cursor-pointer"
            :class="showMobileSearch ? 'bg-brand-light dark:bg-brand-green/25 text-text-primary shadow-sm' : 'bg-surface'"
            aria-label="Pesquisar" title="Pesquisar"
            @click="showMobileSearch = !showMobileSearch"
          >
            <Search class="w-4 h-4" />
          </button>

          <!-- Menu de Navegação em Caixa Alta - Iniciando após a Busca -->
          <AdminOrdersNavMenu />

          <!-- Espaço flexível no meio -->
          <div class="flex-1" />

          <!-- Link Acessar Catálogo -->
          <NuxtLink
            to="/"
            target="_blank"
            class="text-[11px] font-extrabold text-admin-primary hover:text-admin-secondary transition-colors uppercase tracking-wider shrink-0 ml-4"
          >
            ACESSAR O CATÁLOGO
          </NuxtLink>
        </div>
      </div>

      <!-- Barra de Busca Mobile -->
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="max-h-0 opacity-0 py-0"
        enter-to-class="max-h-16 opacity-100 py-3"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="max-h-16 opacity-100 py-3"
        leave-to-class="max-h-0 opacity-0 py-0"
      >
        <div
          v-if="showMobileSearch"
          class="px-6 pb-3 border-t border-border/40 md:hidden bg-surface overflow-hidden flex items-center gap-2"
        >
          <div class="relative flex-1 h-9">
            <label for="pedidos-search-mobile" class="sr-only">Pesquisar</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="pedidos-search-mobile"
              ref="mobileSearchInput"
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-8 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar..."
            >
            <button
              v-if="searchQuery"
              type="button"
              class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary"
              @click="searchQuery = ''"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </transition>
    </header>

    <!-- Acesso negado: aviso explícito (sem tela vazia silenciosa) -->
    <div
      v-if="accessoNegado"
      class="flex-1 flex items-center justify-center p-6"
    >
      <div class="max-w-md text-center border border-border bg-surface-raised rounded-xl p-8">
        <h2 class="text-lg font-semibold text-text-primary">Sem permissão para ver pedidos</h2>
        <p class="text-sm text-text-muted mt-2">
          Seu usuário não tem um perfil ativo com acesso à operação de pedidos.
          Solicite a um administrador que conceda o papel adequado.
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-else-if="loading && pedidos.length === 0"
      class="flex-1 flex items-center justify-center"
    >
      <svg class="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <!-- Kanban -->
    <div
      v-else
      ref="boardWrapper"
      class="flex-1 overflow-x-auto overflow-y-hidden kanban-board-wrapper px-4 pt-4 pb-4 select-none"
      @mousedown="onMouseDown"
    >
      <div class="flex gap-2 min-w-max pb-2" style="height: calc(100vh - 4rem);">
        <div
          v-for="col in colunasVisiveis"
          :key="col.chave"
          class="flex flex-col rounded-t-md shrink-0 border border-border bg-surface-raised transition-all"
          :class="[
            isCollapsed(col) ? 'w-11' : 'w-70',
            { 'opacity-50': draggedColChave === col.chave },
          ]"
          @dragover="onDragOver"
          @drop="(e) => onColumnDrop(col.chave, e)"
        >
          <!-- Tira colapsada: continua alvo de drop dos cards -->
          <div
            v-if="isCollapsed(col)"
            class="kanban-column-header flex-1 rounded-t-md flex flex-col items-center gap-2.5 py-2 select-none"
            :style="headerStyle(col)"
          >
            <button
              type="button"
              class="p-1 rounded-md hover:bg-surface/40 transition-colors"
              :aria-label="`Abrir coluna ${col.label}`" :title="`Abrir coluna ${col.label}`"
              @click="toggleCollapse(col.chave)"
            >
              <ChevronLast class="w-4 h-4" stroke-width="2" />
            </button>
            <span class="text-[10px] font-extrabold tabular-nums leading-none">
              {{ pedidosByStatus(col.chave).length }}
            </span>
            <span class="text-xs font-bold uppercase tracking-wider whitespace-nowrap [writing-mode:vertical-rl]">
              {{ col.label }}
            </span>
          </div>

          <!-- Cabeçalho monocromático: cor da coluna no fundo, detalhes na mesma
               cor puxada para o text-primary do tema (mais escura no claro) -->
          <div
            v-else
            class="kanban-column-header rounded-t-md border-b shrink-0 pl-3 pr-1.5 py-2.5 flex items-center gap-2 transition-colors select-none"
            :style="headerStyle(col)"
          >
            <button
              type="button"
              class="p-1 rounded-md hover:bg-surface/40 transition-colors shrink-0"
              :aria-label="`Recolher coluna ${col.label}`" :title="`Recolher coluna ${col.label}`"
              @click="toggleCollapse(col.chave)"
            >
              <ChevronFirst class="w-3.5 h-3.5" stroke-width="2" />
            </button>
            <span class="flex-1 text-xs font-bold uppercase tracking-wider truncate flex items-center gap-1.5">
              <span>{{ col.label }}</span>
              <span class="text-[10px] font-extrabold tabular-nums leading-none opacity-80">
                {{ pedidosByStatus(col.chave).length }}
              </span>
            </span>

            <template v-if="kanbanEditavel && !col.is_sistema">
              <button
                type="button"
                class="p-1 rounded-md hover:bg-surface/40 transition-colors"
                aria-label="Editar nome e cor" title="Editar nome e cor"
                @click="openEditColuna(col)"
              >
                <Pencil class="w-3.5 h-3.5" stroke-width="2" />
              </button>
              <button
                type="button"
                draggable="true"
                class="p-1 rounded-md hover:bg-surface/40 transition-colors cursor-grab active:cursor-grabbing"
                title="Mover coluna (arraste)"
                @dragstart="(e) => onColDragStart(col.chave, e)"
                @dragend="onColDragEnd"
              >
                <Move class="w-3.5 h-3.5" stroke-width="2" />
              </button>
              <button
                type="button"
                class="p-1 rounded-md hover:text-danger-600 hover:bg-surface/40 transition-colors"
                aria-label="Excluir coluna" title="Excluir coluna"
                @click="deleteColuna(col)"
              >
                <Trash2 class="w-3.5 h-3.5" stroke-width="2" />
              </button>
            </template>
          </div>

          <!-- `scrollbar-gutter: stable` reserva o espaço da barra de rolagem
               sempre, então a coluna não estreita ao passar de ~4 cards (quando
               o overflow vertical faria a barra surgir e comer a largura). -->
          <div v-if="!isCollapsed(col)" class="flex-1 p-2 flex flex-col gap-3 overflow-y-auto min-h-0 [scrollbar-gutter:stable]">
            <div
              v-for="pedido in pedidosByStatus(col.chave)"
              :key="pedido.id"
              draggable="true"
              class="kanban-card bg-surface rounded-lg p-3 flex flex-col gap-2.5 cursor-move shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 select-none border"
              :class="pedido.tipo_entrega === 'entrega' ? 'border-order-entrega' : 'border-order-retirada'"
              @dragstart="(e) => onDragStart(e, pedido.id)"
              @dragend="onDragEnd"
            >
              <div class="flex justify-between items-start">
                <div class="flex gap-2">
                  <div class="p-1.5 bg-surface-raised rounded text-text-primary self-start">
                    <Truck v-if="pedido.tipo_entrega === 'entrega'" class="w-4 h-4" />
                    <Store v-else class="w-4 h-4" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[11px] text-text-muted font-medium uppercase tracking-wider">
                      {{ pedido.tipo_entrega }}
                    </span>
                    <span class="font-bold text-sm text-text-primary">
                      {{ formatCurrency(pedido.valor_total) }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <div class="flex items-center gap-1">
                    <!-- Seletor de status mobile (para mudar status com 1 toque sem drag-and-drop) -->
                    <div class="md:hidden relative shrink-0">
                      <select
                        :value="pedido.status"
                        aria-label="Mover status do pedido"
                        class="text-[10px] font-bold uppercase tracking-wider bg-surface-raised text-text-primary border border-border rounded px-1.5 py-1 appearance-none pr-5 cursor-pointer focus:outline-none focus:border-brand-green"
                        @change="(e) => updateStatus(pedido.id, (e.target as HTMLSelectElement).value as OrderStatus)"
                      >
                        <option
                          v-for="c in colunasVisiveis"
                          :key="c.chave"
                          :value="c.chave"
                        >
                          {{ c.label }}
                        </option>
                      </select>
                      <ChevronDown class="w-3 h-3 text-text-muted absolute right-1 top-1.5 pointer-events-none" />
                    </div>

                    <button
                      type="button"
                      draggable="false"
                      class="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors focus:outline-none disabled:opacity-40 cursor-pointer"
                      aria-label="Arquivar pedido" title="Arquivar pedido"
                      :disabled="archivingOrderId === pedido.id"
                      @mousedown.stop.prevent="archiveOrder(pedido.id)"
                    >
                      <Archive class="w-3.5 h-3.5" stroke-width="1.75" />
                    </button>
                  </div>

                  <button
                    type="button"
                    draggable="false"
                    class="relative p-1 rounded transition-colors focus:outline-none cursor-pointer"
                    :class="pedido.nota_atendimento
                      ? 'text-brand-green bg-brand-green/10 hover:bg-brand-green/20'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-raised'"
                    :title="pedido.nota_atendimento ? 'Editar nota do atendente' : 'Adicionar nota do atendente (pós-venda)'"
                    @mousedown.stop.prevent="openNoteModal(pedido)"
                  >
                    <Headset class="w-3.5 h-3.5" stroke-width="1.75" />
                    <span
                      v-if="pedido.nota_atendimento"
                      class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-brand-green"
                    />
                  </button>
                </div>
              </div>

              <div class="flex items-center text-[11px] text-text-muted gap-1 font-medium flex-wrap">
                <Clock class="w-3 h-3" />
                <span>{{ formatTime(pedido.criado_em) }}</span>
                <span class="uppercase bg-surface-raised px-1 rounded text-[10px]">
                  {{ pedido.forma_pagamento }}
                </span>
                <NuxtLink
                  v-if="getPreorderDeliveryDate(pedido)"
                  :to="`/admin/preorders?date=${getPreorderDeliveryDate(pedido)}`"
                  class="uppercase bg-surface-raised px-1 rounded text-[10px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Ver encomenda na agenda"
                  @click.stop
                >
                  ENCOMENDA
                </NuxtLink>
              </div>

              <!-- Sinal de entrega aguardando entregador livre (6.3) -->
              <div
                v-if="dispatchChave && pedido.status === dispatchChave && pedido.tipo_entrega === 'entrega' && !pedido.entregador_id"
                class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-warning-700 dark:text-warning-400 bg-warning-100 dark:bg-warning-950/40 px-2 py-1 rounded"
              >
                <Clock class="w-3 h-3" />
                Aguardando entregador
              </div>

              <!-- Nota operacional: instrução p/ o staff (ex.: conferir endereço) -->
              <div
                v-if="pedido.nota_operacional"
                class="flex items-center gap-1.5 text-[10px] font-medium border px-2 py-1 rounded leading-snug bg-warning-50 text-warning-800 border-warning-200 dark:bg-warning-950/30 dark:text-warning-300 dark:border-warning-900"
              >
                <span>{{ formatNotaOperacional(pedido) }}</span>
              </div>

              <div class="flex gap-1 text-[10px] font-bold mt-1">
                <button
                  type="button"
                  draggable="false"
                  class="bg-warning-100 hover:bg-warning-200 dark:bg-warning-950/40 dark:hover:bg-warning-900/50 text-text-primary px-2 py-1 rounded border border-warning-500 dark:border-warning-700 cursor-pointer transition-colors focus:outline-none"
                  title="Ver Nota Térmica"
                  @mousedown.stop.prevent="selectedPedidoForReceipt = pedido"
                >
                  #{{ formatOrderNumber(pedido.id, pedido.short_id) }}
                </button>
                <button
                  v-if="pedido.clientes && pedido.cliente_id"
                  type="button"
                  draggable="false"
                  class="bg-surface-raised hover:bg-surface text-text-primary px-2 py-1 rounded flex-1 text-center truncate border border-border cursor-pointer transition-colors focus:outline-none"
                  :title="pedido.clientes.nome ?? 'Cliente'"
                  @mousedown.stop.prevent="openClienteModal(pedido.cliente_id)"
                >
                  {{ pedido.clientes.nome }}
                </button>
                <span
                  v-else
                  class="bg-surface-raised text-text-primary px-2 py-1 rounded flex-1 text-center truncate border border-border"
                >
                  Cliente Anônimo
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Adicionar coluna (após a última; requer edição habilitada) -->
        <button
          v-if="kanbanEditavel"
          type="button"
          class="flex flex-col items-center justify-center w-16 shrink-0 self-start mt-0 rounded-md border border-dashed border-border text-text-muted hover:text-text-primary hover:border-text-muted hover:bg-surface-raised transition-colors py-3"
          aria-label="Adicionar coluna" title="Adicionar coluna"
          @click="openAddColuna"
        >
          <CirclePlus class="w-6 h-6" stroke-width="1.75" />
        </button>
      </div>
    </div>



    <!-- Nota Térmica -->
    <UiOrderThermalReceiptModal
      :is-open="!!selectedPedidoForReceipt"
      :pedido="selectedPedidoForReceipt"
      @close="selectedPedidoForReceipt = null"
    />

    <!-- Modal cliente (substitui redirect) -->
    <AdminCustomerInfoModal
      :open="showClienteModal"
      :cliente-id="selectedClienteId"
      @close="closeClienteModal"
    />

    <!-- Nota do atendente (item 4b — pós-venda, migration 109) -->
    <AdminOrderNoteModal
      :open="!!selectedPedidoForNote"
      :pedido-id="selectedPedidoForNote?.id ?? null"
      :nota-atual="selectedPedidoForNote?.nota_atendimento ?? null"
      @close="closeNoteModal"
      @saved="onNoteSaved"
    />

    <!-- Criar/editar coluna do kanban -->
    <KanbanColumnFormModal
      :open="showColForm"
      :mode="colFormMode"
      :label="colFormInitial.label"
      :cor="colFormInitial.cor"
      @save="handleColFormSave"
      @close="showColForm = false"
    />
  </div>
</template>

<style>
/* Corrige o layout de viewport do Kanban impedindo a rolagem vertical global do admin */
.admin-layout:has(#kanban-page) main {
  overflow: hidden !important;
  height: 100vh !important;
}

.admin-layout:has(#kanban-page) main > .flex-1 {
  height: 100% !important;
  max-height: 100vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

/* Oculta o rodapé institucional do layout global no Kanban de vendas */
.admin-layout:has(#kanban-page) footer {
  display: none !important;
}
</style>
