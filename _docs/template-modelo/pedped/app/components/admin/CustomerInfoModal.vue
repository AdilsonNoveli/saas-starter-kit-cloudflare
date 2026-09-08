<!--
  @descricao: Modal de visualização de dados do cliente (Fase 5.2).
  @objetivo: Substituir o redirecionamento `router.push('/admin/customers/view/[id]')`
    no kanban de pedidos por uma exibição rápida sem perder contexto. Reusa o
    componente `UiModal` (`app/components/ui/Modal.vue`) — segue tokens
    semânticos e dark mode automaticamente.
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { navigateTo } from 'nuxt/app'
import { 
  Phone, 
  ShoppingBag, 
  MapPin, 
  FileText, 
  ExternalLink
} from '@lucide/vue'

interface ClienteFull {
  readonly id: string
  readonly nome: string | null
  readonly telefone_whatsapp: string | null
  readonly observacoes_internas: string | null
  readonly cliente_desde: string | null
  readonly is_visitante: boolean | null
  readonly total_pedidos: number | null
  readonly valor_gasto_acumulado: number | null
}

interface EnderecoRow {
  readonly id: string
  readonly rua: string | null
  readonly numero: string | null
  readonly complemento: string | null
  readonly bairro: string | null
  readonly cidade: string | null
  readonly estado: string | null
  readonly cep: string | null
  readonly padrao: boolean | null
}

const props = defineProps<{
  /** Quando `null`, o modal é fechado. */
  readonly clienteId: string | null
  readonly open: boolean
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const supabase = useSupabaseClient()
const loading = ref<boolean>(false)
const cliente = ref<ClienteFull | null>(null)
const enderecos = ref<readonly EnderecoRow[]>([])
const errorMessage = ref<string | null>(null)

async function load(id: string): Promise<void> {
  loading.value = true
  errorMessage.value = null
  cliente.value = null
  enderecos.value = []

  // Duas queries em paralelo: cliente + endereços.
  const [{ data: c, error: errC }, { data: e, error: errE }] = await Promise.all([
    supabase
      .from('clientes')
      .select(
        'id, nome, telefone_whatsapp, observacoes_internas, cliente_desde, is_visitante, total_pedidos, valor_gasto_acumulado',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('enderecos_cliente')
      .select('id, rua, numero, complemento, bairro, cidade, estado, cep, padrao')
      .eq('cliente_id', id)
      .order('padrao', { ascending: false })
      .order('id', { ascending: true }),
  ])

  if (errC) {
    errorMessage.value = errC.message
  } else {
    cliente.value = (c as ClienteFull | null) ?? null
  }
  if (errE) {
    errorMessage.value = errE.message
  } else {
    enderecos.value = (e ?? []) as readonly EnderecoRow[]
  }
  loading.value = false
}

watch(
  () => [props.clienteId, props.open] as const,
  ([id, isOpen]) => {
    if (isOpen && id) void load(id)
  },
  { immediate: true },
)

const formatCurrency = (val: number | null): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0)

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(iso))
}

const handleOpenProfile = (): void => {
  if (!cliente.value) return
  emit('close')
  void navigateTo(`/admin/customers/view/${cliente.value.id}`)
}

const handleClose = (): void => emit('close')
</script>

