<!--
  @descricao: Aba de perfil e dados cadastrais do cliente na 3ª coluna.
  @responsabilidade: Exibição de LTV, histórico de compras, endereços e anotações internas.
-->

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatCustomerContext } from '#shared/types/chat'
import {
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
  MapPin,
  FileText,
  Copy,
} from '@lucide/vue'
import { useFormatters } from '~/composables/useFormatters'
import { useNotification } from '~/composables/useNotification'

const props = defineProps<{
  readonly context: ChatCustomerContext
}>()

const { formatCurrency } = useFormatters()
const { notify } = useNotification()

const initials = computed<string>(() => {
  const parts = (props.context.nome || 'Cliente').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'CL'
  if (parts.length === 1) return (parts[0]?.substring(0, 2) ?? 'CL').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
})

const formattedDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    notify.success('Copiado!', `${label} copiado para a área de transferência.`)
  } catch {
    notify.error('Erro ao copiar', 'Não foi possível copiar o texto.')
  }
}
</script>

<template>
  <div class="p-4 space-y-4 text-sm select-text">
    <!-- Card Principal do Perfil -->
    <div class="flex flex-col items-center p-4 rounded-xl bg-surface-raised border border-border/80 text-center">
      <div class="w-16 h-16 rounded-full bg-brand/10 text-brand font-bold text-lg flex items-center justify-center border border-border mb-2.5">
        {{ initials }}
      </div>

      <h3 class="font-bold text-base text-text-primary">
        {{ context.nome || 'Cliente Anônimo' }}
      </h3>

      <div v-if="context.telefoneWhatsapp" class="flex items-center gap-1 text-xs text-text-muted mt-1">
        <Phone class="w-3.5 h-3.5" />
        <span>{{ context.telefoneWhatsapp }}</span>
        <button
          type="button"
          class="p-1 hover:text-text-primary transition-colors cursor-pointer"
          title="Copiar telefone"
          @click="copyToClipboard(context.telefoneWhatsapp!, 'Telefone')"
        >
          <Copy class="w-3 h-3" />
        </button>
      </div>

      <span
        v-if="context.isVisitante"
        class="mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
      >
        Visitante (Sem cadastro completo)
      </span>
    </div>

    <!-- Métricas Comerciais (LTV & Frequência) -->
    <div class="grid grid-cols-2 gap-2.5">
      <div class="p-3 rounded-xl bg-surface-raised border border-border/80">
        <div class="flex items-center gap-1.5 text-xs text-text-muted mb-1">
          <DollarSign class="w-3.5 h-3.5 text-emerald-500" />
          <span>Gasto Total (LTV)</span>
        </div>
        <p class="font-bold text-sm text-text-primary">
          {{ formatCurrency(context.valorGastoAcumulado || 0) }}
        </p>
      </div>

      <div class="p-3 rounded-xl bg-surface-raised border border-border/80">
        <div class="flex items-center gap-1.5 text-xs text-text-muted mb-1">
          <ShoppingBag class="w-3.5 h-3.5 text-blue-500" />
          <span>Total de Pedidos</span>
        </div>
        <p class="font-bold text-sm text-text-primary">
          {{ context.totalPedidos || 0 }} pedidos
        </p>
      </div>
    </div>

    <!-- Informações de Cadastro -->
    <div class="p-3.5 rounded-xl bg-surface-raised border border-border/80 space-y-2">
      <h4 class="text-xs font-semibold text-text-primary flex items-center gap-1.5">
        <Calendar class="w-3.5 h-3.5 text-text-muted" />
        <span>Histórico de Relacionamento</span>
      </h4>

      <div class="text-xs text-text-muted space-y-1">
        <div class="flex justify-between">
          <span>Cliente desde:</span>
          <span class="font-medium text-text-primary">{{ formattedDate(context.clienteDesde) }}</span>
        </div>
        <div class="flex justify-between">
          <span>Último pedido em:</span>
          <span class="font-medium text-text-primary">{{ formattedDate(context.ultimoPedidoEm) }}</span>
        </div>
        <div v-if="context.frequenciaCompra" class="flex justify-between">
          <span>Frequência estimada:</span>
          <span class="font-medium text-text-primary capitalize">{{ context.frequenciaCompra }}</span>
        </div>
      </div>
    </div>

    <!-- Endereços de Entrega -->
    <div class="p-3.5 rounded-xl bg-surface-raised border border-border/80 space-y-2">
      <h4 class="text-xs font-semibold text-text-primary flex items-center gap-1.5">
        <MapPin class="w-3.5 h-3.5 text-text-muted" />
        <span>Endereços Cadastrados ({{ context.enderecos.length }})</span>
      </h4>

      <div v-if="context.enderecos.length > 0" class="space-y-2">
        <div
          v-for="end in context.enderecos"
          :key="end.id"
          class="p-2.5 rounded-lg bg-surface border border-border text-xs relative"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium text-text-primary">
              {{ end.rua }}, {{ end.numero }}
              <span v-if="end.complemento">({{ end.complemento }})</span>
            </p>
            <span
              v-if="end.padrao"
              class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-brand/10 text-brand shrink-0"
            >
              Padrão
            </span>
          </div>
          <p class="text-text-muted mt-0.5">
            {{ end.bairro }} — {{ end.cidade }}/{{ end.estado }}
          </p>
          <p v-if="end.cep" class="text-text-muted text-[11px] mt-0.5">
            CEP: {{ end.cep }}
          </p>
        </div>
      </div>
      <p v-else class="text-xs text-text-muted">
        Nenhum endereço cadastrado para este cliente.
      </p>
    </div>

    <!-- Observações Internas -->
    <div
      v-if="context.observacoesInternas"
      class="p-3.5 rounded-xl bg-surface-raised border border-border/80 space-y-1.5"
    >
      <h4 class="text-xs font-semibold text-text-primary flex items-center gap-1.5">
        <FileText class="w-3.5 h-3.5 text-text-muted" />
        <span>Observações Internas</span>
      </h4>
      <p class="text-xs text-text-secondary leading-relaxed bg-surface p-2.5 rounded-lg border border-border">
        {{ context.observacoesInternas }}
      </p>
    </div>
  </div>
</template>
