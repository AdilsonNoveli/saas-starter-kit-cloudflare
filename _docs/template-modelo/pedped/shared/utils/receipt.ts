/**
 * Nota térmica em TEXTO monoespaçado — versão WhatsApp do modelo visual
 * `app/components/ui/OrderReceipt.vue`. Mesma agregação de itens (agrupa por
 * nome somando quantidade/subtotal). Gerada exclusivamente pela aplicação:
 * o agente externo apenas repassa o texto pronto.
 */

import { formatOrderNumber } from './orderNumber'

const WIDTH = 32
const DIVIDER = '-'.repeat(WIDTH)

export interface ReceiptItem {
  readonly nome: string
  readonly quantidade: number
  readonly subtotal: number
}

export interface ReceiptData {
  readonly id: string
  readonly short_id?: number | null
  readonly criado_em: string
  readonly tipo_entrega: string
  readonly forma_pagamento: string
  readonly valor_subtotal: number
  readonly desconto_aplicado: number
  readonly valor_entrega: number
  readonly valor_total: number
  readonly itens: readonly ReceiptItem[]
  readonly cliente_nome?: string | null
  readonly endereco?: string | null
  readonly loja_nome?: string | null
  readonly chave_pix?: string | null
}

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function line(label: string, value: string): string {
  const space = WIDTH - label.length - value.length
  return `${label}${' '.repeat(Math.max(space, 1))}${value}`
}

function center(text: string): string {
  const pad = Math.max(Math.floor((WIDTH - text.length) / 2), 0)
  return `${' '.repeat(pad)}${text}`
}

/** Agrupa itens por nome somando quantidade e subtotal (igual ao OrderReceipt.vue). */
export function aggregateReceiptItems(itens: readonly ReceiptItem[]): ReceiptItem[] {
  const map = new Map<string, { nome: string; quantidade: number; subtotal: number }>()
  for (const item of itens) {
    const existing = map.get(item.nome)
    if (existing) {
      existing.quantidade += item.quantidade
      existing.subtotal += item.subtotal
    } else {
      map.set(item.nome, { ...item })
    }
  }
  return [...map.values()]
}

export function formatReceiptText(data: ReceiptData): string {
  const shortId = formatOrderNumber(data.id, data.short_id)
  const when = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(data.criado_em))

  const out: string[] = []

  if (data.loja_nome) out.push(center(data.loja_nome.toUpperCase()))
  out.push(center(`PEDIDO #${shortId}`))
  out.push(center(when))
  out.push(DIVIDER)

  for (const item of aggregateReceiptItems(data.itens)) {
    out.push(`${item.quantidade}x ${item.nome}`)
    out.push(line('', money(item.subtotal)))
  }

  out.push(DIVIDER)
  out.push(line('Subtotal', money(data.valor_subtotal)))
  if (data.desconto_aplicado > 0) {
    out.push(line('Desconto', `-${money(data.desconto_aplicado)}`))
  }
  if (data.tipo_entrega === 'entrega') {
    out.push(line('Entrega', data.valor_entrega > 0 ? money(data.valor_entrega) : 'GRÁTIS'))
  }
  out.push(line('TOTAL', money(data.valor_total)))
  out.push(DIVIDER)

  out.push(`Pagamento: ${data.forma_pagamento.toUpperCase()}`)
  if (data.forma_pagamento === 'pix' && data.chave_pix) {
    out.push(`Chave PIX: ${data.chave_pix}`)
  }
  out.push(data.tipo_entrega === 'retirada' ? 'Retirada no local' : `Entrega: ${data.endereco ?? '—'}`)
  if (data.cliente_nome) out.push(`Cliente: ${data.cliente_nome}`)

  return out.join('\n')
}
