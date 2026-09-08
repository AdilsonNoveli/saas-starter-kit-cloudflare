<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { navigateTo, useState } from 'nuxt/app'
import { Eye, Trash2, Plus, Search, X } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'

export interface ClienteRow {
  id: string
  nome: string
  telefone_whatsapp: string | null
  frequencia_compra: string | null
  status: string | null
  is_visitante: boolean
  total_pedidos: number
  valor_gasto_acumulado: number
  cliente_desde: string | null
  ultimo_pedido_em: string | null
  possui_pendencias: boolean
}

definePageMeta({
  layout: 'admin',
})

const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')
const showMobileSearch = ref(false)
const mobileSearchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')

watch(showMobileSearch, async (val) => {
  if (val) {
    await nextTick()
    mobileSearchInput.value?.focus()
  } else {
    searchQuery.value = ''
  }
})

const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()

const { data: clientes, pending } = await useAsyncData<ClienteRow[]>('clientes', async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, telefone_whatsapp, frequencia_compra, status, is_visitante, total_pedidos, valor_gasto_acumulado, cliente_desde, ultimo_pedido_em, possui_pendencias')
    .order('ultimo_pedido_em', { ascending: false, nullsFirst: false })
    .limit(500)

  if (error) {
    console.error('Erro ao buscar clientes:', error)
    return []
  }
  return data as ClienteRow[]
})

const deleteCliente = async (cliente: ClienteRow): Promise<void> => {
  const ok = await confirm({
    title: 'Excluir Cliente',
    message: `Tem certeza que deseja excluir o cliente "${cliente.nome || 'Anônimo'}" e todos os seus vínculos (Pedidos, Sessões, Rastreamentos)?`,
    variant: 'error',
    confirmText: 'Excluir em Cascata',
  })
  if (!ok) return

  try {
    await $fetch(`/api/admin/customers/${cliente.id}`, { method: 'DELETE' })
    notify.success('Cliente excluído em cascata com sucesso')
    if (clientes.value) {
      clientes.value = clientes.value.filter((c: ClienteRow) => c.id !== cliente.id)
    }
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    notify.error('Erro ao excluir', e.data?.statusMessage ?? e.message ?? 'Erro desconhecido')
  }
}

const filteredClientes = computed(() => {
  if (!clientes.value) return []
  if (!searchQuery.value) return clientes.value

  const query = searchQuery.value.toLowerCase()
  return clientes.value.filter(c =>
    c.nome.toLowerCase().includes(query) ||
    (c.telefone_whatsapp ?? '').includes(query),
  )
})

