<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Undo2 } from '@lucide/vue'

import OrderReceipt from '~/components/ui/OrderReceipt.vue'
import { useStore } from '~/composables/useStore'
import { useCartStore } from '~/stores/cart'
import { useTheme } from '~/composables/useTheme'
import { formatOrderNumber } from '~~/shared/utils/orderNumber'

definePageMeta({ layout: false })

useHead({
  title: 'Resumo do Pedido'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { loja, fetch: fetchLoja } = useStore()
const { resolvedTheme } = useTheme()

const currentLogo = computed(() => {
  if (resolvedTheme.value === 'dark') {
    return loja.value?.logomarca_dark || loja.value?.logomarca || null
  }
  return loja.value?.logomarca || loja.value?.logomarca_dark || null
})

const pedidoId = route.query.pedidoId as string
const sessaoId = route.query.sessao as string

if (!pedidoId && import.meta.client) {
  const redirectUrl = sessaoId ? `/catalog?sessao=${sessaoId}` : '/catalog/checkout'
  router.replace(redirectUrl)
}

// Busca os dados completos do pedido
const { data: pedido, pending } = await useAsyncData(`pedido-${pedidoId}`, async () => {
  if (!pedidoId) return null
  
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      desconto_aplicado,
      enderecos_cliente (*),
      clientes (nome, telefone_whatsapp),
      itens_pedido (
        id,
        quantidade,
        preco_unitario_congelado,
        nome_produto_congelado,
        produto_id,
        produtos (nome, preco_venda, foto_url, permite_fracionamento, unidade_medida),
        itens_pedido_opcoes (
          opcao_item_id,
          nome_congelado,
          preco_delta_congelado
        )
      )
    `)
    .eq('id', pedidoId)
    .single()
    
  if (error) {
    console.error('Erro ao buscar pedido:', error)
    return null
  }

  // Se o pedido existe e foi processado, limpa o carrinho
  if (import.meta.client && data) {
    const cartStore = useCartStore()
    if (cartStore.editingPedidoId === data.id) {
      cartStore.editingPedidoId = null
    }
    cartStore.clearCart()
  }

  return data
})


// Pega o ID curto do banco ou cai para a primeira parte do UUID como fallback
const shortOrderId = computed(() =>
  pedidoId ? formatOrderNumber(pedidoId, pedido.value?.short_id) : '000000',
)

await fetchLoja()

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

const whatsappUrl = computed(() => {
  const numero = loja.value?.whatsapp_atendimento?.replace(/\D/g, '') || ''
  if (!pedido.value) return `https://wa.me/${numero}`
  
  const lines = [
    `*Novo Pedido #${shortOrderId.value}*`,
    `--------------------------------`,
  ]
  
  // Itens do pedido
  for (const item of pedido.value.itens_pedido || []) {
    const nome = item.produtos?.nome || item.nome_produto_congelado || 'Item'
    lines.push(`${item.quantidade}x ${nome}`)
    if (item.itens_pedido_opcoes && item.itens_pedido_opcoes.length > 0) {
      for (const op of item.itens_pedido_opcoes) {
        lines.push(`  + ${op.nome_congelado}`)
      }
    }
  }
  
  lines.push(`--------------------------------`)
  
  // Entrega
  const entrega = pedido.value.tipo_entrega === 'entrega' ? 'Entrega em casa' : 'Retirada na loja'
  lines.push(`*Método:* ${entrega}`)
  
  if (pedido.value.tipo_entrega === 'entrega' && pedido.value.enderecos_cliente) {
    const end = pedido.value.enderecos_cliente
    lines.push(`*Endereço:* ${end.rua}, ${end.numero} - ${end.bairro}`)
  }
  
  // Pagamento
  const pagMap = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' }
  const pag = pagMap[pedido.value.forma_pagamento as 'pix' | 'dinheiro' | 'cartao'] || pedido.value.forma_pagamento
  lines.push(`*Pagamento:* ${pag}`)
  
  // Valor Total
  const total = Number(pedido.value.valor_total) || 0
  lines.push(`*Total:* ${formatCurrency(total)}`)
  
  const mensagem = encodeURIComponent(lines.join('\n'))
  return `https://wa.me/${numero}?text=${mensagem}`
})

const isEditingLoading = ref(false)

const iniciarEdicao = async () => {
  if (!pedido.value || isEditingLoading.value) return
  isEditingLoading.value = true
  
  try {
    const cartStore = useCartStore()
    cartStore.clearCart()
    
    // Configura o ID do pedido que está sendo editado
    cartStore.editingPedidoId = pedidoId
    
    // Popula o carrinho com os itens do pedido
    for (const item of pedido.value.itens_pedido) {
      const prod = item.produtos
      if (!prod) continue
      
      const opcoes = (item.itens_pedido_opcoes ?? []).map(o => ({
        opcao_item_id: o.opcao_item_id ?? '',
        nome_congelado: o.nome_congelado,
        preco_delta_congelado: Number(o.preco_delta_congelado)
      }))
      
      const totalDeltas = opcoes.reduce((sum, o) => sum + o.preco_delta_congelado, 0)
      const basePreco = Number(item.preco_unitario_congelado) - totalDeltas
      
      cartStore.updateQuantity({
        id: item.produto_id ?? '',
        nome: prod.nome,
        preco: basePreco,
        foto_url: prod.foto_url,
        permite_fracionamento: prod.permite_fracionamento ?? undefined,
        unidade_medida: prod.unidade_medida
      }, item.quantidade, opcoes)
    }
    
    // Redireciona para o catálogo para alterar o pedido
    const redirectUrl = sessaoId ? `/catalog?sessao=${sessaoId}` : '/catalog'
    router.push(redirectUrl)
  } catch (err) {
    console.error('Erro ao iniciar edição do pedido:', err)
  } finally {
    isEditingLoading.value = false
  }
}
</script>

<template>
  <div class="bg-surface flex flex-col h-screen overflow-hidden font-sans">
    
    <!-- BEGIN: MainHeader -->
    <header class="bg-surface flex items-center justify-center px-4 py-4 border-b border-border shrink-0 shadow-xs">
      <img
        v-if="currentLogo"
        :src="currentLogo"
        :alt="loja?.nome_fantasia ?? 'Logo'"
        class="h-[36px] md:h-[56px] object-contain max-w-full shrink"
        loading="eager"
      >
      <span v-else class="text-sm font-semibold tracking-wide text-text-primary uppercase truncate">
        {{ loja?.nome_fantasia ?? 'Resumo' }}
      </span>
    </header>
    <!-- END: MainHeader -->

    <!-- BEGIN: MainContent -->
    <main class="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface flex flex-col items-center">

      <div v-if="pending" class="flex flex-col items-center justify-center h-full text-text-muted">
        Gerando seu recibo...
      </div>

      <div v-else-if="!pedido" class="flex flex-col items-center justify-center h-full text-text-muted">
        Pedido não encontrado ou já expirado.
      </div>

      <div v-else class="flex flex-col items-center w-full pb-28 lg:pb-12">
        <!-- Receipt Container -->
        <OrderReceipt :pedido="pedido" :chave-pix="loja?.chave_pix ?? null" @edit="iniciarEdicao" />

        <!-- Desktop Action Buttons (Below Receipt) -->
        <div class="hidden lg:flex items-center gap-4 w-full max-w-md mt-6">
          <!-- CATÁLOGO -->
          <NuxtLink
            :to="sessaoId ? `/catalog?sessao=${sessaoId}` : '/catalog'"
            class="flex-1 bg-brand-green hover:bg-brand-greenDark text-white font-bold py-3.5 px-6 rounded-lg text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 select-none border border-brand-greenDark shadow-sm text-center"
          >
            <Undo2 class="w-4 h-4 shrink-0" />
            <span>CATÁLOGO</span>
          </NuxtLink>
          
          <!-- CONFIRMAR NO WHATSAPP -->
          <a
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex-1 bg-brand-green hover:bg-brand-greenDark text-white font-bold py-3.5 px-6 rounded-lg text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-brand-greenDark shadow-sm"
          >
            <svg class="w-4.5 h-4.5 fill-white shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>CONFIRMAR</span>
          </a>
        </div>
      </div>

    </main>
    <!-- END: MainContent -->

    <!-- BEGIN: BottomAction (Mobile Footer) -->
    <div v-if="pedido" class="fixed bottom-0 left-0 right-0 p-0 shrink-0 z-10 lg:hidden flex divide-x divide-white border-t border-border">
      <!-- CATÁLOGO -->
      <NuxtLink
        :to="sessaoId ? `/catalog?sessao=${sessaoId}` : '/catalog'"
        class="w-1/2 bg-brand-green hover:bg-brand-greenDark text-white font-bold py-5 text-sm tracking-wider text-center uppercase transition-all flex items-center justify-center gap-2 select-none"
      >
        <Undo2 class="w-4 h-4 shrink-0" />
        <span>CATÁLOGO</span>
      </NuxtLink>
      
      <!-- CONFIRMAR -->
      <a
        :href="whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="w-1/2 bg-brand-green hover:bg-brand-greenDark text-white font-bold py-5 text-sm tracking-wider text-center uppercase transition-all flex items-center justify-center gap-2"
      >
        <svg class="w-4.5 h-4.5 fill-white shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
        <span>CONFIRMAR</span>
      </a>
    </div>
    <!-- END: BottomAction -->

  </div>
</template>
