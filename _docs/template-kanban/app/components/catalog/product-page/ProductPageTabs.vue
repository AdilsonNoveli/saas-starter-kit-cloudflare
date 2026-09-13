<script setup lang="ts">
/**
 * @descricao: Seção de abas informativas da página de produto (Detalhes, Ficha Técnica, Envio e Atendimento).
 * @objetivo: Exibe dados reais de forma elegante, flat/zero shadow, com menu por alteração de cor.
 */
import { ref, computed } from 'vue'
import { Check, Truck, MessageCircle, Store } from '@lucide/vue'
import type { CatalogProductItem } from '~~/shared/types/product'

const props = defineProps<{
  product: CatalogProductItem
  category?: { id: string; nome: string; descricao?: string | null } | null
  storeName?: string
  whatsappNumber?: string | null
  allowsPickup?: boolean
  deliveryFee?: number
  featureImage?: string | null
}>()

type TabKey = 'details' | 'specs' | 'shipping' | 'support'

const activeTab = ref<TabKey>('details')

const tabs = [
  { key: 'details', label: 'Detalhes' },
  { key: 'specs', label: 'Especificações' },
  { key: 'shipping', label: 'Envio & Retirada' },
  { key: 'support', label: 'Atendimento' },
] as const

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const whatsappUrl = computed<string | null>(() => {
  if (!props.whatsappNumber) return null
  const cleaned = props.whatsappNumber.replace(/\D/g, '')
  if (!cleaned) return null
  const text = encodeURIComponent(`Olá! Gostaria de mais informações sobre o produto "${props.product.nome}".`)
  return `https://wa.me/55${cleaned.replace(/^55/, '')}?text=${text}`
})

const features = computed<string[]>(() => {
  const list: string[] = []
  if (props.category?.nome) {
    list.push(`Categoria: ${props.category.nome}`)
  }
  if (props.product.permite_fracionamento) {
    list.push(`Vendido de forma fracionada (${props.product.unidade_medida || 'kg'})`)
  }
  if (props.product.product_type === 'preorder') {
    list.push('Produção sob encomenda com entrega agendada')
  }
  if (props.product.tem_opcoes) {
    list.push('Opções e complementos personalizáveis')
  }
  if (props.product.sinonimos && props.product.sinonimos.length > 0) {
    list.push(`Identificadores: ${props.product.sinonimos.join(', ')}`)
  }
  return list
})
</script>

<template>
  <div class="w-full border-t border-border mt-10 pt-8">
    <div class="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
      <!-- Coluna Esquerda: Abas e Conteúdo -->
      <div class="flex-1 w-full flex flex-col gap-6">
        <!-- Navegação das Abas (Apenas Cor - Zero Linhas/Sombras) -->
        <div class="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar pb-1">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            class="text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer focus:outline-none"
            :class="activeTab === t.key
              ? 'text-text-primary'
              : 'text-text-muted hover:text-text-primary'"
            @click="activeTab = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- Conteúdo da Aba -->
        <div class="min-h-[180px]">
          <!-- 1. DETALHES -->
          <div v-if="activeTab === 'details'" class="flex flex-col gap-4 animate-fade-in">
            <p class="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {{ product.descricao || 'Informações completas do produto.' }}
            </p>

            <div v-if="features.length > 0" class="flex flex-col gap-2 pt-2">
              <div
                v-for="feat in features"
                :key="feat"
                class="flex items-center gap-2.5 text-xs text-text-primary"
              >
                <Check class="w-4 h-4 text-brand shrink-0" />
                <span>{{ feat }}</span>
              </div>
            </div>
          </div>

          <!-- 2. ESPECIFICAÇÕES -->
          <div v-else-if="activeTab === 'specs'" class="flex flex-col gap-3 animate-fade-in text-xs">
            <div class="border border-border rounded-md divide-y divide-border bg-surface overflow-hidden">
              <div class="grid grid-cols-3 p-3">
                <span class="font-bold text-text-muted uppercase">Unidade</span>
                <span class="col-span-2 text-text-primary font-medium">{{ product.unidade_medida || 'Unidade' }}</span>
              </div>
              <div class="grid grid-cols-3 p-3">
                <span class="font-bold text-text-muted uppercase">Fracionamento</span>
                <span class="col-span-2 text-text-primary font-medium">{{ product.permite_fracionamento ? 'Permitido (pesável)' : 'Padrão inteiro' }}</span>
              </div>
              <div class="grid grid-cols-3 p-3">
                <span class="font-bold text-text-muted uppercase">Categoria</span>
                <span class="col-span-2 text-text-primary font-medium">{{ category?.nome || 'Geral' }}</span>
              </div>
              <div class="grid grid-cols-3 p-3">
                <span class="font-bold text-text-muted uppercase">Tipo</span>
                <span class="col-span-2 text-text-primary font-medium">
                  {{ product.product_type === 'preorder' ? 'Sob Encomenda' : 'Venda Imediata' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 3. ENVIO & RETIRADA -->
          <div v-else-if="activeTab === 'shipping'" class="flex flex-col gap-4 animate-fade-in text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-4 rounded-md border border-border bg-surface flex flex-col gap-1.5">
                <div class="flex items-center gap-2 font-bold text-text-primary uppercase">
                  <Truck class="w-4 h-4 text-brand" />
                  <span>Entrega Delivery</span>
                </div>
                <p class="text-text-muted">
                  Taxa padrão: <strong class="text-text-primary">{{ deliveryFee ? formatCurrency(deliveryFee) : 'Conforme endereço' }}</strong>
                </p>
              </div>

              <div class="p-4 rounded-md border border-border bg-surface flex flex-col gap-1.5">
                <div class="flex items-center gap-2 font-bold text-text-primary uppercase">
                  <Store class="w-4 h-4 text-brand" />
                  <span>Retirada no Local</span>
                </div>
                <p class="text-text-muted">
                  {{ allowsPickup !== false ? 'Retirada gratuita disponível no balcão da loja.' : 'Apenas delivery no momento.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- 4. ATENDIMENTO -->
          <div v-else-if="activeTab === 'support'" class="flex flex-col gap-3 animate-fade-in text-xs">
            <p class="text-text-muted">
              Dúvidas sobre personalizações, prazos ou pedidos especiais? Fale direto com o lojista:
            </p>
            <div class="pt-1">
              <a
                v-if="whatsappUrl"
                :href="whatsappUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                <MessageCircle class="w-4 h-4" />
                <span>Tirar dúvidas no WhatsApp</span>
              </a>
              <span v-else class="text-text-muted">
                Atendimento disponível através dos nossos canais oficiais.
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Coluna Direita: Imagem de Destaque / Macro Texture (Zero Sombra) -->
      <div v-if="featureImage || product.foto_url" class="w-full lg:w-80 shrink-0">
        <div class="aspect-4/3 rounded-lg border border-border overflow-hidden bg-surface-raised relative group">
          <NuxtImg
            :src="featureImage || product.foto_url || ''"
            :alt="product.nome"
            loading="lazy"
            sizes="320px"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>
    </div>
  </div>
</template>