const { formatCurrency } = useFormatters()

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dateStr))
}

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return 'CL'
  if (parts.length === 1) return (parts[0]?.substring(0, 2) ?? 'CL').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface text-text-primary font-sans relative">

    <header class="flex flex-col border-b border-border bg-surface shrink-0 sticky top-0 z-20 select-none">
      <div class="h-16 flex items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <!-- Botão Novo Cliente -->
          <NuxtLink
            to="/admin/customers/new"
            class="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-all shadow-xs shrink-0 active:scale-95"
            :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
            title="Adicionar Cliente"
            aria-label="Adicionar Cliente"
          >
            <Plus class="w-4.5 h-4.5" stroke-width="2.5" />
          </NuxtLink>

          <!-- Busca (Desktop) -->
          <div class="hidden md:block relative w-full max-w-md h-9 shrink-0">
            <label for="clientes-search" class="sr-only">Pesquisar por nome ou telefone</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="clientes-search"
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-3 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar por nome ou telefone..."
            >
          </div>

          <!-- Busca Mobile Toggle Button -->
          <button
            type="button"
            class="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-text-muted hover:text-text-primary transition-colors active:scale-95 md:hidden shrink-0 cursor-pointer"
            :class="showMobileSearch ? 'bg-brand-light dark:bg-brand-green/25 text-text-primary shadow-sm' : 'bg-surface'"
            aria-label="Pesquisar" title="Pesquisar"
            @click="showMobileSearch = !showMobileSearch"
          >
            <Search class="w-4 h-4" />
          </button>
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
          class="px-4 pb-3 border-t border-border/40 md:hidden bg-surface overflow-hidden flex items-center gap-2"
        >
          <div class="relative flex-1 h-9">
            <label for="clientes-search-mobile" class="sr-only">Pesquisar</label>
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-text-muted" />
            </div>
            <input
              id="clientes-search-mobile"
              ref="mobileSearchInput"
              v-model="searchQuery"
              type="text"
              class="block w-full h-full pl-9 pr-8 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Pesquisar cliente..."
            >
            <button
              v-if="searchQuery"
              type="button"
              class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary"
              @click="searchQuery = ''"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </transition>
    </header>

    <div class="flex-1 bg-surface max-md:p-4">

      <div v-if="pending" class="flex items-center justify-center h-64">
        <svg class="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>

      <div v-else-if="filteredClientes.length === 0" class="flex flex-col items-center justify-center h-64 gap-3 text-text-muted">
        <svg class="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-sm">Nenhum cliente encontrado</span>
      </div>

      <template v-else>
        <!-- Visão Mobile: Lista em Cards -->
        <div class="md:hidden flex flex-col gap-3">
          <div
            v-for="cliente in filteredClientes"
            :key="cliente.id"
            class="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
            @click="navigateTo('/admin/customers/view/' + cliente.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0 dark:bg-primary-900/30 dark:text-primary-400">
                  {{ getInitials(cliente.nome) }}
                </div>
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-text-primary truncate">{{ cliente.nome || 'Cliente Anônimo' }}</span>
                    <span v-if="cliente.is_visitante" class="bg-warning-100 text-warning-800 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Lead</span>
                  </div>
                  <span class="text-xs text-text-muted truncate">{{ cliente.telefone_whatsapp || 'Sem WhatsApp' }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0" @click.stop>
                <button
                  type="button"
                  class="p-2 rounded-lg text-text-muted hover:text-primary-600 hover:bg-surface-raised transition-colors active:scale-95"
                  title="Ver Perfil"
                  @click="navigateTo('/admin/customers/view/' + cliente.id)"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="p-2 rounded-lg text-text-muted hover:text-danger-600 hover:bg-danger-50 transition-colors active:scale-95"
                  title="Excluir"
                  @click="deleteCliente(cliente)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
              <div class="flex flex-col">
                <span class="text-[10px] text-text-muted uppercase font-semibold">Pedidos</span>
                <span class="font-bold text-text-primary">{{ cliente.total_pedidos }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] text-text-muted uppercase font-semibold">Total Gasto</span>
                <span class="font-bold text-text-primary tabular-nums">{{ formatCurrency(cliente.valor_gasto_acumulado) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Visão Desktop: Tabela Tradicional com Cabeçalho Fixo (Sticky) -->
        <div class="hidden md:block">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-raised">
                <th class="sticky top-16 z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Cliente</th>
                <th class="sticky top-16 z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Status</th>
                <th class="sticky top-16 z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Pedidos</th>
                <th class="sticky top-16 z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Valor Gasto</th>
                <th class="sticky top-16 z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Cliente Desde</th>
                <th class="sticky top-16 z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Último Pedido</th>
                <th class="sticky top-16 z-10 bg-surface-raised border-b border-border px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Pendências</th>
                <th class="sticky top-16 z-10 bg-surface-raised border-b border-border px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider shadow-xs">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="cliente in filteredClientes"
                :key="cliente.id"
                class="hover:bg-surface-raised/50 transition-colors cursor-pointer"
                @click="navigateTo('/admin/customers/view/' + cliente.id)"
              >
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0 dark:bg-primary-900/30 dark:text-primary-400">
                      {{ getInitials(cliente.nome) }}
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-text-primary">{{ cliente.nome || 'Cliente Anônimo' }}</span>
                        <span v-if="cliente.is_visitante" class="bg-warning-100 text-warning-800 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Lead</span>
                      </div>
                      <span class="text-xs text-text-muted">{{ cliente.telefone_whatsapp }}</span>
                    </div>
                  </div>
                </td>

                <td class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                  <div class="flex items-center gap-2">
                    <span
                      class="w-2 h-2 rounded-full shrink-0"
                      :class="{
                        'bg-secondary-500': cliente.frequencia_compra === 'Semanal' || cliente.frequencia_compra === 'Quinzenal',
                        'bg-blue-500': cliente.frequencia_compra === 'Mensal',
                        'bg-purple-500': cliente.status === 'VIP',
                        'bg-warning-500': cliente.frequencia_compra === 'Esporádico' || (!cliente.frequencia_compra && !cliente.is_visitante),
                        'bg-text-muted': cliente.is_visitante,
                      }"
                    />
                    <span class="font-medium">{{ cliente.is_visitante ? 'Visitante' : (cliente.frequencia_compra || cliente.status) }}</span>
                  </div>
                </td>

                <td class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                  <span class="font-medium">{{ cliente.total_pedidos }}</span>
                </td>

                <td class="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {{ formatCurrency(cliente.valor_gasto_acumulado) }}
                </td>

                <td class="px-4 py-4 whitespace-nowrap text-sm text-text-muted">
                  {{ formatDate(cliente.cliente_desde) }}
                </td>

                <td class="px-4 py-4 whitespace-nowrap text-sm text-text-muted">
                  {{ formatDate(cliente.ultimo_pedido_em) }}
                </td>

                <td class="px-4 py-4 whitespace-nowrap text-sm">
                  <span v-if="cliente.possui_pendencias" class="text-danger-600 font-medium flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Sim
                  </span>
                  <span v-else class="text-text-muted">Não</span>
                </td>

                <td class="px-4 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="p-1.5 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      title="Ver Perfil"
                      @click.stop="navigateTo('/admin/customers/view/' + cliente.id)"
                    >
                      <Eye class="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      class="p-1.5 rounded-lg text-text-muted hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                      title="Excluir"
                      @click.stop="deleteCliente(cliente)"
                    >
                      <Trash2 class="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

  </div>
</template>
