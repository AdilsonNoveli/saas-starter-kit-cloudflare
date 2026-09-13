<script setup lang="ts">
import { computed } from 'vue'
import { Tag, ShoppingBag, TrendingDown, Percent, ChevronRight } from '@lucide/vue'
import type { CatalogPromocao } from '#shared/types/promotion'

const props = defineProps<{
  promocao: CatalogPromocao
}>()

const emit = defineEmits<{
  (e: 'open-details', promocao: CatalogPromocao): void
}>()

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

/** Ícone visual por tipo de mecânica */
const tipoIcon = computed(() => {
  if (props.promocao.tipo === 'leve_pague') return ShoppingBag
  if (props.promocao.tipo === 'progressivo') return TrendingDown
  if (props.promocao.tipo === 'destaque') return Tag
  return Percent
})

/** Badge de mecânica legível */
const mecanicaBadge = computed<string>(() => {
  const cfg = props.promocao.configuracao
  const tipo = props.promocao.tipo
  if (tipo === 'leve_pague') {
    const c = cfg as { compre: number; leve: number }
    return `Leve ${c.leve} Pague ${c.compre}`
  }
  if (tipo === 'progressivo') {
    const c = cfg as { faixas: { quantidade: number; desconto_percentual: number }[] }
    const sorted = [...c.faixas].sort((a, b) => b.desconto_percentual - a.desconto_percentual)
    const best = sorted[0]
    return best ? `Até ${best.desconto_percentual}% OFF` : 'Desconto Progressivo'
  }
  if (tipo === 'desconto_carrinho') {
    const c = cfg as { valor_minimo: number; desconto_percentual: number }
    return `${c.desconto_percentual}% no Carrinho`
  }
  if (tipo === 'destaque') {
    return 'Oferta Especial'
  }
  return 'Promoção'
})

/** Subtítulo descritivo da regra */
const mecanicaDescricao = computed<string>(() => {
  const cfg = props.promocao.configuracao
  const tipo = props.promocao.tipo
  if (tipo === 'leve_pague') {
    const c = cfg as { compre: number; leve: number }
    return `A cada ${c.leve} unidades, ${c.leve - c.compre} sai grátis`
  }
  if (tipo === 'progressivo') {
    const c = cfg as { faixas: { quantidade: number; desconto_percentual: number }[] }
    const faixas = [...c.faixas].sort((a, b) => a.quantidade - b.quantidade)
    return faixas.map((f) => `${f.quantidade}+ und → ${f.desconto_percentual}%`).join(' · ')
  }
  if (tipo === 'desconto_carrinho') {
    const c = cfg as { valor_minimo: number; desconto_percentual: number }
    return `Compras acima de ${formatCurrency(c.valor_minimo)}`
  }
  if (tipo === 'destaque') {
    // Destaques usam apenas a descrição fornecida, sem mecânica
    return ''
  }
  return ''
})

const isDescontoGeral = computed(
  () => props.promocao.tipo === 'desconto_carrinho' && props.promocao.promocao_produtos.length === 0,
)

const numParticipantes = computed(() => props.promocao.promocao_produtos.length)
</script>

<template>
  <article
    class="flex flex-col bg-surface border border-border rounded-2xl overflow-hidden hover:border-brand/45 transition-all duration-200 relative w-full h-full cursor-pointer group shadow-none"
    role="button"
    :aria-label="`Ver detalhes da promoção: ${promocao.nome}`"
    @click="emit('open-details', promocao)"
  >
    <!-- Badge de tipo -->
    <div class="absolute top-2 left-2 z-10 bg-info-500 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow pointer-events-none">
      Promoção
    </div>

    <!-- Área de imagem -->
    <div class="relative w-full aspect-square bg-surface-raised flex items-center justify-center overflow-hidden rounded-t-2xl">
      <NuxtImg
        v-if="promocao.foto_url"
        :src="promocao.foto_url"
        :alt="promocao.nome"
        loading="lazy"
        sizes="50vw lg:25vw"
        class="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-300"
      />
      <div v-else class="flex flex-col items-center gap-2 text-text-muted opacity-60">
        <component :is="tipoIcon" class="w-12 h-12 stroke-1" />
      </div>

      <!-- Overlay de badge de mecânica na imagem -->
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <div class="flex items-center gap-1.5">
          <component :is="tipoIcon" class="w-3.5 h-3.5 text-white shrink-0" />
          <span class="text-white text-[10px] font-bold truncate">{{ mecanicaBadge }}</span>
        </div>
      </div>
    </div>

    <!-- Info do card -->
    <div class="flex-1 flex flex-col p-3.5 md:p-4">
      <h2 class="text-sm font-bold leading-tight text-text-primary uppercase line-clamp-1 mb-1" :title="promocao.nome">
        {{ promocao.nome }}
      </h2>

      <p class="text-[11px] text-info-600 dark:text-info-400 font-bold line-clamp-2 leading-snug min-h-[32px]">
        {{ mecanicaDescricao }}
      </p>

      <p v-if="promocao.descricao" class="text-[11px] text-text-muted mt-1.5 leading-snug line-clamp-1">
        {{ promocao.descricao }}
      </p>

      <!-- CTA -->
      <div class="mt-auto pt-3 border-t border-border flex items-center justify-between">
        <!-- Info de participantes ou desconto geral -->
        <span class="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
          <span v-if="isDescontoGeral">Desconto Automático</span>
          <span v-else-if="numParticipantes > 0">{{ numParticipantes }} produto{{ numParticipantes > 1 ? 's' : '' }}</span>
          <span v-else>Ver regras</span>
        </span>

        <span class="flex items-center gap-0.5 text-[10px] font-bold text-brand group-hover:text-brand-hover uppercase tracking-wider transition-all">
          {{ isDescontoGeral ? 'Saiba mais' : 'Ver produtos' }}
          <ChevronRight class="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  </article>
</template>
