<!--
  @descricao: Card "Informações Básicas" do formulário de produto.
  @objetivo: Nome, categoria, unidade, tipo de venda e descrição — extraído
    de `[id].vue` (Card 1) para isolar esta seção do restante do formulário (SoC).
-->

<script setup lang="ts">
import { Layout } from '@lucide/vue'
import type { ProductType } from '~~/shared/types/preorder'

defineProps<{
  categoriaOptions: { value: string; label: string }[]
}>()

const nome = defineModel<string>('nome', { required: true })
const categoriaId = defineModel<string>('categoriaId', { required: true })
const unidadeMedida = defineModel<'unidade' | 'kg' | 'litro' | 'metro' | 'caixa'>('unidadeMedida', { required: true })
const numero = defineModel<number | null>('numero', { required: true })
const productType = defineModel<ProductType>('productType', { required: true })
const descricao = defineModel<string>('descricao', { required: true })

/**
 * input trabalha com string; numero é number|null — conversão nos dois sentidos.
 * `String(v ?? '')` blinda contra o setter receber algo que não é string (o
 * bug real: `v.trim()` direto quebrava com "e.trim is not a function" quando
 * o handler `input` do Vue repassava um valor não-string em produção).
 */
const numeroInput = computed<string>({
  get: () => numero.value === null ? '' : String(numero.value),
  set: (v) => {
    const trimmed = String(v ?? '').trim()
    if (trimmed === '') { numero.value = null; return }
    const n = Number(trimmed)
    numero.value = Number.isFinite(n) ? n : null
  },
})

const unidadeOptions = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'litro', label: 'Litro' },
  { value: 'metro', label: 'Metro' },
  { value: 'caixa', label: 'Caixa' },
]

const PRODUCT_TYPE_OPTIONS = [
  { value: 'stock', label: 'Venda imediata' },
  { value: 'preorder', label: 'Encomenda' },
]
</script>

<template>
  <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
    <div class="flex items-center gap-2 border-b border-border pb-3">
      <Layout class="w-4.5 h-4.5 text-brand-green" />
      <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Informações Básicas</h3>
    </div>

    <div class="space-y-4">
      <div>
        <label for="prod-nome" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Nome *</label>
        <input
          id="prod-nome"
          v-model="nome"
          type="text"
          class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
          placeholder="Ex: Pizza Calabresa"
        >
      </div>

      <div class="flex gap-4">
        <div class="flex-1">
          <p class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Categoria *</p>
          <UiSelect
            :model-value="categoriaId"
            :options="categoriaOptions"
            placeholder="Selecione uma categoria…"
            aria-label="Categoria do produto"
            @update:model-value="(v) => (categoriaId = String(v ?? ''))"
          />
        </div>
        <div class="w-32">
          <p class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Unidade</p>
          <UiSelect
            :model-value="unidadeMedida"
            :options="unidadeOptions"
            aria-label="Unidade de medida"
            @update:model-value="(v) => (unidadeMedida = v as typeof unidadeMedida)"
          />
        </div>
        <div class="w-24">
          <label for="prod-numero" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Número</label>
          <input
            id="prod-numero"
            v-model="numeroInput"
            type="number"
            min="1"
            max="999999"
            step="1"
            class="w-full h-9 px-3 py-0 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors text-center"
            placeholder="—"
            title="Número de exibição no catálogo (opcional, único por categoria)"
          >
        </div>
      </div>

      <div>
        <p class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Tipo de venda</p>
        <UiSelect
          :model-value="productType"
          :options="PRODUCT_TYPE_OPTIONS"
          aria-label="Tipo de venda"
          @update:model-value="(v) => (productType = v as ProductType)"
        />
        <p class="mt-1 text-[10px] text-text-muted leading-tight">
          Encomenda: o cliente escolhe a data de entrega e a capacidade diária é controlada automaticamente.
        </p>
      </div>

      <div>
        <label for="prod-descricao" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Descrição</label>
        <textarea
          id="prod-descricao"
          v-model="descricao"
          rows="3.5"
          class="w-full px-3 py-2.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
          placeholder="Descreva os ingredientes, tamanho ou detalhes adicionais..."
        />
      </div>
    </div>
  </div>
</template>
