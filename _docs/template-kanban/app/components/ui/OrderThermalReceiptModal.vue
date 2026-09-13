<script setup lang="ts">
import { watch } from 'vue'
import { Printer, Share2, X } from '@lucide/vue'
import type { ReceiptOrder } from '~~/shared/types/order'
import { formatOrderNumber } from '~~/shared/utils/orderNumber'

const props = defineProps<{
  isOpen: boolean
  pedido: ReceiptOrder | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

watch(() => props.isOpen, (newVal) => {
  if (newVal && import.meta.client) {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        emit('close')
        globalThis.removeEventListener('keydown', handleEsc)
      }
    }
    globalThis.addEventListener('keydown', handleEsc)
  }
})

const shareOnWhatsApp = () => {
  if (!props.pedido) return
  const p = props.pedido
  const shortId = formatOrderNumber(p.id, p.short_id)
  
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    }).format(date)
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  
  // Utilizando três crases para forçar o WhatsApp a usar fonte monoespaçada (estilo recibo antigo)
  let text = "```\n"
  text += `PEDIDO #${shortId}\n`
  text += `Data: ${formatDate(p.criado_em)}\n`
  text += `--------------------------------\n`
  text += `STATUS\n`
  text += `${p.status.toUpperCase()}\n`
  text += `--------------------------------\n`
  text += `CLIENTE\n`
  text += `${p.clientes?.nome || 'CLIENTE ANONIMO'}\n`
  if (p.clientes?.telefone_whatsapp) {
    text += `Tel: ${p.clientes.telefone_whatsapp}\n`
  }
  text += `--------------------------------\n`
  text += `ENTREGA\n`
  text += `Tipo: ${p.tipo_entrega.toUpperCase()}\n`
  if (p.tipo_entrega === 'entrega' && p.enderecos_cliente) {
    text += `${p.enderecos_cliente.rua}, ${p.enderecos_cliente.numero}\n`
    text += `${p.enderecos_cliente.bairro}\n`
  }
  text += `--------------------------------\n`
  text += `PAGAMENTO\n`
  text += `Forma: ${p.forma_pagamento.toUpperCase()}\n`
  text += `--------------------------------\n`
  text += `ITENS\n\n`
  
  if (p.itens_pedido && p.itens_pedido.length > 0) {
    // Itens com personalização (texto_livre/upload_arquivo) nunca são
    // agregados por nome — cada um tem um texto/arquivo próprio que precisa
    // aparecer individualmente (mesma regra de UiOrderReceipt).
    const map = new Map<string, {qtde: number, sub: number}>()
    const linhasCustomizadas: string[] = []

    for (const item of p.itens_pedido) {
      const nome = item.produtos?.nome || item.nome_produto_congelado || 'PRODUTO'
      const opcoesCustomizadas = (item.itens_pedido_opcoes ?? []).filter((o) => o.valor_texto || o.arquivo_url)

      if (opcoesCustomizadas.length > 0) {
        let linha = `${item.quantidade}X ${nome.toUpperCase()}\n`
        for (const opcao of opcoesCustomizadas) {
          linha += opcao.valor_texto
            ? `  ${opcao.nome_congelado}: "${opcao.valor_texto}"\n`
            : `  ${opcao.nome_congelado}: ${opcao.arquivo_url}\n`
        }
        if (item.subtotal) linha += `${formatMoney(item.subtotal)}\n`
        linhasCustomizadas.push(linha)
        continue
      }

      if (map.has(nome)) {
        const existing = map.get(nome)!
        existing.qtde += item.quantidade
        if (item.subtotal) existing.sub += item.subtotal
      } else {
        map.set(nome, { qtde: item.quantidade, sub: item.subtotal || 0 })
      }
    }
    for (const [nome, data] of map.entries()) {
      text += `${data.qtde}X ${nome.toUpperCase()}\n`
      if (data.sub > 0) {
        text += `${formatMoney(data.sub)}\n\n`
      } else {
        text += `\n`
      }
    }
    for (const linha of linhasCustomizadas) {
      text += `${linha}\n`
    }
  }
  
  text += `--------------------------------\n`
  text += `SUBTOTAL: ${formatMoney(p.valor_subtotal ?? 0)}\n`
  if (p.frete_gratis_aplicado) {
    text += `ENTREGA:  GRATIS (PROMO)\n`
  } else {
    text += `ENTREGA:  ${formatMoney(p.valor_entrega ?? 0)}\n`
  }
  text += `--------------------------------\n`
  text += `TOTAL:    ${formatMoney(p.valor_total)}\n`
  
  if (p.observacoes) {
    text += `--------------------------------\n`
    text += `OBSERVACOES\n`
    text += `${p.observacoes.toUpperCase()}\n`
  }
  
  text += "```" // Fecha o bloco monoespaçado
  
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  globalThis.open(url, '_blank')
}

