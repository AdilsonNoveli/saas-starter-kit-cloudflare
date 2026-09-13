<script setup lang="ts">
/**
 * @descricao: Resumo semântico do produto (Breadcrumb, Categoria, Título e Descrição clamp).
 * @objetivo: Exibe dados de identificação com hierarquia tipográfica de alto nível,
 *   sem elementos fictícios ou hardcoded, com total suporte a Dark Mode.
 */
import { ref, computed } from 'vue'
import { ChevronRight } from '@lucide/vue'
import type { CatalogProductItem } from '~~/shared/types/product'

const props = defineProps<{
  product: CatalogProductItem
  category?: { id: string; nome: string } | null
  effectivePrice?: number
  isOnPromotion?: boolean
  discountPercent?: number | null
}>()

const emit = defineEmits<{
  (e: 'selectCategory', categoryId: string): void
}>()

const isExpanded = ref(false)
const MAX_WORDS = 4
const MAX_CHARS = 24

const isLongDesc = computed(() => {
  const desc = props.product.descricao?.trim() || ''
  const words = desc.split(/\s+/)
  return words.length > MAX_WORDS || desc.length > MAX_CHARS
})

const displayDesc = computed(() => {
  const desc = props.product.descricao?.trim()
  if (!desc) return ''
  if (!isLongDesc.value || isExpanded.value) return desc

  const words = desc.split(/\s+/)
  const shortText = words.slice(0, MAX_WORDS).join(' ')
  const clamped = shortText.length > MAX_CHARS ? shortText.slice(0, MAX_CHARS).trim() : shortText
  return `${clamped}…`
})
</script>

<template>
  <div class="flex flex-col gap-2.5 w-full">
    <!-- Breadcrumb Navegável -->
    <nav class="flex items-center gap-1.5 text-xs text-text-muted flex-wrap">
      <NuxtLink to="/catalog" class="hover:text-text-primary transition-colors font-medium">
        Início
      </NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border shrink-0" />
      <button
        v-if="category"
        type="button"
        class="font-medium text-text-secondary hover:text-text-primary cursor-pointer transition-colors focus:outline-none"
        @click="emit('selectCategory', category.id)"
      >
        {{ category.nome }}
      </button>
      <span v-else class="text-text-secondary font-medium">Catálogo</span>
      <ChevronRight class="w-3.5 h-3.5 text-border shrink-0" />
      <span class="text-text-primary font-semibold truncate max-w-[200px] sm:max-w-xs">
        {{ product.nome }}
      </span>
    </nav>

    <!-- Categoria como texto simples (sem card / sem badge) -->
    <div v-if="category" class="pt-0.5">
      <button
        type="button"
        class="text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
        @click="emit('selectCategory', category.id)"
      >
        {{ category.nome }}
      </button>
    </div>

    <!-- Título Principal do Produto -->
    <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-primary uppercase tracking-tight leading-tight">
      {{ product.nome }}
    </h1>

    <!-- Descrição Resumida com Ver mais / Ver menos -->
    <div v-if="product.descricao" class="text-sm text-text-muted leading-relaxed mt-0.5">
      <span class="whitespace-pre-line">{{ displayDesc }}</span>
      <button
        v-if="isLongDesc"
        type="button"
        class="inline-block text-xs font-bold text-brand hover:underline uppercase tracking-wider ml-1 cursor-pointer focus:outline-none"
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded ? 'Ver menos' : 'Ver mais' }}
      </button>
    </div>
  </div>
</template>
