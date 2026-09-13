<script setup lang="ts">
/**
 * @descricao: Seção de produtos recomendados / Produtos Relacionados.
 * @objetivo: Reutiliza `CatalogProductCard` para máxima consistência (DRY).
 *   O título adapta-se à origem: relacionados cadastrados explicitamente ou
 *   fallback automático por categoria.
 */
import { ArrowRight } from '@lucide/vue'
import type { CatalogProductItem } from '~~/shared/types/product'

defineProps<{
  produtos: CatalogProductItem[]
  /** 'explicit': relacionados cadastrados manualmente; 'category': fallback por categoria */
  relatedOrigin?: 'explicit' | 'category'
}>()

const emit = defineEmits<{
  (e: 'openDetails', produto: CatalogProductItem, mode: 'info' | 'pdv'): void
}>()
</script>

<template>
  <div v-if="produtos.length > 0" class="w-full border-t border-border mt-12 pt-8">
    <div class="flex items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-lg sm:text-xl font-extrabold text-text-primary uppercase tracking-tight">
          {{ relatedOrigin === 'explicit' ? 'Produtos Relacionados' : 'Você Também Pode Gostar' }}
        </h2>
        <p class="text-xs text-text-muted mt-0.5">
          {{ relatedOrigin === 'explicit'
            ? 'Produtos selecionados pelo lojista para complementar sua compra.'
            : 'Produtos da mesma categoria que podem te interessar.' }}
        </p>
      </div>

      <NuxtLink
        to="/catalog"
        class="hidden sm:flex items-center gap-1.5 text-xs font-bold text-brand hover:underline transition-all"
      >
        <span>Ver Catálogo Completo</span>
        <ArrowRight class="w-4 h-4" />
      </NuxtLink>
    </div>

    <!-- Grid de Produtos Relacionados -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
      <CatalogProductCard
        v-for="prod in produtos"
        :key="prod.id"
        :produto="prod"
        :priority="false"
        @open-details="(p, m) => emit('openDetails', p, m)"
      />
    </div>
  </div>
</template>