const printReceipt = () => {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 print-wrapper">
      <!-- Backdrop overlay -->
      <div 
        class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity print-backdrop" 
        @click="emit('close')"
      />

      <!-- Modal Content -->
      <div 
        class="relative bg-surface rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden transform transition-all border border-border print-modal-content"
        role="dialog" 
        aria-modal="true"
      >
        <!-- Cabeçalho do Modal -->
        <div class="px-6 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0 print-header">
          <h3 class="text-sm font-semibold tracking-wide text-text-primary uppercase">
            Cupom do Pedido
          </h3>
          <div class="flex items-center gap-1">
            <button
              class="text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors rounded-full p-2 focus:outline-none"
              title="Imprimir"
              @click="printReceipt"
            >
              <Printer class="w-4 h-4" />
            </button>
            <button
              class="text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors rounded-full p-2 focus:outline-none"
              title="Compartilhar no WhatsApp"
              @click="shareOnWhatsApp"
            >
              <Share2 class="w-4 h-4" />
            </button>
            <div class="w-px h-4 bg-border mx-1"/>
            <button
              class="text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors rounded-full p-2 focus:outline-none"
              title="Fechar (ESC)"
              @click="emit('close')"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Corpo com Rolagem -->
        <div class="overflow-y-auto flex-1 p-6 bg-surface flex justify-center print-body">
          <div v-if="!pedido" class="py-10 text-center text-text-muted font-medium w-full">
            Carregando dados do pedido...
          </div>
          
          <div v-else-if="!pedido.itens_pedido || pedido.itens_pedido.length === 0" class="py-10 text-center w-full">
            <div class="text-red-600 font-bold mb-2">⚠ Erro ao Carregar Pedido</div>
            <div class="text-text-muted text-sm">Itens do pedido não encontrados no banco de dados.</div>
          </div>
          
          <div v-else id="printable-receipt" class="w-full">
            <UiOrderReceipt :pedido="pedido" class="w-full" />

            <!-- Histórico de status (timeline) — Fase 5.2.
                 Não vai para a impressão (oculto via `print:hidden`),
                 apenas instrumenta o operador na tela. -->
            <div class="mt-6 print:hidden">
              <h4 class="text-xs font-semibold tracking-wide uppercase text-text-muted mb-2">
                Histórico de Status
              </h4>
              <AdminOrderStatusTimeline :pedido-id="pedido.id" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
@media print {
  /* Esconde TUDO que está na raiz do body (o app inteiro), exceto o modal teleportado */
  body > *:not(.print-wrapper) {
    display: none !important;
  }
  
  /* Removemos o fundo preto do modal */
  .print-backdrop {
    display: none !important;
  }
  
  /* Tiramos os limites de altura, sombras e centralização do modal */
  .print-wrapper {
    position: absolute !important;
    inset: auto !important;
    left: 0 !important;
    top: 0 !important;
    padding: 0 !important;
    display: block !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
  }

  .print-modal-content {
    box-shadow: none !important;
    border: none !important;
    max-width: 100% !important;
    width: 100% !important;
    max-height: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    transform: none !important;
  }
  
  /* Esconde os botões e cabeçalho na folha impressa */
  .print-header {
    display: none !important;
  }
  
  /* O corpo do modal vira o papel, sem rolagem (para imprimir até o fim) */
  .print-body {
    padding: 0 !important;
    overflow: visible !important;
  }

  /* Ajuste preciso do receipt e da fonte para ocupar toda largura do papel (80mm) */
  #printable-receipt article {
    width: 100% !important;
    max-width: 100% !important;
    background-color: transparent !important;
  }

  @page {
    margin: 0;
  }
}
</style>