<template>
  <UiModal
    :open="open"
    :title="cliente?.nome ?? 'Cliente'"
    size="lg"
    @update:open="(v) => !v && handleClose()"
  >
    <div v-if="loading" class="py-12 flex flex-col items-center justify-center gap-3 text-text-muted">
      <svg class="animate-spin h-7 w-7 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span class="text-xs">Carregando dados do cliente…</span>
    </div>
    
    <div v-else-if="errorMessage" class="py-6 text-center text-sm text-danger-600 bg-danger-50 dark:bg-danger-950/15 border border-danger-200/50 rounded-lg">
      Erro: {{ errorMessage }}
    </div>
    
    <div v-else-if="!cliente" class="py-12 text-center text-sm text-text-muted italic">
      Cliente não encontrado.
    </div>
    
    <div v-else class="space-y-4 text-sm select-none">
      <!-- Badge de visitante (cadastro sem conversão) -->
      <div v-if="cliente.is_visitante" class="flex">
        <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-warning-700 dark:text-warning-400 bg-warning-100 dark:bg-warning-950/40 border border-warning-200 dark:border-warning-900 px-2 py-1 rounded-full">
          Visitante — cadastro incompleto
        </span>
      </div>

      <!-- Grid de 2 Colunas: Contato e Histórico -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Card: Contato -->
        <section class="border border-border bg-surface p-4 rounded-lg">
          <div class="flex items-center gap-2 border-b border-border pb-2 mb-3">
            <Phone class="w-4 h-4 text-brand-green shrink-0" />
            <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider">
              Contato
            </h3>
          </div>
          <dl class="space-y-2.5">
            <div class="flex justify-between items-center gap-3 text-xs">
              <dt class="text-text-muted shrink-0">WhatsApp</dt>
              <dd class="text-text-primary font-semibold tabular-nums truncate">{{ cliente.telefone_whatsapp ?? '—' }}</dd>
            </div>
            <div class="flex justify-between items-center gap-3 text-xs">
              <dt class="text-text-muted shrink-0">Cliente desde</dt>
              <dd class="text-text-primary font-semibold tabular-nums">{{ formatDate(cliente.cliente_desde) }}</dd>
            </div>
          </dl>
        </section>

        <!-- Card: Histórico -->
        <section class="border border-border bg-surface p-4 rounded-lg">
          <div class="flex items-center gap-2 border-b border-border pb-2 mb-3">
            <ShoppingBag class="w-4 h-4 text-brand-green shrink-0" />
            <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider">
              Histórico
            </h3>
          </div>
          <dl class="space-y-2.5">
            <div class="flex justify-between items-center gap-3 text-xs">
              <dt class="text-text-muted shrink-0">Pedidos</dt>
              <dd class="text-text-primary font-semibold tabular-nums">{{ cliente.total_pedidos ?? 0 }}</dd>
            </div>
            <div class="flex justify-between items-center gap-3 text-xs">
              <dt class="text-text-muted shrink-0">Total gasto</dt>
              <dd class="text-brand-green font-bold tabular-nums">{{ formatCurrency(cliente.valor_gasto_acumulado) }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <!-- Card: Endereços -->
      <section v-if="enderecos.length > 0" class="border border-border bg-surface p-4 rounded-lg">
        <div class="flex items-center gap-2 border-b border-border pb-2 mb-3">
          <MapPin class="w-4 h-4 text-brand-green shrink-0" />
          <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider">
            Endereços
          </h3>
        </div>
        <ul class="space-y-2 max-h-44 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
          <li
            v-for="end in enderecos"
            :key="end.id"
            class="rounded-lg border bg-surface-raised px-3 py-2 flex items-start gap-2.5 transition-colors"
            :class="end.padrao ? 'border-brand-green/30' : 'border-border hover:border-text-muted/50'"
          >
            <MapPin
              class="w-4 h-4 shrink-0 mt-0.5"
              :class="end.padrao ? 'text-brand-green' : 'text-text-muted'"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-text-primary font-semibold text-xs">
                  {{ end.rua ?? '—' }}<span v-if="end.numero">, {{ end.numero }}</span>
                </span>
                <span
                  v-if="end.padrao"
                  class="text-[9px] font-bold uppercase tracking-wider text-brand-green bg-brand-green/10 border border-brand-green/20 px-1.5 py-0.5 rounded-full"
                >
                  Principal
                </span>
              </div>
              <div class="text-text-muted text-[11px] font-normal mt-0.5 leading-snug">
                <span v-if="end.complemento">{{ end.complemento }} · </span>
                {{ end.bairro }}{{ end.cidade ? ` · ${end.cidade}/${end.estado}` : '' }}
                <span v-if="end.cep"> · CEP {{ end.cep }}</span>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <!-- Card: Observações -->
      <section v-if="cliente.observacoes_internas" class="border border-border bg-surface p-4 rounded-lg">
        <div class="flex items-center gap-2 border-b border-border pb-2 mb-3">
          <FileText class="w-4 h-4 text-brand-green shrink-0" />
          <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider">
            Observações
          </h3>
        </div>
        <p class="text-text-primary font-normal text-xs whitespace-pre-line leading-relaxed bg-surface-raised p-3 rounded-lg border border-border">
          {{ cliente.observacoes_internas }}
        </p>
      </section>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          @click="handleClose"
        >
          Fechar
        </button>
        <button
          v-if="cliente"
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 flex items-center gap-2 shadow-xs cursor-pointer"
          @click="handleOpenProfile"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          Abrir perfil completo
        </button>
      </div>
    </template>
  </UiModal>
</template>
