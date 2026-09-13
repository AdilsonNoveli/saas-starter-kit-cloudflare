<script setup lang="ts">
/**
 * @descricao: Tabela colapsável de desconto progressivo por quantidade.
 * @objetivo: Isolada de `ProductPagePromotions.vue` (SoC — uma responsabilidade:
 *   renderizar as faixas de UMA promoção `progressivo` como seletor de
 *   quantidade). Fechada por padrão; expande via clique no cabeçalho. Cada
 *   linha é selecionável e emite a quantidade escolhida para o pai atualizar
 *   o estepper/CTA de compra — a tabela nunca adiciona ao carrinho sozinha.
 *
 *   Cada linha usa `calcularMelhorDesconto` — a MESMA função que decide o
 *   preço do botão "Adicionar ao Pedido" em `[id].vue` — considerando TODAS
 *   as promoções elegíveis, não só o progressivo isolado. Sem isso, uma
 *   quantidade que se encaixa melhor em outra promoção (ex.: "Leve 3, Pague
 *   2" pode valer mais que 5% de desconto em 5 unidades) mostrava um "Valor
 *   Total" que nunca batia com o preço real cobrado no botão.
 */
import { computed, ref } from 'vue'
import { ChevronDown, TrendingDown } from '@lucide/vue'
import type { CatalogPromocao, ProgressivoConfig } from '~~/shared/types/promotion'
import { calcularMelhorDesconto, type ItemCalculo } from '~~/shared/utils/promotions'

const props = defineProps<{
  /** A promoção `progressivo` — fonte das faixas (quais quantidades viram linha) e do nome do cabeçalho. */
  promocao: CatalogPromocao
  /** TODAS as promoções elegíveis do produto — usadas pra achar o melhor preço por linha (DRY com o CTA). */
  promocoes: readonly CatalogPromocao[]
  produtoId: string
  effectivePrice: number
  /** Quantidade atualmente selecionada no restante da página — realça a linha correspondente. */
  quantidadeAtual: number
}>()

const emit = defineEmits<{
  'selecionar-quantidade': [quantidade: number]
}>()

const aberta = ref(false)

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface LinhaQuantidade {
  quantidade: number
  valorUnitario: number
  valorTotal: number
}

/** Melhor preço para `quantidade` unidades, entre TODAS as promoções elegíveis — nunca só o progressivo. */
function calcularLinha(quantidade: number): LinhaQuantidade {
  const subtotal = props.effectivePrice * quantidade
  const item: ItemCalculo = { produto_id: props.produtoId, preco: props.effectivePrice, quantidade }
  const desconto = calcularMelhorDesconto(props.promocoes, [item], subtotal).valor
  const valorTotal = subtotal - desconto
  return { quantidade, valorUnitario: valorTotal / quantidade, valorTotal }
}

/**
 * Linha base "1 unidade" + uma linha por faixa configurada — as QUANTIDADES
 * vêm de `promocao.configuracao.faixas` (nunca inventadas), mas o PREÇO de
 * cada uma é o melhor entre todas as promoções elegíveis (ver `calcularLinha`).
 */
const linhas = computed<LinhaQuantidade[]>(() => {
  const config = props.promocao.configuracao as ProgressivoConfig
  const quantidades = [1, ...config.faixas.map((f) => f.quantidade)].sort((a, b) => a - b)
  return quantidades.map(calcularLinha)
})
</script>

<template>
  <div class="rounded-md border border-border overflow-hidden">
    <!-- Cabeçalho — também é o gatilho de abrir/fechar -->
    <button
      type="button"
      class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-surface-raised hover:bg-surface-raised/70 transition-colors cursor-pointer"
      :aria-expanded="aberta"
      @click="aberta = !aberta"
    >
      <span class="flex items-center gap-2">
        <TrendingDown class="w-3.5 h-3.5 text-brand shrink-0" />
        <span class="text-[11px] font-bold text-text-muted uppercase tracking-widest">
          {{ promocao.nome }}
        </span>
      </span>
      <ChevronDown
        class="w-4 h-4 text-text-muted shrink-0 transition-transform duration-200"
        :class="{ 'rotate-180': aberta }"
      />
    </button>

    <!-- Conteúdo colapsável -->
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[480px] opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="max-h-[480px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="aberta" class="overflow-hidden border-t border-border">
        <p class="px-3.5 pt-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">
          Escolha a quantidade
        </p>

        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left px-3.5 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Quantidade
              </th>
              <th class="text-right px-3.5 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Valor por unidade
              </th>
              <th class="text-right px-3.5 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Valor Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="linha in linhas"
              :key="linha.quantidade"
              class="border-b border-border/50 last:border-0 transition-colors cursor-pointer hover:bg-surface-raised/50"
              :class="{ 'bg-brand/5': linha.quantidade === quantidadeAtual }"
              @click="emit('selecionar-quantidade', linha.quantidade)"
            >
              <td class="px-3.5 py-2.5">
                <label class="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="progressivo-quantidade"
                    class="w-4 h-4 accent-brand-green cursor-pointer"
                    :checked="linha.quantidade === quantidadeAtual"
                    @change="emit('selecionar-quantidade', linha.quantidade)"
                  >
                  <span class="font-semibold text-text-primary tabular-nums">
                    {{ linha.quantidade }} {{ linha.quantidade === 1 ? 'unidade' : 'unidades' }}
                  </span>
                </label>
              </td>
              <td class="px-3.5 py-2.5 text-right text-text-secondary tabular-nums">
                {{ formatCurrency(linha.valorUnitario) }}/un
              </td>
              <td class="px-3.5 py-2.5 text-right font-bold text-text-primary tabular-nums">
                {{ formatCurrency(linha.valorTotal) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </transition>
  </div>
</template>
