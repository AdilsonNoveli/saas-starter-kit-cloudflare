<!--
  @descricao: Histórico de movimentações de estoque (produto ou insumo), Gestão de Estoque (migration 111).
  @objetivo: Painel expansível por linha em /admin/inventory — extraído para
    não duplicar a mesma tabela nas abas Produtos e Insumos.
-->

<script setup lang="ts">
import { History } from '@lucide/vue'

interface MovimentacaoRow {
  id: string
  tipo_movimento: string
  quantidade: number
  motivo: string | null
  criado_em: string
}

defineProps<{
  readonly loading: boolean
  readonly movimentacoes: readonly MovimentacaoRow[]
  readonly movimentoLabel: Record<string, string>
  readonly formatDataHora: (iso: string) => string
}>()
</script>

<template>
  <div class="text-xs">
    <div class="flex items-center gap-1.5 text-text-muted font-semibold uppercase tracking-wider mb-2">
      <History class="w-3.5 h-3.5" />
      Últimas movimentações
    </div>
    <div v-if="loading" class="text-text-muted py-2">Carregando…</div>
    <div v-else-if="movimentacoes.length === 0" class="text-text-muted py-2">Nenhuma movimentação registrada ainda.</div>
    <table v-else class="w-full text-left">
      <tbody class="divide-y divide-border/60">
        <tr v-for="m in movimentacoes" :key="m.id">
          <td class="py-1.5 pr-3 text-text-muted whitespace-nowrap">{{ formatDataHora(m.criado_em) }}</td>
          <td class="py-1.5 pr-3 text-text-secondary">{{ movimentoLabel[m.tipo_movimento] ?? m.tipo_movimento }}</td>
          <td class="py-1.5 pr-3 font-bold tabular-nums" :class="m.quantidade < 0 ? 'text-danger-600' : 'text-brand-green'">
            {{ m.quantidade > 0 ? '+' : '' }}{{ m.quantidade }}
          </td>
          <td class="py-1.5 text-text-muted truncate max-w-[240px]">{{ m.motivo ?? '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
